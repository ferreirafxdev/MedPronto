import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { prisma } from '../utils/db';

/**
 * [Princípio de Responsabilidade Única - SRP]
 * Autenticação do Paciente
 * Utiliza CPF e Data de Nascimento como credenciais para acesso rápido à fila.
 */
export const patientAuth = async (req: Request, res: Response) => {
  try {
    const { cpf, birthDate } = req.body;
    
    if (!cpf || !birthDate) {
      return res.status(400).json({ error: 'CPF e data de nascimento são obrigatórios.' });
    }

    // Normaliza o CPF removendo máscara para busca via índice
    const cpfClean = cpf.replace(/\D/g, '');
    const cpfFormatted = cpfClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    
    // Busca o paciente no Prisma pelas duas possíveis formatações
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { cpf: cpfClean },
          { cpf: cpfFormatted }
        ]
      }
    });

    if (!patient) {
      return res.status(401).json({ error: 'Paciente não encontrado com o CPF informado.' });
    }

    // Comparação de data de nascimento robusta e agnóstica a formato (limpa / e -)
    const cleanInputDate = birthDate.replace(/[-\/]/g, '');
    const cleanDbDate = patient.birth_date ? patient.birth_date.replace(/[-\/]/g, '') : '';

    // Função auxiliar interna para normalizar datas (DDMMYYYY -> YYYYMMDD)
    const toStandardUS = (dateStr: string) => {
      if (/^(19|20)\d{6}$/.test(dateStr)) return dateStr; // Já é YYYYMMDD
      if (/^\d{8}$/.test(dateStr)) {
        return dateStr.slice(4) + dateStr.slice(2, 4) + dateStr.slice(0, 2);
      }
      return dateStr;
    };

    if (toStandardUS(cleanInputDate) !== toStandardUS(cleanDbDate)) {
      return res.status(401).json({ error: 'Data de nascimento incorreta para o CPF informado.' });
    }

    // Gera token JWT válido por 24 horas para sessão do paciente
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
 * [Princípio Aberto/Fechado - OCP]
 * Autenticação do Médico
 * Permite login flexível via CRM, Email ou CPF (Aberto para extensões).
 */
export const doctorAuth = async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body;
    
    let whereCondition: any = {};

    // Detecção inteligente do tipo de login
    if (login.includes('@')) {
      whereCondition = { email: login };
    } else {
      const cleanLogin = login.replace(/\D/g, '');
      if (cleanLogin.length === 11) {
        const cpfFormatted = cleanLogin.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        whereCondition = {
          OR: [
            { cpf: cleanLogin },
            { cpf: cpfFormatted }
          ]
        };
      } else {
        whereCondition = { crm: login };
      }
    }

    const doctor = await prisma.doctor.findFirst({
      where: whereCondition
    });

    if (!doctor || !doctor.password) {
      return res.status(401).json({ error: 'Médico não encontrado.' });
    }

    // Valida a senha criptografada de forma segura
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
 * [Princípio de Responsabilidade Única - SRP]
 * Autenticação Administrativa
 * Valida o admin contra credenciais fixas definidas no ambiente.
 */
export const adminAuth = async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body;
    
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
