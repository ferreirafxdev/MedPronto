import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { supabase } from '../utils/supabase';

/**
 * Autenticação do Paciente
 * Utiliza CPF e Data de Nascimento como "senha" inicial.
 */
export const patientAuth = async (req: Request, res: Response) => {
  try {
    const { cpf, birthDate } = req.body;
    
    if (!cpf || !birthDate) {
      return res.status(400).json({ error: 'CPF e data de nascimento são obrigatórios.' });
    }

    // Normaliza o CPF removendo máscara para busca robusta via índice
    const cpfClean = cpf.replace(/\D/g, '');
    const cpfFormatted = cpfClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    
    // Busca direta por CPF único (extremamente rápida)
    const { data: patient, error } = await supabase
      .from('patients')
      .select('*')
      .or(`cpf.eq.${cpfClean},cpf.eq.${cpfFormatted}`)
      .maybeSingle();

    if (error || !patient) {
      return res.status(401).json({ error: 'Paciente não encontrado com o CPF informado.' });
    }

    // Comparação de data de nascimento ultra-robusta e agnóstica a formato (limpa / e -)
    const cleanInputDate = birthDate.replace(/[-\/]/g, '');
    const cleanDbDate = patient.birth_date ? patient.birth_date.replace(/[-\/]/g, '') : '';

    // Normaliza datas em formato brasileiro (DDMMYYYY) ou americano (YYYYMMDD) para padrão comparativo US
    const toStandardUS = (dateStr: string) => {
      if (/^(19|20)\d{6}$/.test(dateStr)) return dateStr; // Já é YYYYMMDD
      if (/^\d{8}$/.test(dateStr)) {
        // DDMMYYYY -> YYYYMMDD
        return dateStr.slice(4) + dateStr.slice(2, 4) + dateStr.slice(0, 2);
      }
      return dateStr;
    };

    if (toStandardUS(cleanInputDate) !== toStandardUS(cleanDbDate)) {
      return res.status(401).json({ error: 'Data de nascimento incorreta para o CPF informado.' });
    }

    // Gera token JWT válido por 24 horas
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

/**
 * Autenticação do Médico
 * Permite login via CRM, Email ou CPF.
 */
export const doctorAuth = async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body;
    
    // Busca inteligente para evitar erros de sintaxe PostgREST e otimizar velocidade
    let query = supabase.from('doctors').select('*');
    if (login.includes('@')) {
      query = query.eq('email', login);
    } else {
      const cleanLogin = login.replace(/\D/g, '');
      if (cleanLogin.length === 11) {
        const cpfFormatted = cleanLogin.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        query = query.or(`cpf.eq.${cleanLogin},cpf.eq.${cpfFormatted}`);
      } else {
        query = query.eq('crm', login);
      }
    }

    const { data: doctor, error } = await query.maybeSingle();

    if (error || !doctor || !doctor.password) return res.status(401).json({ error: 'Médico não encontrado.' });

    // Valida a senha criptografada (bcrypt)
    const isPasswordCorrect = await bcrypt.compare(password, doctor.password);
    if (!isPasswordCorrect) return res.status(401).json({ error: 'Senha incorreta.' });

    // Gera token JWT válido por 8 horas (jornada de trabalho comum)
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

/**
 * Autenticação Administrativa
 * Utiliza credenciais fixas definidas no ambiente (.env).
 */
export const adminAuth = async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body;
    
    // Validação contra as variáveis de ambiente
    if (login === 'admin@medpronto.com' && password === config.adminPassword) {
      const token = jwt.sign(
        { id: 'admin-01', name: 'Admin Principal', role: 'admin' },
        config.jwtSecret,
        { expiresIn: '12h' }
      );
      res.json({ success: true, admin: { id: 'admin-01', name: 'Admin', role: 'admin' }, token });
    } else {
      res.status(401).json({ error: 'Usuário ou senha administrativa inválidos.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
