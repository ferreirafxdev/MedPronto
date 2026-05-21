import { Router } from 'express';
import { supabase } from '../utils/supabase';
import { getDailyRoomAndToken } from '../controllers/daily.controller';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    const { error } = await supabase.from('patients').select('id').limit(1);
    res.json({ 
      status: 'ok', 
      supabase: error ? `error: ${error.message}` : 'connected', 
      time: new Date().toISOString() 
    });
  } catch (err: any) { 
    res.json({ status: 'error', error: err.message }); 
  }
});

router.post('/payment/confirm', async (req, res) => {
  const { patientId } = req.body;
  
  // Aqui você integraria com o webhook do seu Gateway de Pagamento (Asaas, Mercado Pago, etc)
  // Por enquanto, simulamos o sucesso gravando no banco de dados.
  const { error } = await supabase
    .from('patients')
    .update({ has_active_payment: true })
    .eq('id', patientId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: 'Pagamento confirmado e registrado no banco.' });
});

router.post('/daily/token', getDailyRoomAndToken); // Usando POST pois enviamos isDoctor no body

export default router;
