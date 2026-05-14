import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { documentQueue } from '../queue';
import { supabase } from '../utils/supabase';

/**
 * Cria um atestado médico avulso (usado via API direta)
 */
export const createAtestado = async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, daysOff, cid, content } = req.body;
    const validationCode = `MP-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Busca nomes para popular a tabela de atestados de forma legível
    const [patientRes, doctorRes] = await Promise.all([
      supabase.from('patients').select('name').eq('id', patientId).single(),
      supabase.from('doctors').select('name, crm').eq('id', doctorId).single()
    ]);

    const patient = patientRes.data;
    const doctor = doctorRes.data;

    // Insere o atestado no banco de dados
    const { error } = await supabase.from('atestados').insert([{
      code: validationCode,
      patient_id: patientId,
      doctor_id: doctorId,
      days_off: parseInt(daysOff) || 1,
      cid,
      content,
      patient_name: patient?.name,
      doctor_name: doctor?.name,
      doctor_crm: doctor?.crm
    }]);

    if (error) return res.status(500).json({ error: error.message });

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
 * Finaliza a consulta médica, salvando evolução, receitas e opcionalmente o atestado
 */
export const endConsultation = async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, notes, prescriptions, exams, content, atestado } = req.body;
    const consultationCode = `MP-R-${uuidv4().substring(0, 8).toUpperCase()}`;

    // 1. Salva a Consulta/Prontuário
    const { error: insertError } = await supabase.from('consultations').insert([{
      patient_id: patientId,
      doctor_id: doctorId,
      notes,
      prescriptions,
      exams,
      content,
      validation_code: consultationCode
    }]);

    if (insertError) return res.status(500).json({ error: insertError.message });

    // 2. Salva o Atestado (se os dados foram preenchidos na aba de atestado)
    if (atestado && (atestado.content || atestado.daysOff)) {
      const atestadoCode = `MP-A-${uuidv4().substring(0, 8).toUpperCase()}`;
      
      const { data: doctor } = await supabase.from('doctors').select('name, crm').eq('id', doctorId).single();

      await supabase.from('atestados').insert([{
        code: atestadoCode,
        patient_id: patientId,
        doctor_id: doctorId,
        days_off: parseInt(atestado.daysOff) || 1,
        cid: atestado.cid,
        content: atestado.content,
        patient_name: '', // Será atualizado pelo worker ou join
        doctor_name: doctor?.name,
        doctor_crm: doctor?.crm
      }]);

      // Enfileira geração de PDF do atestado
      await documentQueue.add('process-atestado', {
        type: 'GENERATE_ATESTADO',
        data: { patientId, doctorId, validationCode: atestadoCode, daysOff: atestado.daysOff, cid: atestado.cid, content: atestado.content }
      });
    }

    // 3. Processa Documento da Consulta (Receituário/Evolução)
    await documentQueue.add('process-consultation', {
      type: 'GENERATE_CONSULTATION',
      data: { patientId, doctorId, validationCode: consultationCode, notes, prescriptions, exams, content }
    });

    // Remove o paciente da fila do Redis/DB após o atendimento
    await supabase.from('queue').delete().eq('patient_id', patientId);
    res.json({ success: true, message: 'Finalizado' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Valida um documento (Atestado ou Receita) através do código MP-XXXX
 */
export const validateDocument = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const cleanCode = (code as string).trim().toUpperCase();

    // Busca em ambas as tabelas pelo código único
    const [atestadoRes, consultationRes] = await Promise.all([
      supabase.from('atestados').select('*').eq('code', cleanCode).maybeSingle(),
      supabase.from('consultations').select('*').eq('validation_code', cleanCode).maybeSingle()
    ]);

    if (atestadoRes.data) return res.json({ success: true, type: 'ATESTADO', document: atestadoRes.data });
    if (consultationRes.data) return res.json({ success: true, type: 'RECEITA', document: consultationRes.data });

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
    const { id } = req.params;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Conta quantas consultas o médico realizou hoje
    const { count, error } = await supabase
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', id)
      .gte('created_at', today.toISOString());

    if (error) return res.status(500).json({ error: error.message });

    const totalConsultations = count || 0;
    const earnings = totalConsultations * 25; // Exemplo: R$ 25 por consulta

    res.json({ success: true, stats: { totalConsultations, earnings } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
