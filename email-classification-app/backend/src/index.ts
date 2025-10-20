import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { logger } from './utils/logger';
import { startEmailPolling } from './jobs/emailPollingJob';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes (TODO: Import actual routes)
// import authRoutes from './routes/authRoutes';
// import emailRoutes from './routes/emailRoutes';
// import draftRoutes from './routes/draftRoutes';
// import statsRoutes from './routes/statsRoutes';

// app.use('/api/auth', authRoutes);
// app.use('/api/emails', emailRoutes);
// app.use('/api/drafts', draftRoutes);
// app.use('/api/stats', statsRoutes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`, {
    nodeEnv: process.env.NODE_ENV,
    port: PORT
  });

  // Start background jobs
  startEmailPolling();
  logger.info('Background jobs initialized');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
