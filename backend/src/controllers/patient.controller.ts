import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../utils/db';

/**
 * [Princípio de Responsabilidade Única - SRP]
 * Registra um novo paciente no banco de dados e retorna um token JWT.
 */
export const registerPatient = async (req: Request, res: Response) => {
  try {
    const { name, cpf, age, email, birthDate } = req.body;
    
    // [SEGURANÇA] Validação e sanitização de inputs
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Nome inválido ou não informado.' });
    }
    if (!cpf || typeof cpf !== 'string') {
      return res.status(400).json({ error: 'CPF é obrigatório.' });
    }

    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return res.status(400).json({ error: 'CPF deve conter 11 dígitos numéricos.' });
    }

    const cleanName = name.trim().replace(/[<>]/g, ''); // Sanitiza tags HTML básicas
    const cleanEmail = email && typeof email === 'string' ? email.trim().toLowerCase() : null;

    // Insere no PostgreSQL via Prisma
    try {
      const patient = await prisma.patient.create({
        data: {
          name: cleanName,
          cpf: cleanCpf,
          age: age ? String(age).replace(/\D/g, '').substring(0, 3) : '',
          email: cleanEmail,
          birth_date: birthDate || '',
          has_active_payment: true
        }
      });


      // Gera token de acesso para o paciente
      const token = jwt.sign(
        { id: patient.id, name: patient.name, role: 'patient' },
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      res.json({ success: true, patient, token });
    } catch (dbError: any) {
      // Tratamento para violação de UNIQUE (P2002 no Prisma = Unique constraint failed)
      if (dbError.code === 'P2002' && dbError.meta?.target?.includes('cpf')) {
        return res.status(409).json({ error: 'CPF já cadastrado' });
      }
      throw dbError;
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * [Agregação de Dados e Separação de Preocupações - SRP/SoC]
 * Retorna o histórico de consultas e atestados de um paciente baseado no CPF.
 */
export const getPatientHistory = async (req: any, res: Response) => {
  try {
    const { cpf } = req.params;
    
    // Primeiro, localiza o paciente
    const patient = await prisma.patient.findUnique({
      where: { cpf }
    });

    if (!patient) return res.status(404).json({ error: 'Não encontrado' });

    // [SEGURANÇA] paciente só pode ver o próprio histórico
    if (req.user.role === 'patient' && req.user.id !== patient.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // [SEGURANÇA] médico só pode ver histórico de pacientes que já atendeu
    if (req.user.role === 'doctor') {
      const hasRelation = await prisma.consultation.findFirst({
        where: { patient_id: patient.id, doctor_id: req.user.id }
      });
      if (!hasRelation) {
        return res.status(403).json({ error: 'Acesso negado: este paciente não possui consulta registrada com você.' });
      }
    }

    // Busca paralela para otimização de performance (Prisma Relations)
    const [consultations, atestados] = await Promise.all([
      prisma.consultation.findMany({
        where: { patient_id: patient.id },
        orderBy: { created_at: 'desc' },
        include: { doctor: { select: { name: true, crm: true } } }
      }),
      prisma.atestado.findMany({
        where: { patient_id: patient.id },
        orderBy: { created_at: 'desc' },
        include: { doctor: { select: { name: true, crm: true } } }
      })
    ]);

    // Achatamento dos dados do médico (doctor.name -> doctor_name) para o frontend
    const mappedConsultations = consultations.map((c: any) => ({
      ...c,
      doctor_name: c.doctor?.name,
      doctor_crm: c.doctor?.crm
    }));

    const mappedAtestados = atestados.map((a: any) => ({
      ...a,
      doctor_name: a.doctor?.name,
      doctor_crm: a.doctor?.crm
    }));

    // Resumo para estabilidade da UI do frontend
    const summary = {
      totalConsultations: mappedConsultations.length,
      totalAtestados: mappedAtestados.length,
      lastVisit: mappedConsultations.length > 0 ? mappedConsultations[0].created_at : null
    };

    res.json({ success: true, patient, consultations: mappedConsultations, atestados: mappedAtestados, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * [Princípio de Responsabilidade Única - SRP]
 * Verifica o status da fila de um paciente (se está aguardando ou em atendimento).
 */
export const checkQueueStatus = async (req: any, res: Response) => {
  try {
    const { patientId } = req.params;

    if (req.user.role === 'patient' && req.user.id !== patientId) {
      return res.status(403).json({ error: 'Acesso negado. Você só pode consultar o próprio status.' });
    }
    
    // Busca na tabela queue do banco os status em paralelo
    const [waitingItem, activeItem] = await Promise.all([
      prisma.queue.findFirst({
        where: { patient_id: patientId, status: 'waiting' }
      }),
      prisma.queue.findFirst({
        where: { patient_id: patientId, status: 'in-consultation' },
        include: { doctor: { select: { name: true } } }
      })
    ]);

    // Se estiver em atendimento
    if (activeItem) {
      const doctorName = activeItem.doctor?.name || 'Médico';
      return res.json({ isActive: true, inQueue: false, roomId: patientId, doctorName });
    }
    
    // Se estiver apenas aguardando
    if (waitingItem) {
      return res.json({ inQueue: true, isActive: false, entry: waitingItem });
    }

    res.json({ inQueue: false, isActive: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
