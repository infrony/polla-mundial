'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden.'); return; }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Error al registrarse.'); setLoading(false); return; }
    const login = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
    setLoading(false);
    if (login?.error) router.push('/login');
    else router.push('/partidos');
  }

  async function handleGoogle() {
    await signIn('google', { callbackUrl: '/partidos' });
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo.png" alt="FIFA World Cup 2026" style={{ width: 72, height: 72, marginBottom: 8 }} />
          <span className="header-title">Polla Mundial</span>
          <span className="header-subtitle">EEUU · México · Canadá 2026</span>
        </div>

        <h2 className="auth-form-title">Crear Cuenta</h2>

        <button className="btn-google" onClick={handleGoogle} type="button">
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3L37.5 9.5C33.9 6.2 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3L37.5 9.5C33.9 6.2 29.2 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.4-5.1L31.4 34c-2.1 1.5-4.7 2.3-7.4 2.3-5.3 0-9.8-3.6-11.4-8.5L6 32.8C9.3 39.5 16.1 44 24 44z"/><path fill="#1976D2" d="M43.9 20H24v8h11.3c-.9 2.6-2.6 4.7-4.9 6.1l6 4.9C40.4 35.5 44 30.2 44 24c0-1.3-.1-2.7-.1-4z"/></svg>
          Registrarse con Google
        </button>
        <div className="auth-divider">O</div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre completo</label>
            <input className="form-input" type="text" placeholder="Tu nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <input className="form-input" type="email" placeholder="tu@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input className="form-input" type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Confirmar contraseña</label>
            <input className="form-input" type="password" placeholder="Repite tu contraseña" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Registrando...' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="auth-footer">
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
}
