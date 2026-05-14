import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../utils/supabase';
import { patientQueue, documentQueue } from '../queue';
import { serverLogs } from '../index';

export const getInfraStatus = async (req: Request, res: Response) => {
  try {
    const { error: sbError } = await supabase.from('patients').select('id').limit(1);
    
    let redisStatus = 'connected';
    try {
      const client = await patientQueue.client;
      await client.ping();
    } catch (e) { redisStatus = 'disconnected'; }

    res.json({
      success: true,
      services: {
        api: 'online',
        supabase: sbError ? 'error' : 'online',
        redis: redisStatus,
      },
      queues: {
        waiting: await patientQueue.count(),
        documents: await documentQueue.count(),
      },
      logs: serverLogs
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getDoctors = async (req: Request, res: Response) => {
  try {
    const { data: doctors, error } = await supabase.from('doctors').select('*').order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, doctors });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const createDoctor = async (req: Request, res: Response) => {
  try {
    const { name, crm, email, password, specialty, cpf } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Treat empty CPF as null to avoid unique constraint issues with empty strings
    const doctorData = { 
      name, 
      crm, 
      email, 
      password: hashedPassword, 
      specialty, 
      cpf: cpf && cpf.trim() !== '' ? cpf : null 
    };

    const { data: doctor, error } = await supabase
      .from('doctors')
      .insert([doctorData])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, doctor });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const deleteDoctor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('doctors').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const getPatients = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    let query = supabase.from('patients').select('*').order('name');
    if (search) {
      query = query.or(`name.ilike.%${search}%,cpf.eq.${search}`);
    }
    const { data: patients, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, patients });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const releaseDocument = async (req: Request, res: Response) => {
  try {
    const { type, id, released } = req.body;
    const table = type === 'ATESTADO' ? 'atestados' : 'consultations';
    const { error } = await supabase.from(table).update({ download_released: released }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const getPatientRecord = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    const [patientRes, consultationsRes, atestadosRes] = await Promise.all([
      supabase.from('patients').select('*').eq('id', patientId).single(),
      supabase.from('consultations').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
      supabase.from('atestados').select('*').eq('patient_id', patientId).order('created_at', { ascending: false })
    ]);

    if (patientRes.error) return res.status(404).json({ error: 'Paciente não encontrado' });

    res.json({
      success: true,
      patient: patientRes.data,
      record: {
        consultations: consultationsRes.data || [],
        atestados: atestadosRes.data || []
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
