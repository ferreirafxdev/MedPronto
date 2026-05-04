import { Router } from 'express';
import { supabase } from '../utils/supabase';

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

router.post('/payment/pix-simulate', async (req, res) => {
  const pixKey = '00020126580014BR.GOV.BCB.PIX01366366f1-med-pronto-pix-key-2026520400005303986540550.005802BR5925MEDPRONTO TELEMEDICINA6009SAO PAULO62070503***6304E2B1';
  res.json({ success: true, pixKey });
});

export default router;
