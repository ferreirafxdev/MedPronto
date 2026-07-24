import { Request, Response } from 'express';
import { patientQueue } from '../queue';
import { prisma } from '../utils/db';

/**
 * [Princípio de Responsabilidade Única - SRP]
 * Adiciona um paciente à fila de espera de atendimento.
 */
export const enqueuePatient = async (req: any, res: Response) => {
  try {
    const { id, name, complaint } = req.body;
    
    if (req.user.role === 'patient' && req.user.id !== id) {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    // VERIFICAÇÃO DE SEGURANÇA: Validar pagamento no banco de dados PostgreSQL
    const patientData = await prisma.patient.findUnique({ where: { id } });
    if (!patientData) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    if (!patientData.has_active_payment) {
      return res.status(402).json({ 
        error: 'Pagamento pendente. Seu atendimento anterior já foi finalizado. Para entrar na fila novamente, realize um novo pagamento.',
        requiresPayment: true 
      });
    }

    try {
      await patientQueue.add('patient-waiting', { id, name, complaint });
    } catch (redisErr) {
      console.warn('[Queue] Redis warning (continuing with DB):', redisErr);
    }

    // Usamos busca e atualização no banco Postgres
    const existing = await prisma.queue.findFirst({
      where: { patient_id: id }
    });

    if (existing) {
      await prisma.queue.update({
        where: { id: existing.id },
        data: { name, complaint, status: 'waiting', created_at: new Date() }
      });
    } else {
      await prisma.queue.create({
        data: { patient_id: id, name, complaint, status: 'waiting', created_at: new Date() }
      });
    }

    res.json({ success: true, message: 'Adicionado à fila' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};


/**
 * Retorna a fila atual de pacientes aguardando.
 */
export const getWaitingQueue = async (req: Request, res: Response) => {
  try {
    const queue = await prisma.queue.findMany({
      where: { status: 'waiting' },
      orderBy: { created_at: 'asc' }
    });
      
    res.json({ success: true, queue });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * [Princípio Aberto/Fechado - OCP]
 * Médico puxa o próximo paciente da fila (ou um paciente específico futuramente).
 * Garante concorrência para não ter conflito de médicos pegando o mesmo paciente.
 */
export const takePatient = async (req: any, res: Response) => {
  try {
    const { doctorId } = req.body;
    if (req.user.role === 'doctor' && req.user.id !== doctorId) {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    // 1. Encontra o paciente mais antigo na fila
    const nextPatient = await prisma.queue.findFirst({
      where: { status: 'waiting' },
      orderBy: { created_at: 'asc' }
    });
    
    if (!nextPatient) return res.status(404).json({ error: 'Fila vazia' });

    // 2. Tenta atualizar atomicamente baseando-se no status "waiting"
    // Isso previne condições de corrida (Race Conditions)
    try {
      const finalized = await prisma.queue.update({
        where: { id: nextPatient.id },
        data: { status: 'in-consultation', doctor_id: doctorId }
      });
      
      // O roomId deve ser retornado para o frontend iniciar a chamada de vídeo P2P
      return res.json({ 
        success: true, 
        patient: { ...finalized, id: finalized.patient_id, roomId: finalized.patient_id } 
      });
    } catch (updateError) {
      // Se falhar o update (ex: outro médico pegou antes e mudou algo), retornamos conflito
      return res.status(409).json({ error: 'Paciente já foi atendido por outro médico' });
    }

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
