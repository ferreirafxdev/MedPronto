import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, XCircle, CheckCircle, User, UserCheck, Calendar, ClipboardList, ShieldCheck, ArrowLeft } from 'lucide-react';
import apiClient from '../api/client';

const VerifyDocument = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
      setError(err.response?.data?.error || 'Codigo invalido ou documento nao encontrado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('code')) {
      handleVerify();
    }
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col items-center p-4 pt-8">
      <div className="w-full max-w-[540px]">
        {/* Navigation */}
        <div className="mb-4">
          <button onClick={() => navigate(-1)} className="btn-secondary py-1.5 px-3 text-[12px] gap-1">
            <ArrowLeft size={14} /> Voltar
          </button>
        </div>

        {/* Main Card */}
        <div className="medical-card p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-brand-light)] flex items-center justify-center mx-auto mb-3">
              <ShieldCheck size={22} className="text-[var(--color-brand)]" />
            </div>
            <h2 className="text-[1.25rem] font-semibold mb-1">Validador de Documentos</h2>
            <p className="text-[13px] text-[var(--color-text-secondary)]">
              Verifique a autenticidade de receitas, prontuarios e atestados digitais
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">
                Codigo de Validacao (Ex: MP-XXXXXXXX ou MP-R-XXXXXXXX)
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="medical-input pr-10"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Insira o codigo impresso no documento"
                />
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              </div>
            </div>

            <button className="btn-primary w-full py-2.5" disabled={loading} type="submit">
              {loading ? 'Verificando Autenticidade...' : 'Validar Documento'}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-[var(--color-error-light)] border border-[var(--color-error-border)] rounded-md text-center space-y-1">
              <XCircle size={24} className="text-[var(--color-error)] mx-auto" />
              <p className="text-[13px] font-semibold text-[var(--color-error)] m-0">{error}</p>
              <p className="text-[12px] text-[var(--color-text-muted)] m-0">
                Verifique se o codigo foi digitado corretamente.
              </p>
            </div>
          )}

          {/* Result Card */}
          {result && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-[var(--color-success-light)] border border-[var(--color-success-border)] rounded-md text-center space-y-1">
                <CheckCircle size={28} className="text-[var(--color-success)] mx-auto" />
                <h3 className="text-[14px] font-semibold text-[var(--color-success)] m-0">Documento Autentico</h3>
                <span className="badge badge-success mt-1">{result.type}</span>
              </div>

              <div className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] p-4 rounded-md space-y-3 text-[13px]">
                <div className="grid grid-cols-2 gap-3">
                  <Info icon={<User size={15} />} label="Paciente" value={result.document.patientName} />
                  <Info icon={<UserCheck size={15} />} label="Medico Responsavel" value={result.document.doctorName} />
                  <Info icon={<Calendar size={15} />} label="Data de Emissao" value={new Date(result.document.date).toLocaleDateString('pt-BR')} />
                  <Info icon={<ShieldCheck size={15} />} label="CRM do Medico" value={result.document.doctorCrm} />
                </div>

                <div className="pt-3 border-t border-[var(--color-border)] space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-[var(--color-text-muted)]">
                    <ClipboardList size={14} className="text-[var(--color-brand)]" /> Resumo do Documento
                  </div>
                  <p className="text-[13px] text-[var(--color-text-primary)] font-mono whitespace-pre-wrap leading-relaxed m-0 bg-white p-2.5 rounded border border-[var(--color-border)]">
                    {result.document.details}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Info = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <div className="text-[var(--color-brand)] mt-0.5">{icon}</div>
    <div>
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </span>
      <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{value}</span>
    </div>
  </div>
);

export default VerifyDocument;
