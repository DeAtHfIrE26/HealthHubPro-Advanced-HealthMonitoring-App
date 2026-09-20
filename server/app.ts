import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { attachUser } from './auth';
import { env } from './env';
import { createRouter, HttpError } from './routes';

/**
 * Rejects cross-site mutations.
 *
 * Session cookies are SameSite=Lax, so a cross-site POST cannot carry them in
 * a modern browser. This adds a second, explicit check: state-changing
 * requests must declare JSON, which a cross-origin form cannot do without
 * triggering a preflight the server never approves.
 */
function requireJsonForMutations(req: Request, res: Response, next: NextFunction): void {
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const contentType = req.headers['content-type'];

  // If a Content-Type is declared it must be JSON. A cross-origin <form> post
  // can only declare form-urlencoded, multipart or text/plain, so this blocks
  // the one CSRF shape that does not need script. Requests that declare
  // nothing carry no body; those are covered by the SameSite=Lax session
  // cookie, which a browser will not attach to a cross-site POST at all.
  // Note: req.is() reports null for a bodyless request regardless of its
  // headers, so the header is inspected directly.
  if (isMutation && contentType && !contentType.toLowerCase().startsWith('application/json')) {
    res.status(415).json({ error: 'Content-Type must be application/json.' });
    return;
  }
  next();
}

export function createApp(): express.Express {
  const app = express();

  // Vercel terminates TLS upstream; trust it so secure cookies and client IPs work.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // The SPA is served by Vercel's CDN, not this app; CSP lives in vercel.json.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  if (env.corsOrigins.length > 0) {
    app.use(cors({ origin: env.corsOrigins, credentials: true }));
  }

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser(env.sessionSecret));
  app.use(requireJsonForMutations);

  // Best-effort only: serverless instances do not share this counter, so it
  // slows a burst against one warm instance rather than enforcing a global cap.
  if (!env.isTest) {
    app.use(
      rateLimit({
        windowMs: 60_000,
        limit: 120,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: 'Too many requests. Try again shortly.' },
      }),
    );
  }

  app.use(attachUser);
  app.use('/api', createRouter());

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'No such endpoint.' });
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message, details: error.details });
      return;
    }

    console.error('[unhandled]', error);
    res.status(500).json({
      error: 'Something went wrong on our end.',
      ...(env.isProduction
        ? {}
        : { detail: error instanceof Error ? error.message : String(error) }),
    });
  });

  return app;
}
