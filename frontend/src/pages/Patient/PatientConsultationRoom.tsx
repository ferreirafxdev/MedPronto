import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { ShieldCheck, FileText, ClipboardList, Download, CheckCircle2, Loader2 } from 'lucide-react';
import LiveKitVideo from '../../components/LiveKitVideo';
import { useStore } from '../../store/useStore';
import { io, Socket } from 'socket.io-client';

interface ConsultationDocs {
  atestado?: { code: string; content: string; daysOff: number; cid?: string };
  consultation?: { code: string; notes: string; prescriptions: string; exams: string };
  doctorName?: string;
}

const PatientConsultationRoom = () => {
  const { roomId } = useParams();
  const { user } = useStore();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'active' | 'ended'>('active');
  const [doctorName, setDoctorName] = useState('Medico');
  const [consultationDocs, setConsultationDocs] = useState<ConsultationDocs | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(8);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user || !roomId) return;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const socket = io(apiUrl, {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;
    socket.on('connect', () => {
      socket.emit('join-room', { roomId, role: 'patient' });
    });
    socket.on('consultation-ended', (data: ConsultationDocs) => {
      setConsultationDocs(data);
      setStatus('ended');
      if (data.doctorName) setDoctorName(data.doctorName);
    });
    return () => { socket.disconnect(); };
  }, [roomId, user]);

  useEffect(() => {
    const fetchDoctorName = async () => {
      try {
        const r = await apiClient.get(`/api/patient/check-queue/${user?.id}`);
        if (r.data.isActive && r.data.doctorName) setDoctorName(r.data.doctorName);
      } catch { /* ignore */ }
    };
    if (user && roomId) fetchDoctorName();
  }, [roomId, user]);

  useEffect(() => {
    if (status !== 'ended') return;
    const interval = setInterval(() => {
      setRedirectCountdown(n => {
        if (n <= 1) { clearInterval(interval); navigate('/patient/dashboard'); return 0; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, navigate]);

  if (status === 'ended') {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center p-4">
        <div className="max-w-[520px] w-full animate-slide-up">
          {/* Success Icon */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[var(--color-success-light)] border-2 border-[var(--color-success-border)] flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} className="text-[var(--color-success)]" />
            </div>
            <h2 className="text-[1.5rem] font-semibold text-[var(--color-text-primary)] mb-1">Atendimento Concluido</h2>
            <p className="text-[14px] text-[var(--color-text-secondary)]">Dr(a). {consultationDocs?.doctorName || doctorName} finalizou sua consulta</p>
          </div>

          {/* Documents */}
          {(consultationDocs?.consultation || consultationDocs?.atestado) && (
            <div className="medical-card overflow-hidden mb-4">
              <div className="p-3 border-b border-[var(--color-border)] flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[var(--color-success)]" />
                <span className="text-[13px] font-semibold">Documentos Emitidos</span>
              </div>

              {consultationDocs?.consultation && (
                <div className="p-4 border-b border-[var(--color-border)]">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--color-brand-light)] flex items-center justify-center flex-shrink-0">
                      <ClipboardList size={16} className="text-[var(--color-brand)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold mb-0.5">Evolucao Clinica e Receituario</div>
                      <div className="text-[11px] text-[var(--color-text-muted)] mb-2">
                        Codigo: <span className="font-mono text-[var(--color-brand)]">{consultationDocs.consultation.code}</span>
                      </div>
                      {consultationDocs.consultation.prescriptions && (
                        <div className="bg-[var(--color-bg-subtle)] rounded-md p-2.5 text-[12px] text-[var(--color-text-secondary)] font-mono max-h-[60px] overflow-hidden">
                          {consultationDocs.consultation.prescriptions.substring(0, 150)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {consultationDocs?.atestado && (
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--color-success-light)] flex items-center justify-center flex-shrink-0">
                      <FileText size={16} className="text-[var(--color-success)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold mb-0.5">Atestado Medico — {consultationDocs.atestado.daysOff} dia(s)</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        Codigo: <span className="font-mono text-[var(--color-success)]">{consultationDocs.atestado.code}</span>
                        {consultationDocs.atestado.cid && <span className="ml-2">CID: {consultationDocs.atestado.cid}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <button onClick={() => navigate('/patient/profile')} className="btn-primary w-full py-2.5 mb-3">
            <Download size={16} /> Ver Todos os Documentos
          </button>

          <div className="text-center text-[12px] text-[var(--color-text-muted)] flex items-center justify-center gap-2">
            <Loader2 size={12} className="animate-spin" />
            Redirecionando em {redirectCountdown}s...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="consultation-fullscreen bg-[#111827]">
      <div className="w-full h-full">
        {roomId ? (
          <LiveKitVideo roomId={roomId} role="patient" userName={user?.name || 'Paciente'} onLeave={() => navigate('/patient/dashboard')} />
        ) : (
          <div className="flex items-center justify-center h-full text-[#9CA3AF]">
            <Loader2 size={28} className="animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientConsultationRoom;
