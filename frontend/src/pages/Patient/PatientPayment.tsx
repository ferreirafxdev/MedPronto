import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Wifi, ArrowRight, CreditCard, ShieldCheck, CheckCircle } from 'lucide-react';
import apiClient from '../../api/client';

const PatientPayment = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [step, setStep] = useState(1); // 1: Info, 2: PIX, 3: Success

  const handleGeneratePIX = async () => {
    setLoading(true);
    try {
      // Simulation of PIX generation without patient record (temp mode)
      const resp = await apiClient.post('/api/payment/pix-simulate', { patientId: 'guest-' + Date.now() });
      if (resp.data.success) {
        setPixKey(resp.data.pixKey);
        setStep(2);
      }
    } catch (e) {
      alert("Erro ao gerar pagamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = () => {
    setLoading(true);
    // Simulate payment processing delay
    setTimeout(() => {
      localStorage.setItem('payment_confirmed', 'true');
      setStep(3);
      setLoading(false);
      // Wait a bit to show success before redirecting
      setTimeout(() => {
        navigate('/patient/login?mode=register');
      }, 2000);
    }, 1500);
  };

  return (
    <div className="auth-container" style={{ background: 'linear-gradient(135deg, var(--bg-base) 0%, #ffffff 100%)' }}>
      <div className="glass-card" style={{ maxWidth: '480px', padding: '2.5rem' }}>
        
        {step === 1 && (
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
            <div className="icon-wrapper" style={{ background: 'var(--accent-ultra-light)', margin: '0 auto 1.5rem' }}>
              <CreditCard size={32} color="var(--accent)" />
            </div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Nova Consulta</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Para iniciar seu atendimento agora, realize o pagamento da taxa de consulta.
            </p>
            
            <div style={{ background: 'var(--bg-white)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', border: '1px solid var(--border)', marginBottom: '2rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Teleconsulta Online</span>
                <span style={{ fontWeight: 600 }}>R$ 50,00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--mint)', fontWeight: 600 }}>
                <span>Disponibilidade</span>
                <span>Imediata</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', marginTop: '1rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                <strong>Total</strong>
                <strong className="text-gradient">R$ 50,00</strong>
              </div>
            </div>

            <button className="btn btn-primary btn-full btn-lg" onClick={handleGeneratePIX} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Gerar PIX de Pagamento'}
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <ShieldCheck size={14} /> Pagamento 100% Seguro
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: 'fadeInUp 0.4s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>Pagamento PIX</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Escaneie o código ou copie a chave para pagar.</p>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--accent)', textAlign: 'center', marginBottom: '1.5rem' }}>
               <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixKey)}`} alt="PIX QR Code" style={{ marginBottom: '1rem', mixBlendMode: 'multiply' }} />
               <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>COPIE A CHAVE ABAIXO:</div>
               <code style={{ display: 'block', wordBreak: 'break-all', fontSize: '0.65rem', background: 'white', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>{pixKey}</code>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <button className="btn btn-primary btn-full btn-lg" onClick={handleConfirmPayment} disabled={loading}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar Pagamento'}
              </button>
              <button className="btn btn-outline btn-full" onClick={() => setStep(1)}>Voltar</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '2rem 0', animation: 'scaleIn 0.5s ease' }}>
            <div style={{ width: '80px', height: '80px', background: 'var(--mint-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle size={48} color="var(--mint)" />
            </div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: 'var(--mint)' }}>Pagamento Confirmado!</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Seu acesso foi liberado. Redirecionando para o cadastro...
            </p>
            <div style={{ marginTop: '2rem' }}>
              <Loader2 className="animate-spin" color="var(--accent)" style={{ margin: '0 auto' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientPayment;
