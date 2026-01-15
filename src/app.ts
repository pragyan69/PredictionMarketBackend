import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import {routes} from './routes';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', routes);

  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Mimiq Prediction Markets API',
      version: '1.0.0',
    });
  });

  return app;
}
