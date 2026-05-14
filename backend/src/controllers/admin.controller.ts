import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../utils/supabase';
import { patientQueue, documentQueue } from '../queue';
import { serverLogs } from '../index';

/**
 * Retorna o status da infraestrutura (Supabase, Redis, Filas e Logs)
 */
export const getInfraStatus = async (req: Request, res: Response) => {
  try {
    // Testa conexão com Supabase
    const { error: sbError } = await supabase.from('patients').select('id').limit(1);
    
    // Testa conexão com Redis
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
      logs: serverLogs // Logs capturados pelo Morgan no index.ts
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Lista todos os médicos cadastrados
 */
export const getDoctors = async (req: Request, res: Response) => {
  try {
    const { data: doctors, error } = await supabase.from('doctors').select('*').order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, doctors });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

/**
 * Cria um novo perfil médico
 */
export const createDoctor = async (req: Request, res: Response) => {
  try {
    const { name, crm, email, password, specialty, cpf } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Tratamento para CPF: se vazio, envia null para evitar conflito de UNIQUE
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

/**
 * Remove um médico pelo ID
 */
export const deleteDoctor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('doctors').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

/**
 * Busca pacientes por nome ou CPF
 */
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

/**
 * Libera ou bloqueia o download de um documento pelo paciente
 */
export const releaseDocument = async (req: Request, res: Response) => {
  try {
    const { type, id, released } = req.body;
    const table = type === 'ATESTADO' ? 'atestados' : 'consultations';
    const { error } = await supabase.from(table).update({ download_released: released }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

/**
 * Obtém o histórico completo (prontuário) de um paciente específico
 */
export const getPatientRecord = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    // Busca dados do paciente e documentos vinculados (com join de médico)
    const [patientRes, consultationsRes, atestadosRes] = await Promise.all([
      supabase.from('patients').select('*').eq('id', patientId).single(),
      supabase.from('consultations').select('*, doctor:doctors(name, crm)').eq('patient_id', patientId).order('created_at', { ascending: false }),
      supabase.from('atestados').select('*, doctor:doctors(name, crm)').eq('patient_id', patientId).order('created_at', { ascending: false })
    ]);

    if (patientRes.error) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Mapeia os dados do médico para o primeiro nível do objeto
    const consultations = (consultationsRes.data || []).map((c: any) => ({
      ...c,
      doctor_name: c.doctor?.name,
      doctor_crm: c.doctor?.crm
    }));

    const atestados = (atestadosRes.data || []).map((a: any) => ({
      ...a,
      doctor_name: a.doctor?.name,
      doctor_crm: a.doctor?.crm
    }));

    res.json({
      success: true,
      patient: patientRes.data,
      record: {
        consultations,
        atestados
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
