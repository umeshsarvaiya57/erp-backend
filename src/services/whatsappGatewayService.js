const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

class WhatsAppGatewayService {
  constructor() {
    this.sock = null;
    this.qrCodeDataUrl = null;
    this.rawQr = null;
    this.connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'connected'
    this.connectedNumber = null;
    this.connectedName = null;
    this.authDir = path.join(__dirname, '../../.auth_whatsapp');
    this.isInitializing = false;
    this.autoSendEnabled = true;

    // Ensure session auth dir exists
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }

  /**
   * Initializes or restores the WhatsApp Baileys Socket session.
   */
  async initialize() {
    if (this.isInitializing) {
      return this.getStatus();
    }

    try {
      this.isInitializing = true;
      this.connectionStatus = 'connecting';
      console.log('[WhatsApp Gateway] Initializing session...');

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      const { version } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['MyERP Business Billing', 'Desktop Chrome', '1.0.0'],
        syncFullHistory: false,
        generateHighQualityLinkPreview: true,
      });

      // Save credentials updates
      this.sock.ev.on('creds.update', saveCreds);

      // Handle connection updates
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.rawQr = qr;
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr, {
              margin: 2,
              width: 300,
              color: {
                dark: '#0f172a',
                light: '#ffffff',
              },
            });
            console.log('[WhatsApp Gateway] New QR Code generated.');
          } catch (qrErr) {
            console.error('[WhatsApp Gateway] Failed to render QR code:', qrErr);
          }
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          console.log(`[WhatsApp Gateway] Connection closed (code: ${statusCode}). Reconnecting: ${shouldReconnect}`);

          this.connectionStatus = 'disconnected';
          this.qrCodeDataUrl = null;
          this.connectedNumber = null;
          this.connectedName = null;
          this.isInitializing = false;

          if (shouldReconnect) {
            setTimeout(() => this.initialize(), 4000);
          } else {
            // Logged out: clear saved creds
            this.clearSession();
          }
        } else if (connection === 'open') {
          console.log('[WhatsApp Gateway] WhatsApp connected successfully!');
          this.connectionStatus = 'connected';
          this.qrCodeDataUrl = null;
          this.rawQr = null;
          this.isInitializing = false;

          const userJid = this.sock.user?.id || '';
          this.connectedNumber = userJid.split(':')[0] || userJid.split('@')[0];
          this.connectedName = this.sock.user?.name || 'Shop WhatsApp';
        }
      });

      return this.getStatus();
    } catch (err) {
      console.error('[WhatsApp Gateway] Initialization error:', err);
      this.connectionStatus = 'disconnected';
      this.isInitializing = false;
      throw err;
    }
  }

  /**
   * Returns current gateway status and QR code if pending scan.
   */
  getStatus() {
    return {
      status: this.connectionStatus,
      isConnected: this.connectionStatus === 'connected',
      isConnecting: this.connectionStatus === 'connecting',
      qrCode: this.qrCodeDataUrl,
      connectedNumber: this.connectedNumber,
      connectedName: this.connectedName,
      autoSendEnabled: this.autoSendEnabled,
    };
  }

  /**
   * Toggles auto-send on sale creation.
   */
  setAutoSendEnabled(enabled) {
    this.autoSendEnabled = Boolean(enabled);
    return this.getStatus();
  }

  /**
   * Logs out and deletes saved authentication tokens.
   */
  async logout() {
    try {
      if (this.sock) {
        await this.sock.logout();
      }
    } catch (err) {
      console.warn('[WhatsApp Gateway] Logout warning:', err.message);
    }
    this.clearSession();
    this.connectionStatus = 'disconnected';
    this.qrCodeDataUrl = null;
    this.connectedNumber = null;
    this.connectedName = null;
    this.sock = null;
    this.isInitializing = false;
    return this.getStatus();
  }

  clearSession() {
    try {
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
        fs.mkdirSync(this.authDir, { recursive: true });
      }
    } catch (err) {
      console.error('[WhatsApp Gateway] Error clearing session directory:', err);
    }
  }

  /**
   * Normalizes a phone number to WhatsApp JID format (e.g., 919876543210@s.whatsapp.net).
   */
  formatJid(phone, defaultCountryCode = '91') {
    if (!phone) return null;
    let digits = phone.toString().replace(/\D/g, '');
    if (!digits) return null;

    if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.substring(1);
    }
    if (digits.length === 10) {
      digits = `${defaultCountryCode}${digits}`;
    }

    return `${digits}@s.whatsapp.net`;
  }

  /**
   * Sends a plain text WhatsApp message.
   */
  async sendTextMessage(toPhone, message) {
    if (this.connectionStatus !== 'connected' || !this.sock) {
      throw new Error('WhatsApp Gateway is not connected. Please scan QR in ERP Settings.');
    }

    const jid = this.formatJid(toPhone);
    if (!jid) {
      throw new Error(`Invalid recipient phone number: "${toPhone}"`);
    }

    const result = await this.sock.sendMessage(jid, { text: message });
    return result;
  }

  /**
   * Formats and automatically delivers an invoice bill notification to the customer.
   */
  async sendInvoiceNotification(sale, business, customer, clientUrl = process.env.clientUrl) {
    if (!this.autoSendEnabled) {
      console.log('[WhatsApp Gateway] Automatic sending is disabled in settings. Skipping.');
      return null;
    }

    if (this.connectionStatus !== 'connected') {
      console.log('[WhatsApp Gateway] Gateway not connected. Skipping automatic delivery.');
      return null;
    }

    const recipientMobile = customer?.mobile || sale?.customerId?.mobile;
    if (!recipientMobile) {
      console.log('[WhatsApp Gateway] Customer has no mobile number recorded. Skipping.');
      return null;
    }

    const businessName = business?.name || sale?.businessId?.name || 'Our Shop';
    const businessAddress = business?.address || sale?.businessId?.address || '';
    const businessMobile = business?.mobile || sale?.businessId?.mobile || '';
    const businessGst = business?.gstNumber || sale?.businessId?.gstNumber || '';

    const customerName = customer?.name || sale?.customerId?.name || 'Valued Customer';
    const invoiceNumber = sale.invoiceNumber || 'INV-000000';
    const invoiceDate = sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
    const paymentMethod = sale.paymentMethod || 'CASH';

    const itemsText = (sale.items || [])
      .map((item, idx) => {
        const name = item.productName || item.productId?.name || `Item ${idx + 1}`;
        const qty = item.quantity || 1;
        const total = Number(item.total || 0).toFixed(2);
        return `  • *${name}* (x${qty}) - ₹${total}`;
      })
      .join('\n');

    const grandTotal = Number(sale.grandTotal || 0).toFixed(2);
    const paidAmount = Number(sale.paidAmount || 0).toFixed(2);
    const dueAmount = Number(sale.dueAmount || 0).toFixed(2);

    let balanceText = '';
    if (Number(dueAmount) > 0) {
      balanceText = `\n⚠️ *Balance Due:* ₹${dueAmount}`;
    } else {
      balanceText = `\n🎉 *Payment Status:* FULLY PAID`;
    }

    // Normalized public invoice link
    const cleanClientUrl = (clientUrl).replace(/\/$/, '');
    const publicInvoiceUrl = `${cleanClientUrl}/public/invoices/${sale._id}`;

    const message = 
`🧾 *INVOICE BILL - ${businessName.toUpperCase()}*

Hello *${customerName}*,

*Thank you for purchasing with ${businessName}!* 🙏 We truly appreciate your business and hope to serve you again soon.

━━━━━━━━━━━━━━━━━━━
📄 *Invoice No:* ${invoiceNumber}
📅 *Date:* ${invoiceDate}
💳 *Payment Mode:* ${paymentMethod}
━━━━━━━━━━━━━━━━━━━

🛒 *Items Ordered:*
${itemsText || '  • General items'}

━━━━━━━━━━━━━━━━━━━
💵 *Subtotal:* ₹${Number(sale.subtotal || 0).toFixed(2)}
🏷️ *Discount:* - ₹${Number(sale.discountTotal || 0).toFixed(2)}
📊 *Tax (GST):* ₹${Number((sale.cgst || 0) + (sale.sgst || 0) + (sale.igst || 0)).toFixed(2)}
💰 *Grand Total:* ₹${grandTotal}
✅ *Amount Paid:* ₹${paidAmount}${balanceText}
━━━━━━━━━━━━━━━━━━━
📄 *View & Download PDF Bill Online:*
${publicInvoiceUrl}

🏬 *${businessName}*${businessGst ? `\n🏷️ GSTIN: ${businessGst}` : ''}${businessAddress ? `\n📍 ${businessAddress}` : ''}${businessMobile ? `\n📞 ${businessMobile}` : ''}

Have a wonderful day! 😊`;

    console.log(`[WhatsApp Gateway] Auto-sending invoice ${invoiceNumber} to ${recipientMobile}...`);
    return await this.sendTextMessage(recipientMobile, message);
  }
}

// Singleton instance
const whatsappGatewayService = new WhatsAppGatewayService();

module.exports = whatsappGatewayService;
