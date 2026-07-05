import { Request, Response, NextFunction } from 'express';
import Database from 'better-sqlite3';
import { validateSession } from '../database/queries/users';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        role: string;
        nameAr: string;
        nameEn: string;
      };
    }
  }
}

/**
 * Middleware that validates the Bearer token and attaches user info to req.user
 */
export function authMiddleware(db: Database.Database) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.substring(7);
    const session = validateSession(db, token);

    if (!session) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    req.user = {
      userId: session.userId,
      username: session.username,
      role: session.role,
      nameAr: session.nameAr,
      nameEn: session.nameEn
    };

    next();
  };
}

/**
 * Middleware that restricts access to specific roles
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
