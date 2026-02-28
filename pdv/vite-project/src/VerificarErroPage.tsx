import { useEffect, useState } from 'react';

const apiBase = (() => {
  const raw = (import.meta.env.VITE_API_URL ?? '').trim();
  if (!raw) return '/api';
  const cleaned = raw.replace(/\/+$/, '');
  if (cleaned.endsWith('/api') || cleaned.includes('/api/')) return cleaned;
  return `${cleaned}/api`;
})();

type ConfigStatus = {
  jwtSecretSet?: boolean;
  databaseUrlSet?: boolean;
  directUrlSet?: boolean;
  nodeEnv?: string;
} | null;

export default function VerificarErroPage() {
  const [config, setConfig] = useState<ConfigStatus>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [loginResult, setLoginResult] = useState<{ status: number; body: string } | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    fetch(`${apiBase}/health/config`)
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig({}))
      .finally(() => setConfigLoading(false));
  }, []);

  function testarLogin() {
    setLoginLoading(true);
    setLoginResult(null);
    fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@teste.com', senha: 'admin123' }),
    })
      .then(async (r) => {
        const text = await r.text();
        try {
          const parsed = JSON.parse(text);
          setLoginResult({ status: r.status, body: JSON.stringify(parsed, null, 2) });
        } catch {
          setLoginResult({ status: r.status, body: text || '(vazio)' });
        }
      })
      .catch((e) => {
        setLoginResult({ status: 0, body: e?.message ?? 'Erro de rede' });
      })
      .finally(() => setLoginLoading(false));
  }

  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      maxWidth: 560,
      margin: '2rem auto',
      padding: 24,
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,.1)',
    }}>
      <h1 style={{ fontSize: '1.25rem', color: '#333', marginBottom: 8 }}>
        Verificar erro do login
      </h1>
      <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
        Confira a configuração e a resposta real da API ao tentar fazer login.
      </p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Variáveis de ambiente</h2>
        {configLoading && <p style={{ color: '#666' }}>Carregando…</p>}
        {!configLoading && config && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ padding: '6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: config.jwtSecretSet ? '#0a0' : '#c00' }} />
              JWT_SECRET {config.jwtSecretSet ? 'definido' : 'não definido'}
            </li>
            <li style={{ padding: '6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: config.databaseUrlSet ? '#0a0' : '#c00' }} />
              DATABASE_URL {config.databaseUrlSet ? 'definido' : 'não definido'}
            </li>
            <li style={{ padding: '6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: config.directUrlSet ? '#0a0' : '#f80' }} />
              DIRECT_URL {config.directUrlSet ? 'definido' : 'não definido (recomendado para migrações)'}
            </li>
            <li style={{ padding: '6px 0', fontSize: 14, color: '#666' }}>
              NODE_ENV: {config.nodeEnv ?? '—'}
            </li>
          </ul>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Teste de login</h2>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
          Envia <code>admin@teste.com</code> / <code>admin123</code> para a API e mostra a resposta.
        </p>
        <button
          type="button"
          onClick={testarLogin}
          disabled={loginLoading}
          style={{
            padding: '10px 16px',
            background: '#333',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: loginLoading ? 'not-allowed' : 'pointer',
            fontSize: 14,
          }}
        >
          {loginLoading ? 'Testando…' : 'Testar login'}
        </button>
        {loginResult && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, marginBottom: 6 }}>
              <strong>Status HTTP:</strong> {loginResult.status}
            </p>
            <pre style={{
              background: '#f5f5f5',
              padding: 12,
              borderRadius: 6,
              overflow: 'auto',
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {loginResult.body}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
