import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { documentQueue } from '../queue';
import { supabase } from '../utils/supabase';

export const createAtestado = async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, daysOff, cid, content } = req.body;
    const validationCode = `MP-${uuidv4().substring(0, 8).toUpperCase()}`;

    const [patientRes, doctorRes] = await Promise.all([
      supabase.from('patients').select('name').eq('id', patientId).single(),
      supabase.from('doctors').select('name, crm').eq('id', doctorId).single()
    ]);

    const patient = patientRes.data;
    const doctor = doctorRes.data;

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

    await documentQueue.add('process-atestado', {
      type: 'GENERATE_ATESTADO',
      data: { patientId, doctorId, validationCode, daysOff, cid, content }
    });

    res.json({ success: true, code: validationCode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const endConsultation = async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, notes, prescriptions, exams, content } = req.body;
    const validationCode = `MP-R-${uuidv4().substring(0, 8).toUpperCase()}`;

    const { error: insertError } = await supabase.from('consultations').insert([{
      patient_id: patientId,
      doctor_id: doctorId,
      notes,
      prescriptions,
      exams,
      content,
      validation_code: validationCode
    }]);

    if (insertError) return res.status(500).json({ error: insertError.message });

    await documentQueue.add('process-consultation', {
      type: 'GENERATE_CONSULTATION',
      data: { patientId, doctorId, validationCode, notes, prescriptions, exams, content }
    });

    await supabase.from('queue').delete().eq('patient_id', patientId);
    res.json({ success: true, message: 'Finalizado' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const validateDocument = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const cleanCode = (code as string).trim().toUpperCase();

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

export const getDoctorStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Simple stats: count consultations for this doctor today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count, error } = await supabase
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', id)
      .gte('created_at', today.toISOString());

    if (error) return res.status(500).json({ error: error.message });

    const totalConsultations = count || 0;
    const earnings = totalConsultations * 25; // R$ 25 per consultation as per frontend logic

    res.json({ success: true, stats: { totalConsultations, earnings } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
