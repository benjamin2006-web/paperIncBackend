import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Routes
import paperRoutes from './routes/paperRoutes.js';
import authRoutes from './routes/authRoutes.js';
import tradeRoutes from './routes/tradeRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import adminUserRoutes from './routes/adminUserRoutes.js';
import userRoutes from './routes/userRoutes.js';

// Middleware
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5000;

/* =======================
   MIDDLEWARE
======================= */

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(compression());

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =======================
   RATE LIMIT (optional)
======================= */

// Uncomment if needed in production
/*
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  skip: (req) => req.path === '/health',
});
app.use('/api/', limiter);
*/

/* =======================
   ROUTES
======================= */

app.use('/api/categories', categoryRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/admin', adminUserRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/users', userRoutes);

/* =======================
   HEALTH CHECK
======================= */

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    mongodb:
      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    cloudinary: process.env.CLOUDINARY_CLOUD_NAME
      ? 'configured'
      : 'not configured',
  });
});

/* =======================
   ERROR HANDLER
======================= */

app.use(errorHandler);

/* =======================
   DATABASE CONNECTION
======================= */

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Health check: /health`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  });
