import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { supabase } from '../utils/supabase';

export const registerPatient = async (req: Request, res: Response) => {
  try {
    const { name, cpf, age, email, birthDate } = req.body;
    const { data: patient, error } = await supabase
      .from('patients')
      .insert([{ name, cpf, age, email, birth_date: birthDate }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'CPF já cadastrado' });
      return res.status(500).json({ error: error.message });
    }

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

export const getPatientHistory = async (req: any, res: Response) => {
  try {
    const { cpf } = req.params;
    const { data: patient, error: pError } = await supabase
      .from('patients')
      .select('*')
      .eq('cpf', cpf)
      .single();

    if (pError || !patient) return res.status(404).json({ error: 'Não encontrado' });
    if (req.user.role === 'patient' && req.user.id !== patient.id) return res.status(403).json({ error: 'Acesso negado' });

    // Parallel execution for performance
    const [consultationsRes, atestadosRes] = await Promise.all([
      supabase.from('consultations').select('*, download_released').eq('patient_id', patient.id).order('created_at', { ascending: false }),
      supabase.from('atestados').select('*, download_released').eq('patient_id', patient.id).order('created_at', { ascending: false })
    ]);

    const consultations = consultationsRes.data || [];
    const atestados = atestadosRes.data || [];

    // Calculate summary for frontend stability
    const summary = {
      totalConsultations: consultations.length,
      totalAtestados: atestados.length,
      lastVisit: consultations.length > 0 ? consultations[0].created_at : null
    };

    res.json({ success: true, patient, consultations, atestados, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const checkQueueStatus = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    
    const [waitingRes, activeRes] = await Promise.all([
      supabase.from('queue').select('*').eq('patient_id', patientId).eq('status', 'waiting').maybeSingle(),
      supabase.from('queue').select('*').eq('patient_id', patientId).eq('status', 'in-consultation').maybeSingle()
    ]);

    if (activeRes.data) {
      return res.json({ isActive: true, inQueue: false, roomId: patientId });
    }
    
    if (waitingRes.data) {
      return res.json({ inQueue: true, isActive: false, entry: waitingRes.data });
    }

    res.json({ inQueue: false, isActive: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
