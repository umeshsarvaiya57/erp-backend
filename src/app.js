const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const errorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/AppError');
const env = require('./config/env');

const app = express();

// Setup CORS allowed origins
const allowedOrigins = (env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman, server-to-server)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, '');

      // Allow if origin is in configured allowedOrigins or wildcard is set
      if (allowedOrigins.includes(normalizedOrigin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      // Automatically allow Vercel previews & production deployments
      if (/^https:\/\/.*\.vercel\.app$/.test(normalizedOrigin)) {
        return callback(null, true);
      }

      // Automatically allow localhost for local development
      if (
        /^http:\/\/localhost(:\d+)?$/.test(normalizedOrigin) ||
        /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    errorCode: 'TOO_MANY_REQUESTS'
  }
});
app.use('/api', limiter);

// Request Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/business', require('./routes/businessRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/sales', require('./routes/salesRoutes'));
app.use('/api/purchases', require('./routes/purchaseRoutes'));
app.use('/api/crm', require('./routes/crmRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// 404 Route
app.use('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND'));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
