import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { supabase } from '../utils/supabase';

/**
 * Registra um novo paciente no banco de dados e retorna um token JWT
 */
export const registerPatient = async (req: Request, res: Response) => {
  try {
    const { name, cpf, age, email, birthDate } = req.body;
    
    // Insere no Supabase
    const { data: patient, error } = await supabase
      .from('patients')
      .insert([{ name, cpf, age, email, birth_date: birthDate }])
      .select()
      .single();

    if (error) {
      // Erro 23505 = Unique Violation (CPF já existe)
      if (error.code === '23505') return res.status(409).json({ error: 'CPF já cadastrado' });
      return res.status(500).json({ error: error.message });
    }

    // Gera token de acesso para o paciente
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

/**
 * Retorna o histórico de consultas e atestados de um paciente baseado no CPF
 */
export const getPatientHistory = async (req: any, res: Response) => {
  try {
    const { cpf } = req.params;
    
    // Primeiro, localiza o paciente
    const { data: patient, error: pError } = await supabase
      .from('patients')
      .select('*')
      .eq('cpf', cpf)
      .single();

    if (pError || !patient) return res.status(404).json({ error: 'Não encontrado' });
    
    // Verificação de segurança: paciente só pode ver o próprio histórico
    if (req.user.role === 'patient' && req.user.id !== patient.id) {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    // Execução paralela para melhor performance
    const [consultationsRes, atestadosRes] = await Promise.all([
      supabase.from('consultations')
        .select('*, doctor:doctors(name, crm)') // Join com tabela de médicos
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false }),
      supabase.from('atestados')
        .select('*, doctor:doctors(name, crm)') // Join com tabela de médicos
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
    ]);

    // Achatamento dos dados do médico (doctor.name -> doctor_name) para o frontend
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

    // Resumo para estabilidade da UI do frontend
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

/**
 * Verifica se o paciente está na fila ou em atendimento ativo
 */
export const checkQueueStatus = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    
    // Verifica em paralelo se está na fila de espera ou em atendimento
    const [waitingRes, activeRes] = await Promise.all([
      supabase.from('queue').select('*').eq('patient_id', patientId).eq('status', 'waiting').maybeSingle(),
      supabase.from('queue').select('*').eq('patient_id', patientId).eq('status', 'in-consultation').maybeSingle()
    ]);

    // Se estiver em atendimento
    if (activeRes.data) {
      const doctorId = activeRes.data.doctor_id;
      let doctorName = 'Médico';
      if (doctorId) {
        const { data: doc } = await supabase.from('doctors').select('name').eq('id', doctorId).maybeSingle();
        if (doc) doctorName = doc.name;
      }
      return res.json({ isActive: true, inQueue: false, roomId: patientId, doctorName });
    }
    
    // Se estiver apenas aguardando
    if (waitingRes.data) {
      return res.json({ inQueue: true, isActive: false, entry: waitingRes.data });
    }

    res.json({ inQueue: false, isActive: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
