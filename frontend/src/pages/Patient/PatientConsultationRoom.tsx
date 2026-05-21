import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { ShieldCheck, HeartPulse } from 'lucide-react';
import DailyVideo from '../../components/DailyVideo';
import { useStore } from '../../store/useStore';

/**
 * Sala de Consulta do Paciente
 * Design imersivo focado no atendimento e segurança.
 */
const PatientConsultationRoom = () => {
  const { roomId } = useParams();
  const { user } = useStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'active' | 'ended'>('active');
  const [dailyConfig, setDailyConfig] = useState<{url: string, token: string} | null>(null);

  useEffect(() => {
    // Busca as credenciais do Daily.co
    const fetchDailyToken = async () => {
      try {
        const res = await apiClient.post('/api/daily/token', {
          room: roomId,
          username: user?.name || 'Paciente',
          isDoctor: false
        });
        setDailyConfig({ url: res.data.url, token: res.data.token });
      } catch (err) {
        console.error("Erro ao obter token do Daily.co", err);
      }
    };
    
    if (user && roomId) {
       fetchDailyToken();
    }
  }, [roomId, user]);

  useEffect(() => {
    // Monitora se a consulta foi finalizada pelo médico no banco de dados
    const interval = setInterval(async () => {
      try {
        const r = await apiClient.get(`/api/patient/check-queue/${user?.id}`);
        // Se não estiver mais em atendimento, significa que foi encerrado
        if (!r.data.isActive) {
          setStatus('ended');
          clearInterval(interval);
          setTimeout(() => navigate('/patient/dashboard'), 4000);
        }
      } catch (e) { /* ignore */ }
    }, 5000);

    return () => clearInterval(interval);
  }, [roomId, navigate, user]);

  if (status === 'ended') {
    return (
      <div style={{ 
          height: '100vh', background: '#0f172a', display: 'flex', 
          alignItems: 'center', justifyContent: 'center', color: 'white', 
          textAlign: 'center', fontFamily: '"Inter", sans-serif' 
      }}>
        <div style={{ animation: 'scaleIn 0.5s ease' }}>
          <div style={{ 
              width: '100px', height: '100px', background: '#10b981', 
              borderRadius: '50%', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', margin: '0 auto 2rem', border: '6px solid rgba(16, 185, 129, 0.2)' 
          }}>
             <ShieldCheck size={50} />
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.03em' }}>Atendimento Concluído</h2>
          <p style={{ color: '#94a3b8', marginTop: '1rem', fontSize: '1.1rem' }}>
            O médico encerrou a sessão com sucesso.<br/>
            Seus documentos estarão disponíveis em instantes no seu perfil.
          </p>
          <div style={{ marginTop: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#64748b' }}>
             <div className="spinner-small" /> Redirecionando para o painel...
          </div>
        </div>
        <style>{`
            @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
            .spinner-small { width: 16px; height: 16px; border: 2px solid #334155; border-top-color: #10b981; border-radius: 50%; animation: spin 1s linear infinite; }
            @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ 
        height: '100vh', background: '#000', position: 'relative', 
        overflow: 'hidden', fontFamily: '"Inter", sans-serif' 
    }}>
      
      {/* Componente de Vídeo Daily.co */}
      <div style={{ width: '100%', height: '100%' }}>
         {dailyConfig ? (
             <DailyVideo roomUrl={dailyConfig.url} token={dailyConfig.token} />
         ) : (
             <div style={{ color: 'white', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>Carregando sala de vídeo...</div>
         )}
      </div>
      
      {/* Overlay de Segurança e Branding */}
      <div style={{ 
          position: 'absolute', top: '2rem', left: '2rem', zIndex: 10, 
          display: 'flex', alignItems: 'center', gap: '1rem', 
          background: 'rgba(15, 23, 42, 0.7)', padding: '0.75rem 1.25rem', 
          borderRadius: '1rem', backdropFilter: 'blur(12px)', 
          border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' 
      }}>
         <div style={{ 
             width: '32px', height: '32px', background: 'var(--accent)', 
             borderRadius: '50%', display: 'flex', alignItems: 'center', 
             justifyContent: 'center', color: 'white' 
         }}>
            <HeartPulse size={18} />
         </div>
         <div>
            <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: 800 }}>CONSULTA SEGURA</div>
            <div style={{ color: '#10b981', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>CRIPTOGRAFIA PONTA-A-PONTA</div>
         </div>
      </div>

      {/* Indicador de Tempo (Opcional para o paciente) */}
      <div style={{ 
          position: 'absolute', bottom: '2rem', right: '2rem', zIndex: 10,
          background: 'rgba(15, 23, 42, 0.7)', padding: '0.5rem 1rem', 
          borderRadius: '0.75rem', fontSize: '0.8rem', color: '#94a3b8',
          backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)'
      }}>
         Conectado como: <span style={{ color: 'white', fontWeight: 700 }}>{user?.name}</span>
      </div>
    </div>
  );
};

export default PatientConsultationRoom;
