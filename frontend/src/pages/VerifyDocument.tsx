import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileSearch, Search, XCircle, CheckCircle, User, UserCheck, Calendar, ClipboardList, ShieldCheck } from 'lucide-react';
import apiClient from '../api/client';

const VerifyDocument = () => {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code) return;
    
    setLoading(true); 
    setError(''); 
    setResult(null);
    
    try {
      const resp = await apiClient.get(`/api/validate-document/${code.trim().toUpperCase()}`);
      setResult(resp.data);
    } catch (err: any) { 
      setError(err.response?.data?.error || 'Código inválido ou documento não encontrado.'); 
    } finally { 
      setLoading(false); 
    }
  };

  // Auto-verify if code is present in URL
  useEffect(() => {
    if (searchParams.get('code')) {
      handleVerify();
    }
  }, []);

  return (
    <div className="auth-container">
      <div className="premium-card animate-fade-in" style={{ maxWidth: '600px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="logo-icon" style={{ margin: '0 auto 1rem auto', width: '48px', height: '48px' }}>
            <ShieldCheck size={28} color="white" />
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Validador de Documentos</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Garanta a autenticidade de receitas, prontuários e atestados emitidos pela plataforma MedPronto.
          </p>
        </div>

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy-light)', marginBottom: '0.5rem', display: 'block' }}>
              Código de Validação (Ex: MP-XXXXXXXX ou MP-R-XXXXXXXX)
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="form-control" 
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
                placeholder="Insira o código impresso no documento..." 
                style={{ paddingRight: '3rem', height: '50px' }} 
              />
              <Search size={20} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
            </div>
          </div>
          <button className="btn btn-primary btn-full btn-lg" disabled={loading} type="submit">
            {loading ? "Verificando Autenticidade..." : "Validar Documento"}
          </button>
        </form>

        {error && (
          <div className="animate-fade-in" style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <XCircle size={32} color="var(--coral)" style={{ marginBottom: '0.5rem', margin: '0 auto 0.5rem auto' }} />
            <p style={{ color: 'var(--coral)', fontWeight: 600, margin: 0 }}>{error}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              Verifique se digitou o código corretamente ou se o documento é legítimo.
            </p>
          </div>
        )}

        {result && (
          <div className="animate-fade-in" style={{ marginTop: '2rem' }}>
            <div style={{ padding: '1.25rem', background: 'var(--accent-ultra-light)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-lg)', textAlign: 'center', marginBottom: '1.5rem' }}>
              <CheckCircle size={40} color="var(--accent)" style={{ marginBottom: '0.5rem', margin: '0 auto 0.5rem auto' }} />
              <h3 style={{ color: 'var(--accent)', margin: 0, fontSize: '1.25rem' }}>Documento Autêntico</h3>
              <div className="badge" style={{ marginTop: '0.5rem' }}>{result.type}</div>
            </div>

            <div className="premium-card" style={{ padding: '1.5rem', background: 'var(--bg-subtle)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <Info icon={<User size={18} />} label="Paciente" value={result.document.patientName} />
                <Info icon={<UserCheck size={18} />} label="Médico Responsável" value={result.document.doctorName} />
                <Info icon={<Calendar size={18} />} label="Data de Emissão" value={new Date(result.document.date).toLocaleDateString('pt-BR')} />
                <Info icon={<Calendar size={18} />} label="CRM do Médico" value={result.document.doctorCrm} />
              </div>
              
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <ClipboardList size={20} color="var(--accent)" />
                    <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                            Resumo do Documento
                        </span>
                        <p style={{ color: 'var(--text-heading)', fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                            {result.document.details}
                        </p>
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Info = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
    <div style={{ color: 'var(--accent)', marginTop: '0.2rem' }}>{icon}</div>
    <div>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.1rem' }}>
        {label}
      </span>
      <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--navy-dark)' }}>{value}</span>
    </div>
  </div>
);

export default VerifyDocument;
