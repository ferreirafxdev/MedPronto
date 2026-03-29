import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, FileUser, PlayCircle } from 'lucide-react';

interface QueuedPatient {
  id: string;
  name: string;
  age: string;
  complaint: string;
  status: string;
}

const DoctorDashboard = () => {
  const { user, setConsultationRoomId } = useStore();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<QueuedPatient[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'doctor') {
      navigate('/doctor/login');
      return;
    }

    const fetchQueue = async () => {
      try {
        const resp = await axios.get('http://localhost:3001/api/queue');
        setQueue(resp.data);
      } catch (error) {
        console.error("Erro ao buscar fila", error);
      }
    };

    fetchQueue();
    // In a real app we would use Socket.io here to auto-refresh the queue
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  const takePatient = async () => {
    try {
      const resp = await axios.post('http://localhost:3001/api/take-patient', { doctorId: user?.id });
      if (resp.data.success) {
        const { patient } = resp.data;
        setConsultationRoomId(patient.id); // For simplicity, room is patient.id
        navigate(`/doctor/consultation/${patient.id}`);
      }
    } catch (error) {
      alert("A fila está vazia ou ocorreu um erro.");
      console.error(error);
    }
  };

  return (
    <div className="dashboard-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Painel Médico - {user?.name}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Gerencie seus atendimentos na fila do PS Online</p>
        </div>
        
        <button onClick={takePatient} className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.2rem', gap: '0.8rem', animation: 'pulse 2s infinite' }}>
          <PlayCircle size={24} /> Chamar Próximo da Fila
        </button>
      </div>

      <div className="glass-card" style={{ maxWidth: '100%', margin: '0' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Users size={28} color="var(--primary-color)" />
          <h3 style={{ margin: 0 }}>Fila de Espera ({queue.length})</h3>
        </div>

        {queue.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
             <FileUser size={64} opacity={0.5} style={{ marginBottom: '1rem' }} />
             <p>A fila está vazia no momento. Parabéns!</p>
          </div>
        ) : (
          <ul className="queue-list">
            {queue.map((p, i) => (
              <li key={p.id} className="queue-item" style={{ animationDelay: `${i * 0.1}s` }}>
                <div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{p.name} - {p.age} anos</span>
                    <span className="status-badge status-waiting">Na fila</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}><strong>Queixa:</strong> {p.complaint}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;
