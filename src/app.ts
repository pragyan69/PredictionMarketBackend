import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { routes } from "./routes";

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ✅ Debug: log every request
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const ts = new Date().toISOString();
    console.log(`[${ts}] ${req.method} ${req.originalUrl}`);
    next();
  });

  app.use("/api", routes);

  app.get("/", (_req, res) => {
    res.json({
      success: true,
      message: "Mimiq Prediction Markets API",
      version: "1.0.0",
    });
  });

  // ✅ Debug: global error handler (prints full stack + axios details if any)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("❌ Global Error Handler:", err?.message || err);
    if (err?.stack) console.error(err.stack);

    // Axios error details
    if (err?.isAxiosError) {
      console.error("Axios Error:", {
        code: err.code,
        url: err.config?.baseURL ? `${err.config.baseURL}${err.config.url}` : err.config?.url,
        method: err.config?.method,
        status: err.response?.status,
        responseData: err.response?.data,
      });
    }

    res.status(500).json({
      success: false,
      error: err?.message || "Internal Server Error",
    });
  });

  return app;
}
