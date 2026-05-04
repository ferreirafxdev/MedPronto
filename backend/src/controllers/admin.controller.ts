import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../utils/supabase';
import { patientQueue, documentQueue } from '../queue';

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
      }
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
    const { name, crm, email, password, specialty } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const { data: doctor, error } = await supabase
      .from('doctors')
      .insert([{ name, crm, email, password: hashedPassword, specialty }])
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
