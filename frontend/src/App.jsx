import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ChartNoAxesCombined, Clock3, Coffee, LogOut, Package, ShoppingBasket, Store } from 'lucide-react';
import { api } from './lib/api.js';
import { useSession } from './store/session.js';
import LoginPage from './components/LoginPage.jsx';
import PosPage from './pages/PosPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import SalesPage from './pages/SalesPage.jsx';

const titleByPath = {
  '/pos': ['Kasir', 'Ruang transaksi'],
  '/products': ['Produk', 'Katalog & stok'],
  '/sales': ['Transaksi', 'Riwayat penjualan'],
  '/reports': ['Laporan', 'Performa toko'],
};

function Workspace() {
  const user = useSession((state) => state.user);
  const logout = useSession((state) => state.logout);
  const location = useLocation();
  const [date, setDate] = useState('');
  const [title, subtitle] = titleByPath[location.pathname] ?? titleByPath['/pos'];
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    setDate(new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()));
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/pos" className="brand-lockup"><span className="brand-mark"><Store size={19} /></span><span>KASA<span className="brand-dot">.</span></span></NavLink>
        <div className="store-switch"><span className="store-avatar">S</span><span><b>Studio Sore</b><small>Outlet utama</small></span><span className="store-live" /></div>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="main-nav">
          <NavLink to="/pos"><ShoppingBasket size={18} /><span>Kasir</span><kbd>⌘ 1</kbd></NavLink>
          <NavLink to="/sales"><Clock3 size={18} /><span>Transaksi</span></NavLink>
          {isAdmin && <>
            <p className="nav-caption nav-admin-caption">MANAJEMEN</p>
            <NavLink to="/products"><Package size={18} /><span>Produk & stok</span></NavLink>
            <NavLink to="/reports"><ChartNoAxesCombined size={18} /><span>Laporan</span></NavLink>
          </>}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-note"><span className="side-note-icon"><Coffee size={17} /></span><span><b>Hari yang produktif</b><small>Semoga toko ramai hari ini.</small></span></div>
          <div className="profile-row"><span className="profile-avatar">{user?.name?.slice(0, 1).toUpperCase()}</span><span className="profile-name"><b>{user?.name}</b><small>{isAdmin ? 'Administrator' : 'Kasir'}</small></span><button className="icon-button logout-button" title="Keluar" onClick={logout}><LogOut size={17} /></button></div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div><p className="topbar-date">{date}</p><h1>{title}<span>{subtitle}</span></h1></div><div className="topbar-right"><span className="connection-dot" />Sistem aktif<span className="topbar-avatar">{user?.name?.slice(0, 1).toUpperCase()}</span></div></header>
        <div className="page-content"><Routes>
          <Route path="/pos" element={<PosPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/products" element={isAdmin ? <ProductsPage /> : <Navigate to="/pos" replace />} />
          <Route path="/reports" element={isAdmin ? <ReportsPage /> : <Navigate to="/pos" replace />} />
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes></div>
      </main>
    </div>
  );
}

export default function App() {
  const token = useSession((state) => state.token);
  const user = useSession((state) => state.user);
  const setAuth = useSession((state) => state.setAuth);
  const logout = useSession((state) => state.logout);
  const [checking, setChecking] = useState(Boolean(token && !user));

  useEffect(() => {
    if (!token || user) return;
    api('/auth/me').then((result) => setAuth({ token, user: result.data }))
      .catch(() => logout()).finally(() => setChecking(false));
  }, [token, user, setAuth, logout]);

  if (checking) return <div className="boot-screen"><span className="brand-mark"><Store size={19} /></span>Menyiapkan ruang kerja...</div>;
  if (!token || !user) return <LoginPage />;
  return <Workspace />;
}