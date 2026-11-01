import { useEffect, useState } from 'react';
import { ArrowDownToLine, CalendarDays, Download, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { api, dateInputValue, localDateBoundary, money } from '../lib/api.js';

function monthStart() {
  const date = new Date();
  return dateInputValue(new Date(date.getFullYear(), date.getMonth(), 1));
}

function today() {
  return dateInputValue();
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(today());
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    if (startDate && endDate && startDate > endDate) {
      setError('Tanggal awal tidak boleh melewati tanggal akhir.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const query = new URLSearchParams({
        ...(startDate ? { startDate: localDateBoundary(startDate) } : {}),
        ...(endDate ? { endDate: localDateBoundary(endDate, true) } : {}),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      const result = await api(`/reports/summary?${query}`);
      setReport(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function download() {
    if (startDate && endDate && startDate > endDate) {
      setError('Tanggal awal tidak boleh melewati tanggal akhir.');
      return;
    }
    setError('');
    try {
      const query = new URLSearchParams({
        ...(startDate ? { startDate: localDateBoundary(startDate) } : {}),
        ...(endDate ? { endDate: localDateBoundary(endDate, true) } : {}),
      });
      const blob = await api(`/reports/sales.csv?${query}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `laporan-penjualan-${startDate}-${endDate}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const maxRevenue = Math.max(...(report?.dailySales ?? []).map((item) => item.revenue), 1);
  return <div className="page-stack">
    <section className="report-toolbar"><div><p className="eyebrow">ANALISIS PENJUALAN</p><h2>Angka yang membantu Anda bergerak.</h2><p>Pantau performa dan stok toko pada rentang tanggal pilihan.</p></div><div className="report-actions"><label><CalendarDays size={16} /><input aria-label="Tanggal awal" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /><span>sampai</span><input aria-label="Tanggal akhir" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><button className="button button-quiet" onClick={load} disabled={busy}>{busy ? 'Memuat...' : 'Terapkan'}</button><button className="button button-primary" onClick={download}><Download size={16} />Unduh CSV</button></div></section>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <section className="metric-grid"><article className="metric-card metric-revenue"><div className="metric-label"><span>PENJUALAN BERSIH</span><span className="metric-icon"><TrendingUp size={17} /></span></div><strong>{money(report?.totalRevenue)}</strong><small>Total transaksi berstatus lunas</small></article><article className="metric-card"><div className="metric-label"><span>TRANSAKSI</span><span className="metric-icon metric-green"><ShoppingCart size={17} /></span></div><strong>{report?.transactionCount ?? '—'}</strong><small>Struk berhasil dibuat</small></article><article className="metric-card"><div className="metric-label"><span>RATA-RATA ORDER</span><span className="metric-icon metric-blue"><TrendingUp size={17} /></span></div><strong>{money(report?.averageOrderValue)}</strong><small>Nilai rata-rata per struk</small></article><article className="metric-card"><div className="metric-label"><span>STOK MENIPIS</span><span className="metric-icon metric-orange"><Package size={17} /></span></div><strong>{report?.lowStockProducts?.length ?? '—'}</strong><small>Produk perlu diperiksa</small></article></section>
    <div className="report-grid"><section className="panel report-chart-panel"><div className="section-heading"><div><p className="eyebrow">TREN HARIAN</p><h3>Penjualan per hari</h3></div><span className="chart-legend"><i />Pendapatan</span></div>{report?.dailySales?.length ? <div className="bar-chart">{report.dailySales.map((day) => <div className="bar-column" key={day.date} title={`${day.date}: ${money(day.revenue)}`}><div className="bar-track"><span style={{ height: `${Math.max((day.revenue / maxRevenue) * 100, 4)}%` }} /></div><small>{new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(`${day.date}T00:00:00`))}</small></div>)}</div> : <div className="chart-empty">Belum ada transaksi pada rentang tanggal ini.</div>}<div className="chart-caption"><span><ArrowDownToLine size={14} />Data dari transaksi lunas</span><span>{report?.dailySales?.length ?? 0} hari aktif</span></div></section>
      <section className="panel top-products-panel"><div className="section-heading"><div><p className="eyebrow">FAVORIT PELANGGAN</p><h3>Produk terlaris</h3></div><span className="subtle-count">TOP 5</span></div>{report?.topProducts?.length ? <div className="top-product-list">{report.topProducts.map((product, index) => <div className="top-product-row" key={product.productId}><span className={`rank rank-${index + 1}`}>{String(index + 1).padStart(2, '0')}</span><span className="top-product-name"><b>{product.productName}</b><small>{product.productSku} · {product.quantity} terjual</small></span><strong>{money(product.revenue)}</strong></div>)}</div> : <div className="chart-empty">Belum ada penjualan.</div>}</section></div>
    <section className="panel low-stock-panel"><div className="section-heading"><div><p className="eyebrow">PERLU PERHATIAN</p><h3>Stok hampir habis</h3></div><span className="low-stock-count">{report?.lowStockProducts?.length ?? 0} produk</span></div>{report?.lowStockProducts?.length ? <div className="low-stock-list">{report.lowStockProducts.map((product) => <div key={product.id}><span className="low-stock-dot" /><span><b>{product.name}</b><small>{product.sku}</small></span><strong>{product.stock} <small>/ {product.lowStockAt} min.</small></strong></div>)}</div> : <p className="all-stock-good">Semua produk berada di atas batas stok minimum.</p>}</section>
  </div>;
}