import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { documentQueue } from '../queue';
import { prisma } from '../utils/db';
import { emitConsultationEnded } from '../websocket';

/**
 * [Princípio de Responsabilidade Única - SRP]
 * Cria um atestado médico avulso (usado via API direta).
 * Separa a lógica de inserção no banco da lógica de processamento em background (Fila).
 */
export const createAtestado = async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, daysOff, cid, content } = req.body;
    const validationCode = `MP-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Busca nomes para popular o atestado de forma legível
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });

    // Insere o atestado no banco de dados
    await prisma.atestado.create({
      data: {
        code: validationCode,
        patient_id: patientId,
        doctor_id: doctorId,
        days_off: parseInt(daysOff) || 1,
        cid,
        content,
        patient_name: patient?.name || '',
        doctor_name: doctor?.name || '',
        doctor_crm: doctor?.crm || ''
      }
    });

    // Adiciona à fila de processamento de documentos (Geração de PDF no Worker)
    await documentQueue.add('process-atestado', {
      type: 'GENERATE_ATESTADO',
      data: { patientId, doctorId, validationCode, daysOff, cid, content }
    });

    res.json({ success: true, code: validationCode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Finaliza a consulta médica COMPLETAMENTE DE FORMA AUTOMÁTICA:
 * 1. Salva evolução clínica/anamnese no prontuário
 * 2. Gera atestado médico automaticamente (sem aprovação manual)
 * 3. Gera receituário/evolução como documento
 * 4. Remove da fila + consome pagamento
 * 5. Emite evento WebSocket em tempo real para o paciente
 * 6. Retorna URLs dos documentos para exibição imediata
 * 
 * [Padrão Transaction Script] - Operações sequenciais para garantir consistência
 */
export const endConsultation = async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, notes, prescriptions, exams, content, atestado } = req.body;
    const consultationCode = `MP-R-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Busca dados do médico para os documentos
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });

    // 1. Salva a Consulta/Prontuário (Evolução + Receituário)
    await prisma.consultation.create({
      data: {
        patient_id: patientId,
        doctor_id: doctorId,
        notes,
        prescriptions,
        exams,
        content,
        validation_code: consultationCode
      }
    });

    // 2. Gera documento da consulta na fila (PDF assíncrono)
    await documentQueue.add('process-consultation', {
      type: 'GENERATE_CONSULTATION',
      data: { patientId, doctorId, validationCode: consultationCode, notes, prescriptions, exams, content }
    });

    // 3. Salva o Atestado automaticamente (se os dados foram preenchidos)
    let atestadoCode: string | null = null;
    if (atestado && (atestado.content || atestado.daysOff)) {
      atestadoCode = `MP-A-${uuidv4().substring(0, 8).toUpperCase()}`;

      await prisma.atestado.create({
        data: {
          code: atestadoCode,
          patient_id: patientId,
          doctor_id: doctorId,
          days_off: parseInt(atestado.daysOff) || 1,
          cid: atestado.cid,
          content: atestado.content,
          patient_name: patient?.name || '',
          doctor_name: doctor?.name || '',
          doctor_crm: doctor?.crm || ''
        }
      });

      // Enfileira geração de PDF do atestado
      await documentQueue.add('process-atestado', {
        type: 'GENERATE_ATESTADO',
        data: {
          patientId,
          doctorId,
          validationCode: atestadoCode,
          daysOff: atestado.daysOff,
          cid: atestado.cid,
          content: atestado.content
        }
      });
    }

    // 4. Remove paciente da fila + consome o pagamento
    await prisma.queue.deleteMany({ where: { patient_id: patientId } });
    await prisma.patient.update({
      where: { id: patientId },
      data: { has_active_payment: false }
    });

    // 5. Emite evento WebSocket em TEMPO REAL para o paciente
    //    O paciente recebe instantaneamente os dados da consulta sem precisar fazer polling
    emitConsultationEnded(patientId, {
      atestado: atestadoCode ? {
        code: atestadoCode,
        content: atestado?.content || '',
        daysOff: parseInt(atestado?.daysOff) || 1,
        cid: atestado?.cid
      } : undefined,
      consultation: {
        code: consultationCode,
        notes: notes || '',
        prescriptions: prescriptions || '',
        exams: exams || ''
      },
      doctorName: doctor?.name || 'Médico'
    });

    // 6. Retorna resposta com os dados dos documentos gerados
    res.json({
      success: true,
      message: 'Consulta finalizada e documentos gerados automaticamente',
      documents: {
        consultationCode,
        atestadoCode,
        doctorName: doctor?.name,
        patientName: patient?.name,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (err: any) {
    console.error('[Doctor] Erro ao finalizar consulta:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Valida um documento (Atestado ou Receita) através do código MP-XXXX.
 */
export const validateDocument = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const cleanCode = (code as string).trim().toUpperCase();

    // Busca simultânea em ambas as tabelas (Otimização de tempo de resposta)
    const [atestadoDoc, consultationDoc] = await Promise.all([
      prisma.atestado.findUnique({
        where: { code: cleanCode },
        include: { patient: { select: { name: true } }, doctor: { select: { name: true, crm: true } } }
      }),
      prisma.consultation.findUnique({
        where: { validation_code: cleanCode },
        include: { patient: { select: { name: true } }, doctor: { select: { name: true, crm: true } } }
      })
    ]);

    if (atestadoDoc) {
      return res.json({
        success: true,
        type: 'ATESTADO',
        document: {
          patientName: atestadoDoc.patient?.name || atestadoDoc.patient_name,
          doctorName: atestadoDoc.doctor?.name || atestadoDoc.doctor_name,
          doctorCrm: atestadoDoc.doctor?.crm || atestadoDoc.doctor_crm,
          date: atestadoDoc.created_at,
          details: atestadoDoc.content || `Afastamento de ${atestadoDoc.days_off} dias. CID: ${atestadoDoc.cid || 'Não informado'}`
        }
      });
    }

    if (consultationDoc) {
      return res.json({
        success: true,
        type: 'RECEITA',
        document: {
          patientName: consultationDoc.patient?.name,
          doctorName: consultationDoc.doctor?.name,
          doctorCrm: consultationDoc.doctor?.crm,
          date: consultationDoc.created_at,
          details: `Prescrições: ${consultationDoc.prescriptions || 'Nenhuma'}\nExames: ${consultationDoc.exams || 'Nenhum'}`
        }
      });
    }

    res.status(404).json({ error: 'Não encontrado' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Retorna estatísticas simples do médico (consultas no dia e ganhos estimados)
 */
export const getDoctorStats = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Conta quantas consultas o médico realizou hoje
    const totalConsultations = await prisma.consultation.count({
      where: {
        doctor_id: id,
        created_at: { gte: today }
      }
    });

    const earnings = totalConsultations * 25; // Exemplo: R$ 25 por consulta

    res.json({ success: true, stats: { totalConsultations, earnings } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
