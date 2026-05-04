import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { supabase } from '../utils/supabase';

export const patientAuth = async (req: Request, res: Response) => {
  try {
    const { cpf, birthDate } = req.body;
    const { data: patient, error } = await supabase
      .from('patients')
      .select('*')
      .eq('cpf', cpf)
      .eq('birth_date', birthDate)
      .single();

    if (error || !patient) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign(
      { id: patient.id, name: patient.name, role: 'patient' },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({ success: true, patient, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const doctorAuth = async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body;
    const { data: doctor, error } = await supabase
      .from('doctors')
      .select('*')
      .or(`crm.eq.${login},email.eq.${login}`)
      .single();

    if (error || !doctor || !doctor.password) return res.status(401).json({ error: 'Credenciais inválidas' });

    const isPasswordCorrect = await bcrypt.compare(password, doctor.password);
    if (!isPasswordCorrect) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign(
      { id: doctor.id, name: doctor.name, role: 'doctor' },
      config.jwtSecret,
      { expiresIn: '8h' }
    );

    res.json({ success: true, doctor, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const adminAuth = async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body;
    if (login === 'admin@medpronto.com' && password === config.adminPassword) {
      const token = jwt.sign(
        { id: 'admin-01', name: 'Admin', role: 'admin' },
        config.jwtSecret,
        { expiresIn: '12h' }
      );
      res.json({ success: true, admin: { id: 'admin-01', name: 'Admin', role: 'admin' }, token });
    } else {
      res.status(401).json({ error: 'Inválido' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
