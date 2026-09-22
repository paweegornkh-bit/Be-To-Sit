import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { apiLimiter } from './middlewares/rateLimit.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

const app = express();
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'https://res.cloudinary.com', 'data:'],
      connectSrc: ["'self'", ...env.corsOrigin],
      objectSrc:  ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: (origin, cb) =>
    (!origin || env.corsOrigin.includes(origin))
      ? cb(null, true) : cb(new Error('ไม่อนุญาตจาก Origin นี้')),
  credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan(env.isProd ? 'combined' : 'dev'));
app.use('/api', apiLimiter);

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', env: env.nodeEnv, time: new Date().toISOString() }));

app.use('/api/v1', routes);
app.use(notFound);
app.use(errorHandler);

export default app;
