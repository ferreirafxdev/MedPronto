import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { Users, PlayCircle, TrendingUp, Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface QueuedPatient {
  id: string;
  name: string;
  age: string;
  complaint: string;
  status: string;
  created_at?: string;
}

const DoctorDashboard = () => {
  const { user, setConsultationRoomId } = useStore();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<QueuedPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalConsultations: 0, earnings: 0 });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'doctor') {
      navigate('/doctor/login');
      return;
    }
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [qResp, sResp] = await Promise.all([
        apiClient.get('/api/queue'),
        apiClient.get(`/api/doctor/stats/${user?.id}`)
      ]);
      if (qResp.data.success) setQueue(qResp.data.queue);
      if (sResp.data.success) setStats(sResp.data.stats);
    } catch (error) {
      console.error('Erro ao sincronizar dados', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 600);
  };

  const takePatient = async () => {
    try {
      setLoading(true);
      const resp = await apiClient.post('/api/take-patient', { doctorId: user?.id });
      if (resp.data.success) {
        setConsultationRoomId(resp.data.patient.id);
        navigate(`/doctor/consultation/${resp.data.patient.id}`);
      }
    } catch {
      alert('A fila esta vazia ou ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[960px] mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[1.375rem] font-semibold mb-0.5">Painel de Atendimento</h1>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Gerencie a fila do pronto atendimento online
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} className="btn-secondary py-2 px-3" title="Atualizar">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={takePatient}
            className="btn-primary py-2 px-4 text-[13px]"
            disabled={loading || queue.length === 0}
          >
            <PlayCircle size={16} />
            Chamar Proximo
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Fila de Espera" value={`${queue.length}`} sub="pacientes aguardando" color="brand" />
        <MetricCard label="Atendimentos Hoje" value={`${stats.totalConsultations}`} sub="consultas finalizadas" color="success" />
        <MetricCard label="Receita do Dia" value={`R$ ${stats.earnings}`} sub="R$ 25 por consulta" color="warning" />
        <MetricCard label="Tempo Medio" value="< 5 min" sub="estimativa de espera" color="secondary" />
      </div>

      {/* Queue Table */}
      <div className="medical-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Users size={17} className="text-[var(--color-brand)]" />
            <h3 className="text-[14px] font-semibold m-0">Fila de Espera</h3>
          </div>
          <span className="badge badge-info">{queue.length} paciente(s)</span>
        </div>

        {queue.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-[var(--color-text-muted)]">
            <Clock size={36} className="mb-2 opacity-30" />
            <p className="text-[13px] font-medium">Nenhum paciente na fila</p>
            <p className="text-[12px]">A fila sera atualizada automaticamente</p>
          </div>
        ) : (
          <table className="medical-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th>Paciente</th>
                <th>Idade</th>
                <th>Queixa</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((p, i) => (
                <tr key={p.id}>
                  <td className="text-center font-medium text-[var(--color-text-muted)]">{i + 1}</td>
                  <td className="font-medium">{p.name}</td>
                  <td className="text-[var(--color-text-secondary)]">{p.age} anos</td>
                  <td className="text-[var(--color-text-secondary)] max-w-[200px] truncate">{p.complaint}</td>
                  <td>
                    <span className={`badge ${p.status === 'in-consultation' ? 'badge-warning' : 'badge-info'}`}>
                      {p.status === 'in-consultation' ? 'Em atendimento' : 'Aguardando'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) => {
  const colorMap: Record<string, string> = {
    brand: 'text-[var(--color-brand)]',
    success: 'text-[var(--color-success)]',
    warning: 'text-[var(--color-warning)]',
    secondary: 'text-[var(--color-text-secondary)]',
  };
  return (
    <div className="medical-card p-4">
      <p className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-[1.375rem] font-bold ${colorMap[color] || ''} mb-0.5`}>{value}</p>
      <p className="text-[11px] text-[var(--color-text-muted)]">{sub}</p>
    </div>
  );
};

export default DoctorDashboard;
