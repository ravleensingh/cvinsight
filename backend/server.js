require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { purgeExpiredAccounts } = require('./services/accountLifecycleService');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const resumeRoutes = require('./routes/resume');

const app = express();
const PORT = process.env.PORT || 5001;
const ACCOUNT_PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;

function parseAllowedOrigins() {
  const configuredOrigins = [
    process.env.CLIENT_URL,
    process.env.ADMIN_FRONTEND_URL,
    ...(process.env.ADDITIONAL_ALLOWED_ORIGINS || '')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean)
  ];

  const defaults = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174'
  ];

  const originSet = new Set([...defaults, ...configuredOrigins].filter(Boolean));
  const parsedOrigins = [...originSet];

  if (process.env.ALLOW_VERCEL_PREVIEWS === 'true') {
    parsedOrigins.push(/\.vercel\.app$/);
  }

  return parsedOrigins;
}

const allowedOrigins = parseAllowedOrigins();

function serializeOrigins(origins) {
  return origins.map(origin => origin.toString()).join(', ');
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('[CORS] Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Request-Id', 'X-Access-Token', 'X-Refresh-Token'],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again shortly.',
    data: null
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 25),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
    data: null
  }
});

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use('/api', apiLimiter);

connectDB();

app.get('/', (req, res) => {
  return res.json({
    success: true,
    message: 'CVInsight API is running',
    data: {
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/resume', resumeRoutes);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT}`);
  console.log(`[CORS] Enabled for: ${serializeOrigins(allowedOrigins)}`);
});

async function runMaintenance() {
  try {
    const result = await purgeExpiredAccounts();
    if (result.deletedUsers > 0) {
      console.log(`[MAINTENANCE] Purged ${result.deletedUsers} expired account(s).`);
    }
  } catch (error) {
    console.error('[MAINTENANCE] Failed to purge expired accounts:', error.message);
  }
}

runMaintenance();
const purgeInterval = setInterval(runMaintenance, ACCOUNT_PURGE_INTERVAL_MS);

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal) {
  console.log(`\n[SHUTDOWN] Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('[SHUTDOWN] HTTP server closed.');
    clearInterval(purgeInterval);

    try {
      await mongoose.connection.close();
      console.log('[SHUTDOWN] MongoDB connection closed.');
      process.exit(0);
    } catch (err) {
      console.error('[ERROR] Error closing MongoDB connection:', err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('[ERROR] Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}
