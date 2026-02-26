import { useEffect, useState } from 'react';

const normalizeApiBase = (raw?: string): string => {
  const base = (raw ?? '').trim();
  if (!base) return '/api';
  const cleaned = base.replace(/\/+$/, '');
  if (cleaned.endsWith('/api') || cleaned.includes('/api/')) return cleaned;
  return `${cleaned}/api`;
};

type DbCheckResult =
  | { status: 'loading' }
  | { status: 'ok'; latencyMs: number }
  | { status: 'error'; message: string };

export default function DbCheckPage() {
  const [result, setResult] = useState<DbCheckResult>({ status: 'loading' });

  useEffect(() => {
    const apiBase = normalizeApiBase(import.meta.env.VITE_API_URL);
    fetch(`${apiBase}/health/db`)
      .then((r) => r.json())
      .then((data: { success?: boolean; latencyMs?: number; error?: string; message?: string }) => {
        if (data.success) {
          setResult({ status: 'ok', latencyMs: data.latencyMs ?? 0 });
        } else {
          setResult({ status: 'error', message: data.error || data.message || 'Falha na conexão' });
        }
      })
      .catch((e) => {
        setResult({ status: 'error', message: e?.message || 'Não foi possível conectar à API.' });
      });
  }, []);

  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      maxWidth: 420,
      margin: '2rem auto',
      padding: 24,
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,.1)',
    }}>
      <h1 style={{ fontSize: '1.25rem', color: '#333', marginBottom: 16 }}>
        Verificar conexão com o banco
      </h1>
      <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
        pdvconveniencia.vercel.app
      </p>
      {result.status === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="spinner" style={{
            width: 20,
            height: 20,
            border: '2px solid #eee',
            borderTopColor: '#333',
            borderRadius: '50%',
            animation: 'spin .8s linear infinite',
          }} />
          Verificando...
        </div>
      )}
      {result.status === 'ok' && (
        <div style={{ color: '#0a0', fontWeight: 500 }}>
          ✓ Banco de dados conectado
          <div style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
            Latência: {result.latencyMs} ms
          </div>
        </div>
      )}
      {result.status === 'error' && (
        <div style={{ color: '#c00', fontWeight: 500 }}>
          ✗ Falha na conexão
          <pre style={{
            background: '#f8f8f8',
            padding: 12,
            borderRadius: 4,
            overflow: 'auto',
            fontSize: 13,
            marginTop: 8,
          }}>
            {result.message}
          </pre>
          <p style={{ fontSize: 13, color: '#666', marginTop: 12 }}>
            Se o backend estiver em outro domínio, configure a variável <strong>VITE_API_URL</strong> no projeto Vercel (ex: https://seu-backend.vercel.app).
          </p>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
