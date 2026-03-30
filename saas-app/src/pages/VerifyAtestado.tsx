import React, { useState } from 'react';
import axios from 'axios';
import { Search, CheckCircle, XCircle, FileText, Calendar, User, UserCheck } from 'lucide-react';

const VerifyAtestado = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const resp = await axios.get(`${apiUrl}/api/validate-atestado/${code.trim().toUpperCase()}`);
      setResult(resp.data.atestado);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao validar código. Verifique se digitou corretamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-card" style={{ maxWidth: '600px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary-color)' }}>
            <FileText size={32} />
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Validação de Atestado</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Verifique a autenticidade de atestados emitidos pela MedPronto.</p>
        </div>

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label>Código do Atestado (Ex: MP-XXXXXXXX)</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="form-control" 
                value={code} 
                onChange={(e) => setCode(e.target.value)}
                placeholder="Informe o código de validação..."
                style={{ paddingRight: '3rem' }}
              />
              <Search 
                size={20} 
                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} 
              />
            </div>
          </div>
          <button className="btn btn-primary btn-full" disabled={loading} type="submit">
            {loading ? "Verificando..." : "Validar Autenticidade"}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '1rem', textAlign: 'center', animation: 'fadeIn 0.4s' }}>
            <XCircle size={40} color="#ef4444" style={{ marginBottom: '1rem' }} />
            <p style={{ color: '#ef4444', fontWeight: 600 }}>{error}</p>
          </div>
        )}

        {result && (
          <div style={{ marginTop: '2rem', animation: 'slideUp 0.5s ease-out' }}>
            <div style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '1rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              <CheckCircle size={40} color="#10b981" style={{ marginBottom: '1rem' }} />
              <h3 style={{ color: '#10b981', margin: 0 }}>Atestado Autêntico</h3>
              <p style={{ color: '#064e3b', fontSize: '0.9rem', marginTop: '0.5rem' }}>Este documento foi emitido oficialmente por nossa plataforma.</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.5)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <User size={20} color="var(--primary-color)" />
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Paciente</span>
                    <span style={{ fontWeight: 600 }}>{result.patient_name}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <UserCheck size={20} color="var(--primary-color)" />
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Médico Responsável</span>
                    <span style={{ fontWeight: 600 }}>{result.doctor_name}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Calendar size={20} color="var(--primary-color)" />
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Data da Emissão</span>
                    <span style={{ fontWeight: 600 }}>{new Date(result.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Calendar size={20} color="var(--primary-color)" />
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Dias de Afastamento</span>
                    <span style={{ fontWeight: 600 }}>{result.days_off} dia(s)</span>
                  </div>
                </div>
              </div>
              
              {result.cid && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                   <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>CID-10: </span>
                   <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{result.cid}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyAtestado;
