import { Request, Response } from 'express';
import { patientQueue } from '../queue';
import { supabase } from '../utils/supabase';

export const enqueuePatient = async (req: any, res: Response) => {
  try {
    const { id, name, complaint } = req.body;
    
    if (req.user.role === 'patient' && req.user.id !== id) {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    try {
      await patientQueue.add('patient-waiting', { id, name, complaint });
    } catch (redisErr) {
      console.warn('[Queue] Redis warning (continuing with DB):', redisErr);
    }

    // Upsert logic for better reliability
    const { error } = await supabase
      .from('queue')
      .upsert({ 
        patient_id: id, 
        name, 
        complaint, 
        status: 'waiting', 
        created_at: new Date().toISOString() 
      }, { onConflict: 'patient_id' });

    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true, message: 'Adicionado à fila' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getWaitingQueue = async (req: Request, res: Response) => {
  try {
    const { data: queue, error } = await supabase
      .from('queue')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true });
      
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, queue });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const takePatient = async (req: any, res: Response) => {
  try {
    const { doctorId } = req.body;
    if (req.user.role === 'doctor' && req.user.id !== doctorId) return res.status(403).json({ error: 'Não autorizado' });

    const { data: patient, error: fetchError } = await supabase
      .from('queue')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (fetchError || !patient) return res.status(404).json({ error: 'Fila vazia' });

    const { data: updated, error: updateError } = await supabase
      .from('queue')
      .update({ status: 'in-consultation', doctor_id: doctorId })
      .eq('id', patient.id)
      .select()
      .single();

    if (updateError) return res.status(500).json({ error: updateError.message });
    res.json({ success: true, patient: { ...updated, id: updated.patient_id, roomId: updated.patient_id } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
