import React, { useState } from 'react';
import { FileText, Search, XCircle, CheckCircle, User, UserCheck, Calendar } from 'lucide-react';
import apiClient from '../api/client';

const VerifyAtestado = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const resp = await apiClient.get(`/api/validate-atestado/${code.trim().toUpperCase()}`);
      setResult(resp.data.atestado);
    } catch (err: any) { setError(err.response?.data?.error || 'Erro ao validar código.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-container">
      <div className="glass-card" style={{ maxWidth: '520px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div className="icon-wrapper" style={{ background: 'var(--violet-light)', margin: '0 auto 0.85rem auto' }}>
            <FileText size={26} color="var(--violet)" />
          </div>
          <h2 style={{ fontSize: '1.45rem', marginBottom: '0.3rem' }}>Validação de Atestado</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Verifique a autenticidade de atestados emitidos pela MedPronto.</p>
        </div>
        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label>Código do Atestado (Ex: MP-XXXXXXXX)</label>
            <div style={{ position: 'relative' }}>
              <input type="text" className="form-control" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Informe o código..." style={{ paddingRight: '2.5rem' }} />
              <Search size={16} style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
            </div>
          </div>
          <button className="btn btn-primary btn-full" disabled={loading} type="submit" style={{ height: '44px' }}>
            {loading ? "Verificando..." : "Validar Autenticidade"}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: '1.25rem', padding: '1.1rem', background: 'var(--coral-light)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 'var(--radius-lg)', textAlign: 'center', animation: 'fadeInUp 0.3s' }}>
            <XCircle size={32} color="var(--coral)" style={{ marginBottom: '0.5rem' }} />
            <p style={{ color: 'var(--coral)', fontWeight: 600, margin: 0, fontSize: '0.9rem' }}>{error}</p>
          </div>
        )}

        {result && (
          <div style={{ marginTop: '1.25rem', animation: 'fadeInUp 0.4s' }}>
            <div style={{ padding: '1.1rem', background: 'var(--mint-light)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-lg)', textAlign: 'center', marginBottom: '0.85rem' }}>
              <CheckCircle size={32} color="var(--mint)" style={{ marginBottom: '0.4rem' }} />
              <h3 style={{ color: 'var(--mint-dark)', margin: 0, fontSize: '1.05rem' }}>Atestado Autêntico</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>Este documento foi emitido oficialmente por nossa plataforma.</p>
            </div>
            <div style={{ background: 'var(--bg-subtle)', padding: '1.1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Info icon={<User size={16} />} label="Paciente" value={result.patient_name} />
                <Info icon={<UserCheck size={16} />} label="Médico" value={result.doctor_name} />
                <Info icon={<Calendar size={16} />} label="Emissão" value={new Date(result.created_at).toLocaleDateString('pt-BR')} />
                <Info icon={<Calendar size={16} />} label="Afastamento" value={`${result.days_off} dia(s)`} />
              </div>
              {result.cid && (
                <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                   <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>CID-10: </span>
                   <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{result.cid}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Info = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
    <div style={{ color: 'var(--accent)', marginTop: '0.1rem' }}>{icon}</div>
    <div>
      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)' }}>{value}</span>
    </div>
  </div>
);

export default VerifyAtestado;
