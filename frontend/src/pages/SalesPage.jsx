import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, CalendarDays, Printer, ReceiptText, X } from 'lucide-react';
import { api, dateTime, money } from '../lib/api.js';

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const query = new URLSearchParams({ page: String(page), limit: '12', ...(startDate ? { startDate } : {}), ...(endDate ? { endDate: `${endDate}T23:59:59.999` } : {}) });
      const result = await api(`/sales?${query}`);
      setSales(result.data);
      setMeta(result.meta);
      setError('');
    } catch (requestError) { setError(requestError.message); }
  }

  useEffect(() => { load(); }, [page, startDate, endDate]);

  return <div className="page-stack">
    <section className="page-intro"><div><p className="eyebrow">JEJAK PENJUALAN</p><h2>Setiap transaksi tercatat.</h2><p>Lihat detail pembayaran dan cetak ulang struk kapan saja.</p></div><span className="history-count"><ReceiptText size={17} />{meta.total} transaksi</span></section>
    <section className="panel table-panel"><div className="table-toolbar"><label className="date-filter"><CalendarDays size={16} /><input aria-label="Dari tanggal" type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} /><span>sampai</span><input aria-label="Sampai tanggal" type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} /></label><span className="table-count">Terbaru lebih dulu</span></div>{error && <p className="inline-error table-error">{error}</p>}<div className="table-scroll"><table><thead><tr><th>NO. STRUK</th><th>WAKTU</th><th>KASIR</th><th>ITEM</th><th>PEMBAYARAN</th><th>TOTAL</th><th /></tr></thead><tbody>{sales.map((sale) => <tr key={sale.id}><td><button className="receipt-link" onClick={() => setSelected(sale)}>{sale.receiptNumber}</button></td><td>{dateTime(sale.createdAt)}</td><td>{sale.cashier?.name}</td><td>{sale.items.reduce((sum, item) => sum + item.quantity, 0)} item</td><td><span className="payment-method">{sale.paymentMethod}</span></td><td className="numeric-cell">{money(sale.total)}</td><td><button className="icon-button" onClick={() => setSelected(sale)} title="Lihat struk"><ReceiptText size={16} /></button></td></tr>)}</tbody></table></div>{!sales.length && !error && <div className="empty-state table-empty"><ReceiptText size={23} /><b>Belum ada transaksi</b><span>Transaksi yang selesai akan muncul di sini.</span></div>}<div className="table-footer"><span>Menampilkan {sales.length ? (page - 1) * 12 + 1 : 0}–{Math.min(page * 12, meta.total)} dari {meta.total} transaksi</span><div><button className="icon-button" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Sebelumnya"><ArrowDown size={15} /></button><span>{page} / {Math.max(meta.totalPages, 1)}</span><button className="icon-button" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)} aria-label="Berikutnya"><ArrowUp size={15} /></button></div></div></section>
    {selected && <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}><section className="receipt-modal" role="dialog" aria-modal="true" aria-label="Detail struk" onClick={(event) => event.stopPropagation()}><button className="icon-button modal-close" onClick={() => setSelected(null)} aria-label="Tutup"><X size={18} /></button><div className="receipt-paper"><span className="receipt-check"><ReceiptText size={21} /></span><p className="eyebrow">STUDIO SORE · STRUK PENJUALAN</p><h2>Detail transaksi</h2><p className="receipt-number">{selected.receiptNumber}</p><div className="receipt-meta"><span>{dateTime(selected.createdAt)}</span><span>Kasir: {selected.cashier?.name}</span></div><div className="receipt-lines">{selected.items.map((item) => <div key={item.id}><span>{item.productName} × {item.quantity}</span><b>{money(item.lineTotal)}</b></div>)}</div><div className="receipt-sum"><span>Subtotal</span><b>{money(selected.subtotal)}</b></div><div className="receipt-sum"><span>Diskon</span><b>{money(selected.discount)}</b></div><div className="receipt-sum"><span>Total · {selected.paymentMethod}</span><b>{money(selected.total)}</b></div><div className="receipt-sum"><span>Tunai diterima</span><b>{money(selected.amountPaid)}</b></div><div className="receipt-sum"><span>Kembalian</span><b>{money(selected.change)}</b></div></div><button className="button button-primary receipt-print" onClick={() => window.print()}><Printer size={16} />Cetak struk</button></section></div>}
  </div>;
}