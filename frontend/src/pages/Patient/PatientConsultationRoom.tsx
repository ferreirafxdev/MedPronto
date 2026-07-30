import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { ShieldCheck, HeartPulse, FileText, ClipboardList, Download, CheckCircle2 } from 'lucide-react';
import VideoSDKVideo from '../../components/VideoSDKVideo';
import { useStore } from '../../store/useStore';
import { io, Socket } from 'socket.io-client';

interface ConsultationDocs {
  atestado?: { code: string; content: string; daysOff: number; cid?: string };
  consultation?: { code: string; notes: string; prescriptions: string; exams: string };
  doctorName?: string;
}

/**
 * Sala de Consulta do Paciente — VideoSDK WebRTC
 * 
 * Layout: Vídeo do médico em fullscreen, self-view no canto superior esquerdo.
 * Finalização: Recebe evento WebSocket em tempo real do médico → mostra documentos instantaneamente.
 */
const PatientConsultationRoom = () => {
  const { roomId } = useParams();
  const { user } = useStore();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'active' | 'ended'>('active');
  const [doctorName, setDoctorName] = useState('Médico');
  const [consultationDocs, setConsultationDocs] = useState<ConsultationDocs | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(8);

  const socketRef = useRef<Socket | null>(null);

  // ─── Conecta ao WebSocket e entra na sala ───
  useEffect(() => {
    if (!user || !roomId) return;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const socket = io(apiUrl, {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Patient WS] Conectado:', socket.id);
      socket.emit('join-room', { roomId, role: 'patient' });
    });

    // ─── EVENTO PRINCIPAL: Consulta Finalizada pelo Médico ───
    socket.on('consultation-ended', (data: ConsultationDocs) => {
      console.log('[Patient WS] Consulta encerrada pelo médico:', data);
      setConsultationDocs(data);
      setStatus('ended');
      if (data.doctorName) setDoctorName(data.doctorName);
    });

    socket.on('disconnect', () => {
      console.log('[Patient WS] Desconectado');
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, user]);

  // ─── Busca nome do médico ao montar ───
  useEffect(() => {
    const fetchDoctorName = async () => {
      try {
        const r = await apiClient.get(`/api/patient/check-queue/${user?.id}`);
        if (r.data.isActive && r.data.doctorName) {
          setDoctorName(r.data.doctorName);
        }
      } catch (e) { /* ignora */ }
    };
    if (user && roomId) fetchDoctorName();
  }, [roomId, user]);

  // ─── Countdown de redirecionamento após finalização ───
  useEffect(() => {
    if (status !== 'ended') return;
    const interval = setInterval(() => {
      setRedirectCountdown(n => {
        if (n <= 1) {
          clearInterval(interval);
          navigate('/patient/dashboard');
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, navigate]);

  // ─────── TELA DE CONSULTA ENCERRADA ───────
  if (status === 'ended') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #042f2e 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Inter", sans-serif', padding: '1.5rem'
      }}>
        <div style={{
          maxWidth: '560px', width: '100%',
          animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
          {/* Ícone de Sucesso */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '100px', height: '100px',
              background: 'linear-gradient(135deg, #059669, #10b981)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 0 50px rgba(16, 185, 129, 0.4)',
              border: '4px solid rgba(16, 185, 129, 0.2)'
            }}>
              <ShieldCheck size={52} color="white" />
            </div>
            <h2 style={{
              fontSize: '2rem', fontWeight: 900,
              color: 'white', margin: 0,
              letterSpacing: '-0.03em'
            }}>
              Atendimento Concluído!
            </h2>
            <p style={{ color: '#94a3b8', marginTop: '0.5rem', fontSize: '1rem' }}>
              Dr(a). {consultationDocs?.doctorName || doctorName} finalizou sua consulta
            </p>
          </div>

          {/* Documentos Disponíveis */}
          {(consultationDocs?.consultation || consultationDocs?.atestado) && (
            <div style={{
              background: 'rgba(30, 41, 59, 0.7)',
              backdropFilter: 'blur(16px)',
              borderRadius: '1.25rem',
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
              marginBottom: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}>
              <div style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', gap: '0.6rem'
              }}>
                <CheckCircle2 size={18} color="#10b981" />
                <span style={{ color: 'white', fontWeight: 800, fontSize: '0.9rem' }}>
                  DOCUMENTOS GERADOS AUTOMATICAMENTE
                </span>
              </div>

              {/* Evolução/Receita */}
              {consultationDocs.consultation && (
                <div style={{ padding: '1.25rem', borderBottom: consultationDocs.atestado ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '0.75rem',
                      background: 'rgba(37, 99, 235, 0.15)',
                      border: '1px solid rgba(37, 99, 235, 0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <ClipboardList size={22} color="#60a5fa" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'white', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                        Evolução Clínica e Receituário
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                        Código: <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>
                          {consultationDocs.consultation.code}
                        </span>
                      </div>
                      {consultationDocs.consultation.prescriptions && (
                        <div style={{
                          background: 'rgba(255,255,255,0.04)', borderRadius: '0.5rem',
                          padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: '#cbd5e1',
                          lineHeight: 1.5, fontFamily: 'monospace',
                          maxHeight: '80px', overflowY: 'auto'
                        }}>
                          {consultationDocs.consultation.prescriptions.substring(0, 200)}
                          {consultationDocs.consultation.prescriptions.length > 200 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Atestado */}
              {consultationDocs.atestado && (
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '0.75rem',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <FileText size={22} color="#34d399" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'white', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                        Atestado Médico — {consultationDocs.atestado.daysOff} dia(s) de afastamento
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                        Código: <span style={{ color: '#34d399', fontFamily: 'monospace' }}>
                          {consultationDocs.atestado.code}
                        </span>
                        {consultationDocs.atestado.cid && (
                          <span style={{ marginLeft: '0.5rem', color: '#94a3b8' }}>
                            · CID: {consultationDocs.atestado.cid}
                          </span>
                        )}
                      </div>
                      {consultationDocs.atestado.content && (
                        <div style={{
                          background: 'rgba(16, 185, 129, 0.06)', borderRadius: '0.5rem',
                          padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: '#a7f3d0',
                          lineHeight: 1.5, border: '1px solid rgba(16, 185, 129, 0.15)'
                        }}>
                          {consultationDocs.atestado.content.substring(0, 150)}
                          {consultationDocs.atestado.content.length > 150 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botão Ver Histórico Completo */}
          <button
            onClick={() => navigate('/patient/profile')}
            style={{
              width: '100%', marginBottom: '0.75rem',
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              color: 'white', border: 'none',
              padding: '0.95rem', borderRadius: '0.85rem',
              fontWeight: 800, fontSize: '0.95rem',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: '0 8px 20px rgba(37,99,235,0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <Download size={18} /> Ver Todos os Meus Documentos
          </button>

          {/* Redirecionamento automático */}
          <div style={{
            textAlign: 'center', marginTop: '1rem',
            color: '#475569', fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
          }}>
            <div style={{
              width: '14px', height: '14px', borderRadius: '50%',
              border: '2px solid #334155', borderTopColor: '#10b981',
              animation: 'spin 1s linear infinite'
            }} />
            Redirecionando para o painel em <strong style={{ color: '#38bdf8' }}>{redirectCountdown}s</strong>...
          </div>
        </div>

        <style>{`
          @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // ─────── TELA PRINCIPAL DE CONSULTA ───────
  return (
    <div style={{
      height: '100vh', background: '#000',
      position: 'relative', overflow: 'hidden',
      fontFamily: '"Inter", sans-serif'
    }}>
      {/* Componente de Vídeo VideoSDK WebRTC */}
      <div style={{ width: '100%', height: '100%' }}>
        {roomId ? (
          <VideoSDKVideo
            roomId={roomId}
            role="patient"
            userName={user?.name || 'Paciente'}
            onLeave={() => navigate('/patient/dashboard')}
            onMeetingEnd={() => {
              // Se o meeting encerrar pelo SDK, também finaliza a tela
              if (status !== 'ended') {
                setStatus('ended');
              }
            }}
          />
        ) : (
          <div style={{ color: 'white', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            Carregando sala de vídeo...
          </div>
        )}
      </div>

      {/* Overlay de Branding (sobre o vídeo, abaixo do self-view PiP) */}
      {/* O self-view já está no canto superior esquerdo DENTRO do VideoSDKVideo */}
      {/* Este overlay fica na direita do topo para não colidir com o PiP */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        zIndex: 25,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        background: 'rgba(9, 13, 22, 0.8)',
        padding: '0.6rem 1rem',
        borderRadius: '0.85rem',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          width: '28px', height: '28px',
          background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <HeartPulse size={15} color="white" />
        </div>
        <div>
          <div style={{ color: 'white', fontSize: '0.75rem', fontWeight: 800 }}>CONSULTA SEGURA</div>
          <div style={{ color: '#10b981', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            Dr(a). {doctorName}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientConsultationRoom;
