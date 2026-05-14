import { Request, Response } from 'express';
import { patientQueue } from '../queue';
import { supabase } from '../utils/supabase';

export const enqueuePatient = async (req: any, res: Response) => {
  try {
    const { id, name, complaint } = req.body;
    
    if (req.user.role === 'patient' && req.user.id !== id) {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    // VERIFICAÇÃO DE SEGURANÇA: Validar pagamento no banco de dados
    const { data: patientData, error: payError } = await supabase
      .from('patients')
      .select('has_active_payment')
      .eq('id', id)
      .single();

    if (payError || !patientData?.has_active_payment) {
      return res.status(402).json({ error: 'Pagamento pendente. Por favor, realize o pagamento para entrar na fila.' });
    }

    try {
      await patientQueue.add('patient-waiting', { id, name, complaint });
    } catch (redisErr) {
      console.warn('[Queue] Redis warning (continuing with DB):', redisErr);
    }

    // Safer logic than upsert if unique constraint is missing
    const { data: existing } = await supabase.from('queue').select('id').eq('patient_id', id).maybeSingle();

    let error;
    if (existing) {
      const { error: updateError } = await supabase
        .from('queue')
        .update({ name, complaint, status: 'waiting', created_at: new Date().toISOString() })
        .eq('patient_id', id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('queue')
        .insert([{ patient_id: id, name, complaint, status: 'waiting', created_at: new Date().toISOString() }]);
      error = insertError;
    }

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

    // Use a single update with filter to ensure atomicity
    const { data: updated, error: updateError } = await supabase
      .from('queue')
      .update({ status: 'in-consultation', doctor_id: doctorId })
      .eq('status', 'waiting') // Crucial check
      .order('created_at', { ascending: true }) // Not directly supported in update, so we need a subquery or re-fetch
      .limit(1)
      .select()
      .maybeSingle();

    // Re-check: if the above didn't work (PostgREST limitations with limit/order in update), 
    // we use a more robust two-step process but with status validation.
    if (!updated) {
       // Refetch the first one
       const { data: nextPatient } = await supabase
         .from('queue')
         .select('*')
         .eq('status', 'waiting')
         .order('created_at', { ascending: true })
         .limit(1)
         .single();
       
       if (!nextPatient) return res.status(404).json({ error: 'Fila vazia' });

       // Update only if still waiting
       const { data: finalized, error: finalError } = await supabase
         .from('queue')
         .update({ status: 'in-consultation', doctor_id: doctorId })
         .eq('id', nextPatient.id)
         .eq('status', 'waiting') // Final guard against concurrency
         .select()
         .maybeSingle();

       if (finalError || !finalized) return res.status(409).json({ error: 'Paciente já foi atendido por outro médico' });
       
       return res.json({ success: true, patient: { ...finalized, id: finalized.patient_id, roomId: finalized.patient_id } });
    }

    res.json({ success: true, patient: { ...updated, id: updated.patient_id, roomId: updated.patient_id } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
