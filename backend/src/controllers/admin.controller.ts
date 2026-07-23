import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/db';
import { patientQueue, documentQueue } from '../queue';
import { serverLogs } from '../index';

/**
 * [Princípio de Responsabilidade Única - SRP]
 * Retorna exclusivamente o status da infraestrutura (Banco de Dados, Redis, Filas e Logs).
 * Útil para dashboards de monitoramento e testes de healthcheck.
 */
export const getInfraStatus = async (req: Request, res: Response) => {
  try {
    // Testa conexão com PostgreSQL via Prisma
    let dbStatus = 'connected';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbError) {
      dbStatus = 'error';
    }
    
    // Testa conexão com Redis (BullMQ Queue)
    let redisStatus = 'connected';
    try {
      const client = await patientQueue.client;
      await (client as any).ping();
    } catch (e) { 
      redisStatus = 'disconnected'; 
    }

    res.json({
      success: true,
      services: {
        api: 'online',
        database: dbStatus, // Substituiu o 'supabase' do código antigo
        redis: redisStatus,
      },
      queues: {
        waiting: await patientQueue.count(),
        documents: await documentQueue.count(),
      },
      logs: serverLogs // Logs capturados pelo Morgan no index.ts
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * [Princípio de Responsabilidade Única - SRP]
 * Obtém a lista de médicos ordenados por nome.
 */
export const getDoctors = async (req: Request, res: Response) => {
  try {
    const doctors = await prisma.doctor.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, doctors });
  } catch (err: any) { 
    res.status(500).json({ error: err.message }); 
  }
};

/**
 * Cria um novo perfil médico aplicando hash seguro na senha.
 */
export const createDoctor = async (req: Request, res: Response) => {
  try {
    const { name, crm, email, password, specialty, cpf } = req.body;
    
    // Criptografia da senha antes de persistir no banco (Segurança)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const doctor = await prisma.doctor.create({
      data: {
        name,
        crm,
        email,
        password: hashedPassword,
        specialty,
        cpf: cpf && cpf.trim() !== '' ? cpf : null
      }
    });

    res.json({ success: true, doctor });
  } catch (err: any) { 
    res.status(500).json({ error: err.message }); 
  }
};

/**
 * Remove um médico pelo seu identificador (ID).
 */
export const deleteDoctor = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    await prisma.doctor.delete({
      where: { id }
    });
    
    res.json({ success: true });
  } catch (err: any) { 
    res.status(500).json({ error: err.message }); 
  }
};

/**
 * Busca pacientes filtrando por nome ou CPF, ou retorna todos se nenhum filtro for passado.
 */
export const getPatients = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    
    // Condição de busca flexível para nome ou cpf
    const whereCondition = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as any } },
        { cpf: { equals: search } }
      ]
    } : {};

    const patients = await prisma.patient.findMany({
      where: whereCondition,
      orderBy: { name: 'asc' }
    });
    
    res.json({ success: true, patients });
  } catch (err: any) { 
    res.status(500).json({ error: err.message }); 
  }
};

/**
 * [Princípio de Aberto/Fechado - OCP]
 * Altera o status de liberação de download de um documento. 
 * Projetado para suportar qualquer tipo de tabela mapeada.
 */
export const releaseDocument = async (req: Request, res: Response) => {
  try {
    const { type, id, released } = req.body;
    
    if (type === 'ATESTADO') {
      await prisma.atestado.update({
        where: { id },
        data: { download_released: released }
      });
    } else {
      await prisma.consultation.update({
        where: { id },
        data: { download_released: released }
      });
    }
    
    res.json({ success: true });
  } catch (err: any) { 
    res.status(500).json({ error: err.message }); 
  }
};

/**
 * [Agregação de Dados]
 * Obtém o histórico completo (prontuário) de um paciente unindo Consultas e Atestados.
 */
export const getPatientRecord = async (req: Request, res: Response) => {
  try {
    const patientId = req.params.patientId as string;

    // Realiza a busca paralela dos dados do paciente e seus documentos vinculados
    const [patient, consultations, atestados] = await Promise.all([
      prisma.patient.findUnique({ where: { id: patientId } }),
      prisma.consultation.findMany({
        where: { patient_id: patientId },
        orderBy: { created_at: 'desc' },
        include: { doctor: { select: { name: true, crm: true } } }
      }),
      prisma.atestado.findMany({
        where: { patient_id: patientId },
        orderBy: { created_at: 'desc' },
        include: { doctor: { select: { name: true, crm: true } } }
      })
    ]);

    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Achata o objeto do médico para o formato esperado pelo frontend
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

    res.json({
      success: true,
      patient,
      record: {
        consultations: mappedConsultations,
        atestados: mappedAtestados
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
