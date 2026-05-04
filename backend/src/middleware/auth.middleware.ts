import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Não autorizado' });

  jwt.verify(token, config.jwtSecret, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};

export const authorizeAdmin = (req: any, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
  next();
};

export const authorizeDoctor = (req: any, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'doctor' && req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
  next();
};
