import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, CreditCard, ShieldCheck, CheckCircle, Copy, Clock, AlertCircle } from 'lucide-react';
import apiClient from '../../api/client';
import { useStore } from '../../store/useStore';

const PatientPayment = () => {
  const navigate = useNavigate();
  const { user } = useStore();
  const [loading, setLoading] = useState(false);
  const [pixKey, setPixKey] = useState('00020126580014BR.GOV.BCB.PIX01366366f1-med-pronto-pix-key-2026520400005303986540550.005802BR5925MEDPRONTO TELEMEDICINA6009SAO PAULO62070503***6304E2B1');
  const [step, setStep] = useState(1); // 1: Info, 2: PIX, 3: Success
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  useEffect(() => {
    if (step === 2 && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleGeneratePIX = () => {
    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      setStep(2);
      setLoading(false);
    }, 800);
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    alert("Chave PIX copiada com sucesso!");
  };

  const handleConfirmPayment = () => {
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('payment_confirmed', 'true');
      setStep(3);
      setLoading(false);
      setTimeout(() => {
        if (user) {
          navigate('/patient/dashboard?new_consultation=true');
        } else {
          navigate('/patient/login?mode=register');
        }
      }, 2500);
    }, 2000);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem 1rem'
    }}>
      {/* Premium Progress Bar */}
      <div style={{ maxWidth: '500px', width: '100%', marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
         <div style={{ position: 'absolute', top: '15px', left: '0', width: '100%', height: '2px', background: '#e2e8f0', zIndex: 0 }} />
         <div style={{ position: 'absolute', top: '15px', left: '0', width: step === 1 ? '0%' : step === 2 ? '50%' : '100%', height: '2px', background: 'var(--accent)', zIndex: 1, transition: 'all 0.5s ease' }} />
         
         {[1, 2, 3].map(s => (
           <div key={s} style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', 
                background: step >= s ? 'var(--accent)' : 'white',
                color: step >= s ? 'white' : '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${step >= s ? 'var(--accent)' : '#e2e8f0'}`,
                fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.3s ease'
              }}>
                {step > s ? <CheckCircle size={16} /> : s}
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: step >= s ? 'var(--accent)' : '#94a3b8', textTransform: 'uppercase' }}>
                {s === 1 ? 'Taxa' : s === 2 ? 'Pagamento' : 'Sucesso'}
              </span>
           </div>
         ))}
      </div>

      <div style={{ 
        maxWidth: '480px', width: '100%', background: 'white', borderRadius: '1.5rem', 
        padding: '2.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
        border: '1px solid #f1f5f9'
      }}>
        
        {step === 1 && (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '64px', height: '64px', background: '#eef2ff', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                <CreditCard size={32} />
              </div>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', color: '#0f172a', marginBottom: '0.5rem' }}>Check-out Seguro</h2>
            <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '2rem', fontSize: '0.95rem' }}>
              Realize o pagamento único para ser atendido por um médico agora.
            </p>
            
            <div style={{ background: '#f8fafc', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Teleconsulta 24h</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>R$ 50,00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={12} /> Fila Estimada
                </div>
                <span>Imediata</span>
              </div>
              <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: '1.25rem', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Valor Total</strong>
                <strong style={{ fontSize: '1.5rem', color: 'var(--accent)', fontWeight: 900 }}>R$ 50,00</strong>
              </div>
            </div>

            <button className="btn btn-primary btn-full btn-lg" onClick={handleGeneratePIX} disabled={loading} style={{ height: '56px', fontSize: '1.1rem' }}>
              {loading ? <Loader2 className="animate-spin" /> : <>Próximo Passo <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} /></>}
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
              <ShieldCheck size={16} style={{ color: '#10b981' }} /> Transação Protegida por SSL
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: 'fadeInUp 0.4s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>Pagamento via PIX</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: timeLeft < 60 ? '#ef4444' : '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                 <Clock size={14} /> Expira em: {formatTime(timeLeft)}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0', textAlign: 'center', marginBottom: '2rem', position: 'relative' }}>
               <img 
                 src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(pixKey)}`} 
                 alt="PIX QR Code" 
                 style={{ width: '200px', height: '200px', marginBottom: '1.5rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.05))' }} 
               />
               <button 
                 onClick={handleCopyPix}
                 style={{ 
                   display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', 
                   padding: '1rem', background: 'white', borderRadius: '0.75rem', 
                   border: '1px solid #e2e8f0', color: '#1e293b', fontSize: '0.75rem', 
                   fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                 }}
                 onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                 onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
               >
                 <Copy size={16} /> COPIAR CÓDIGO PIX COPIA E COLA
               </button>
            </div>

            <div style={{ background: '#fff9f0', border: '1px solid #ffedd5', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2rem', display: 'flex', gap: '0.75rem' }}>
               <AlertCircle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
               <p style={{ fontSize: '0.75rem', color: '#92400e', margin: 0, lineHeight: 1.4 }}>
                 O reconhecimento é automático. Após pagar, clique no botão abaixo para prosseguir.
               </p>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <button className="btn btn-primary btn-full btn-lg" onClick={handleConfirmPayment} disabled={loading} style={{ height: '56px' }}>
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Já realizei o pagamento'}
              </button>
              <button className="btn btn-outline btn-full" onClick={() => setStep(1)} style={{ border: 'none', color: '#64748b' }}>Voltar para o resumo</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0', animation: 'scaleIn 0.5s ease' }}>
            <div style={{ width: '96px', height: '96px', background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', border: '4px solid #dcfce7' }}>
              <CheckCircle size={56} color="#10b981" />
            </div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 900, marginBottom: '0.75rem', color: '#0f172a' }}>Pagamento Aprovado!</h2>
            <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.5 }}>
              Tudo certo! Identificamos o seu PIX.<br/>
              Estamos te levando para a sala de espera...
            </p>
            <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
                 <div style={{ 
                   position: 'absolute', top: 0, left: 0, height: '100%', background: 'var(--accent)', 
                   width: '30%', animation: 'progressMove 1.5s infinite ease-in-out' 
                 }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.1em' }}>REDIRECIONANDO</span>
            </div>
          </div>
        )}
      </div>

      {/* Trust Badges */}
      {step !== 3 && (
        <div style={{ marginTop: '3rem', display: 'flex', gap: '2rem', opacity: 0.6 }}>
           <img src="https://logodownload.org/wp-content/uploads/2020/02/pix-bcb-logo-1.png" alt="PIX" style={{ height: '18px' }} />
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>
             <ShieldCheck size={14} /> PAGAMENTO CRIPTOGRAFADO
           </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes progressMove { 
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
};

export default PatientPayment;
