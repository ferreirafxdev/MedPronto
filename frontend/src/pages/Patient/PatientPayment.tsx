import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, CreditCard, ShieldCheck, CheckCircle, Copy, Clock, AlertCircle } from 'lucide-react';
import apiClient from '../../api/client';
import { useStore } from '../../store/useStore';

const PatientPayment = () => {
  const navigate = useNavigate();
  const { user } = useStore();
  const [loading, setLoading] = useState(false);
  const [pixKey] = useState('00020126580014BR.GOV.BCB.PIX01366366f1-med-pronto-pix-key-2026520400005303986540550.005802BR5925MEDPRONTO TELEMEDICINA6009SAO PAULO62070503***6304E2B1');
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
    setTimeout(() => {
      setStep(2);
      setLoading(false);
    }, 800);
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    alert('Chave PIX copiada com sucesso!');
  };

  const handleConfirmPayment = async () => {
    setLoading(true);
    if (!user) {
      setTimeout(() => {
        try {
          localStorage.setItem('payment_confirmed', 'true');
          setStep(3);
          setTimeout(() => {
            navigate('/patient/login?mode=register');
          }, 2500);
        } catch {
          alert('Erro ao salvar dados de pagamento localmente.');
        } finally {
          setLoading(false);
        }
      }, 1500);
      return;
    }

    try {
      await apiClient.post('/api/payment/confirm', { patientId: user.id });
      localStorage.setItem('payment_confirmed', 'true');
      setStep(3);
      setTimeout(() => {
        navigate('/patient/dashboard?new_consultation=true');
      }, 2500);
    } catch {
      alert('Erro ao confirmar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[480px]">
      {/* Progress Steps */}
      <div className="mb-6 flex items-center justify-between relative px-4">
        <div className="absolute top-[15px] left-8 right-8 h-[2px] bg-[var(--color-border)] z-0" />
        <div
          className="absolute top-[15px] left-8 h-[2px] bg-[var(--color-brand)] z-0 transition-all duration-300"
          style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '85%' }}
        />

        {[1, 2, 3].map(s => (
          <div key={s} className="relative z-10 flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors ${
                step >= s
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'bg-[var(--color-bg-white)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
              }`}
            >
              {step > s ? <CheckCircle size={15} /> : s}
            </div>
            <span className={`text-[10px] font-medium uppercase tracking-wider ${step >= s ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-muted)]'}`}>
              {s === 1 ? 'Resumo' : s === 2 ? 'Pagamento' : 'Conclusao'}
            </span>
          </div>
        ))}
      </div>

      {/* Main Card */}
      <div className="medical-card p-8">
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-brand-light)] flex items-center justify-center mx-auto mb-3">
                <CreditCard size={22} className="text-[var(--color-brand)]" />
              </div>
              <h2 className="text-[1.25rem] font-semibold mb-1">Checkout Seguro</h2>
              <p className="text-[13px] text-[var(--color-text-secondary)]">
                Pagamento unico para atendimento medico imediato
              </p>
            </div>

            <div className="bg-[var(--color-bg-subtle)] rounded-lg p-4 border border-[var(--color-border)] space-y-3">
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--color-text-secondary)]">Teleconsulta 24h</span>
                <span className="font-semibold text-[var(--color-text-primary)]">R$ 50,00</span>
              </div>
              <div className="flex justify-between text-[12px] text-[var(--color-success)] font-medium">
                <span className="flex items-center gap-1">
                  <Clock size={13} /> Tempo de Espera
                </span>
                <span>Imediato</span>
              </div>
              <div className="border-t border-[var(--color-border)] pt-3 flex justify-between items-center">
                <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">Total</span>
                <span className="text-[1.25rem] font-bold text-[var(--color-brand)]">R$ 50,00</span>
              </div>
            </div>

            <button
              className="btn-primary w-full py-2.5"
              onClick={handleGeneratePIX}
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  Gerar QR Code PIX <ArrowRight size={16} />
                </span>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
              <ShieldCheck size={14} className="text-[var(--color-success)]" /> Pagamento 100% Criptografado
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-[1.125rem] font-semibold mb-1">Pagamento via PIX</h3>
              <div className="flex items-center justify-center gap-1 text-[12px] text-[var(--color-warning)] font-medium">
                <Clock size={13} /> Expira em: {formatTime(timeLeft)}
              </div>
            </div>

            <div className="bg-[var(--color-bg-subtle)] p-6 rounded-lg border border-[var(--color-border)] text-center space-y-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixKey)}`}
                alt="PIX QR Code"
                className="w-48 h-48 mx-auto border border-[var(--color-border)] rounded-md bg-white p-2"
              />
              <button
                onClick={handleCopyPix}
                className="btn-secondary w-full py-2 text-[12px] gap-2"
              >
                <Copy size={14} /> Copiar Chave PIX
              </button>
            </div>

            <div className="bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] p-3 rounded-md flex items-start gap-2 text-[12px] text-[var(--color-warning)]">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <p className="m-0 leading-relaxed">
                Apos realizar o pagamento pelo aplicativo do seu banco, clique no botao abaixo para confirmar.
              </p>
            </div>

            <div className="space-y-2">
              <button
                className="btn-primary w-full py-2.5"
                onClick={handleConfirmPayment}
                disabled={loading}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Ja realizei o pagamento'}
              </button>
              <button
                className="btn-secondary w-full py-2 text-[12px]"
                onClick={() => setStep(1)}
              >
                Voltar
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[var(--color-success-light)] border-2 border-[var(--color-success-border)] flex items-center justify-center mx-auto text-[var(--color-success)]">
              <CheckCircle size={32} />
            </div>
            <div>
              <h2 className="text-[1.25rem] font-semibold text-[var(--color-text-primary)] mb-1">
                Pagamento Confirmado
              </h2>
              <p className="text-[13px] text-[var(--color-text-secondary)]">
                Redirecionando para a sala de atendimento...
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-4">
              <Loader2 size={18} className="animate-spin text-[var(--color-brand)]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientPayment;
