import { useState } from 'react';
import { ArrowRight, Coffee, LockKeyhole, Mail, Store } from 'lucide-react';
import { api } from '../lib/api.js';
import { useSession } from '../store/session.js';

const demoAccounts = [
  { role: 'Admin', email: 'admin@kasir.local', password: 'Admin123!' },
  { role: 'Kasir', email: 'kasir@kasir.local', password: 'Kasir123!' },
];

export default function LoginPage() {
  const setAuth = useSession((state) => state.setAuth);
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: 'admin@kasir.local', password: 'Admin123!' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await api(`/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST', body: JSON.stringify(form),
      });
      setAuth(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-art" aria-label="Kasa Point of Sale">
        <div className="brand-lockup"><span className="brand-mark"><Store size={19} /></span><span>KASA<span className="brand-dot">.</span></span></div>
        <div className="art-copy">
          <p className="eyebrow light-eyebrow">POINT OF SALE · 01</p>
          <h1>Transaksi rapi.<br /><em>Bisnis bertumbuh.</em></h1>
          <p>Semua yang dibutuhkan untuk melayani lebih cepat dan memahami toko lebih baik.</p>
        </div>
        <div className="art-stamp"><Coffee size={17} /><span>BUILT FOR THE DAILY RUSH</span></div>
      </section>
      <section className="login-panel">
        <div className="login-mobile-brand"><span className="brand-mark"><Store size={19} /></span><span>KASA<span className="brand-dot">.</span></span></div>
        <div className="login-form-wrap">
          <p className="eyebrow">RUANG KERJA TOKO</p>
          <h2>{isRegister ? 'Buat akun kasir' : 'Selamat datang kembali'}</h2>
          <p className="login-subtitle">{isRegister ? 'Daftar untuk mulai mengelola transaksi.' : 'Masuk untuk melanjutkan aktivitas toko.'}</p>
          <form onSubmit={submit} className="login-form">
            {isRegister && <label>Nama lengkap<input required minLength="2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nama Anda" /></label>}
            <label>Email<div className="input-icon"><Mail size={17} /><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="nama@toko.id" /></div></label>
            <label>Password<div className="input-icon"><LockKeyhole size={17} /><input required minLength="8" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Minimal 8 karakter" /></div></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary login-submit" disabled={busy}>{busy ? 'Memproses...' : isRegister ? 'Buat akun' : 'Masuk ke kasir'}<ArrowRight size={17} /></button>
          </form>
          <p className="login-toggle">{isRegister ? 'Sudah punya akun?' : 'Belum terdaftar?'} <button onClick={() => { setIsRegister(!isRegister); setError(''); }}>{isRegister ? 'Masuk' : 'Daftar kasir'}</button></p>
          {!isRegister && <div className="demo-hint">
            <span>MASUK DENGAN AKUN DEMO</span>
            <div className="demo-accounts">
              {demoAccounts.map((account) => (
                <button
                  className="demo-account"
                  key={account.role}
                  type="button"
                  aria-label={`Gunakan akun demo ${account.role}`}
                  onClick={() => {
                    setForm({ ...form, email: account.email, password: account.password });
                    setError('');
                  }}
                >
                  <b>{account.role}</b>
                  <code>{account.email} · {account.password}</code>
                </button>
              ))}
            </div>
          </div>}
        </div>
        <span className="login-footer">KASA POS · WORKSPACE 2026</span>
      </section>
    </main>
  );
}