import { Router } from 'express';
import Database from 'better-sqlite3';
import { authenticateUser, deleteSession, validateSession, getAllUsers, createUser, updateUser, deleteUser } from '../database/queries/users';
import { createLog } from '../database/queries/audit';

export function authRouter(db: Database.Database): Router {
  const router = Router();

  // Temporary debug endpoint to list users
  router.get('/debug-users', (_req, res) => {
    try {
      const users = db.prepare('SELECT id, username, role, passwordHash FROM users').all();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Temporary debug login simulation
  router.post('/debug-login', (req, res) => {
    try {
      const { username, password } = req.body;
      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
      if (!user) {
        res.json({ step: 'find_user', status: 'fail', message: 'User not found' });
        return;
      }
      const { verifyPassword } = require('../database/queries/utils');
      const passMatches = verifyPassword(password, user.passwordHash);
      res.json({
        step: 'verify_password',
        status: passMatches ? 'success' : 'fail',
        usernameInput: username,
        dbUsername: user.username,
        passwordInput: password,
        storedHash: user.passwordHash,
        matches: passMatches
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/auth/login
  router.post('/login', (req, res) => {
    try {
      const { username, password, company, branch } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }

      const result = authenticateUser(db, username, password);

      createLog(db, {
        user: username,
        actionAr: `تسجيل دخول مستخدم: ${username}`,
        actionEn: `User logged in: ${username}`,
        details: `تم تسجيل دخول ناجح للفرع: ${branch || 'main'}، الشركة: ${company || 'loding-foods'}.`
      });

      res.json({
        token: result.token,
        expiresAt: result.expiresAt,
        user: {
          ...result.user,
          company: company || 'loding-foods',
          branch: branch || 'main'
        }
      });
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Authentication failed' });
    }
  });

  // POST /api/auth/logout
  router.post('/logout', (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const session = validateSession(db, token);
        if (session) {
          createLog(db, {
            user: session.username,
            actionAr: `تسجيل خروج مستخدم: ${session.username}`,
            actionEn: `User logged out: ${session.username}`,
            details: 'تم إنهاء جلسة العمل الآمنة.'
          });
        }
        deleteSession(db, token);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/auth/me — validate current session
  router.get('/me', (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      const session = validateSession(db, token);
      if (!session) {
        res.status(401).json({ error: 'Invalid or expired session' });
        return;
      }

      res.json({
        userId: session.userId,
        username: session.username,
        role: session.role,
        permissions: session.permissions,
        nameAr: session.nameAr,
        nameEn: session.nameEn
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/auth/users — list all users (admin only)
  router.get('/users', (req, res) => {
    try {
      const users = getAllUsers(db);
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/auth/users — create a new user (admin only)
  router.post('/users', (req, res) => {
    try {
      const { username, password, role, nameAr, nameEn, permissions } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }
      const user = createUser(db, {
        username,
        password,
        role: role || 'viewer',
        nameAr: nameAr || '',
        nameEn: nameEn || '',
        permissions: permissions ? JSON.stringify(permissions) : null
      });
      res.json(user);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // PUT /api/auth/users/:id — update user
  router.put('/users/:id', (req, res) => {
    try {
      const { permissions, ...rest } = req.body;
      const updateData: any = { ...rest };
      if (permissions !== undefined) {
        updateData.permissions = permissions ? JSON.stringify(permissions) : null;
      }
      const user = updateUser(db, req.params.id, updateData);
      res.json(user);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE /api/auth/users/:id — delete user (admin only)
  router.delete('/users/:id', (req, res) => {
    try {
      deleteUser(db, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}


