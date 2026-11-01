import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Minus, Plus, Search, ShoppingBag, X } from 'lucide-react';
import { api, money, dateTime, productImageUrl } from '../lib/api.js';
import { useSession } from '../store/session.js';

export default function PosPage() {
  const cart = useSession((state) => state.cart);
  const addToCart = useSession((state) => state.addToCart);
  const setQuantity = useSession((state) => state.setQuantity);
  const clearCart = useSession((state) => state.clearCart);
  const user = useSession((state) => state.user);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [payment, setPayment] = useState('');
  const [discount, setDiscount] = useState('0');
  const [method, setMethod] = useState('CASH');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [cart]);
  const discountAmount = Number(discount) || 0;
  const discountInvalid = discountAmount < 0 || discountAmount > subtotal;
  const appliedDiscount = discountInvalid ? 0 : discountAmount;
  const total = subtotal - appliedDiscount;

  async function loadProducts() {
    try {
      const query = new URLSearchParams({ page: String(page), limit: '12', ...(search ? { search } : {}), ...(category ? { categoryId: category } : {}) });
      const [productResult, categoryResult] = await Promise.all([api(`/products?${query}`), api('/categories')]);
      setProducts(productResult.data);
      setPages(productResult.meta.totalPages);
      setCategories(categoryResult.data);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => { loadProducts(); }, [page, category, search]);

  async function checkout(event) {
    event.preventDefault();
    setError('');
    if (discountInvalid) {
      setError('Diskon tidak boleh melebihi subtotal.');
      return;
    }
    setBusy(true);
    try {
      const result = await api('/sales', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map(({ id, quantity }) => ({ productId: id, quantity })),
          discount: appliedDiscount,
          amountPaid: Number(payment),
          paymentMethod: method,
        }),
      });
      setReceipt(result.data);
      clearCart();
      setPayment('');
      setDiscount('0');
      await loadProducts();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pos-layout">
      <section className="catalog-panel">
        <div className="catalog-tools">
          <label className="search-field"><Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Cari menu atau SKU" /><kbd>/</kbd></label>
          <div className="category-tabs"><button className={!category ? 'active' : ''} onClick={() => { setCategory(''); setPage(1); }}>Semua</button>{categories.map((item) => <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => { setCategory(item.id); setPage(1); }}>{item.name}</button>)}</div>
        </div>
        <div className="product-grid">{products.map((product, index) => (
          <button className="product-tile" key={product.id} onClick={() => addToCart(product)} disabled={!product.stock} style={{ '--tile-index': index }}>
            <span className={`product-art art-${index % 6}`}>{productImageUrl(product) ? <img src={productImageUrl(product)} alt={product.name} loading="lazy" /> : <span>{product.name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()}</span>}<small>{product.category?.name ?? 'Menu'}</small></span>
            <span className="product-info"><span><b>{product.name}</b><small>{product.sku}</small></span><strong>{money(product.price)}</strong></span>
            <span className={`stock-label ${product.stock <= product.lowStockAt ? 'stock-low' : ''}`}>{product.stock ? `${product.stock} tersedia` : 'Habis'}</span>
            <span className="tile-add"><Plus size={15} /></span>
          </button>
        ))}</div>
        {!products.length && <div className="empty-state"><ShoppingBag size={24} /><b>Menu belum ditemukan</b><span>Coba kata kunci atau kategori lain.</span></div>}
        <div className="pagination"><span>{products.length} produk ditampilkan</span><div><button className="icon-button" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Halaman sebelumnya"><ArrowDown size={15} /></button><span>{page} / {Math.max(pages, 1)}</span><button className="icon-button" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Halaman berikutnya"><ArrowUp size={15} /></button></div></div>
      </section>

      <aside className="cart-panel">
        <div className="cart-heading"><div><p className="eyebrow">PESANAN BARU</p><h2>Keranjang <span>{cart.reduce((count, item) => count + item.quantity, 0)}</span></h2></div><button className="text-button" disabled={!cart.length} onClick={() => { clearCart(); setPayment(''); setDiscount('0'); }}>Kosongkan</button></div>
        <div className="cart-customer"><span className="customer-avatar">{user?.name?.slice(0, 1)}</span><span><b>{user?.name}</b><small>Walk-in customer</small></span><button className="icon-button" title="Pelanggan umum"><Plus size={16} /></button></div>
        <div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}>
          <div className="cart-item-art">{productImageUrl(item) ? <img src={productImageUrl(item)} alt="" /> : item.name.slice(0, 1)}</div><div className="cart-item-detail"><b>{item.name}</b><small>{money(item.price)}</small><div className="quantity-control"><button onClick={() => setQuantity(item.id, item.quantity - 1)} aria-label="Kurangi jumlah"><Minus size={12} /></button><span>{item.quantity}</span><button onClick={() => setQuantity(item.id, Math.min(item.quantity + 1, item.stock))} aria-label="Tambah jumlah"><Plus size={12} /></button></div></div><strong>{money(Number(item.price) * item.quantity)}</strong>
        </div>)}{!cart.length && <div className="cart-empty"><span className="empty-basket"><ShoppingBag size={24} /></span><b>Belum ada pesanan</b><small>Pilih menu untuk memulai transaksi.</small></div>}</div>
        <form className="checkout-form" onSubmit={checkout}>
          <label className="discount-input-row">Diskon (Rp)<div className="money-input"><span>Rp</span><input aria-label="Diskon dalam rupiah" type="number" min="0" max={subtotal} step="1" value={discount} onChange={(event) => setDiscount(event.target.value)} disabled={!cart.length || busy} /></div></label>
          {discountInvalid && <p className="inline-error" role="alert">Diskon tidak boleh melebihi subtotal {money(subtotal)}.</p>}
          <div className="total-row"><span>Subtotal</span><b>{money(subtotal)}</b></div>
          {appliedDiscount > 0 && <div className="discount-row"><span>Potongan diskon</span><span>− {money(appliedDiscount)}</span></div>}
          <div className="grand-total"><span>Total pembayaran</span><strong>{money(total)}</strong></div>
          <label className="field-label">Metode pembayaran<select value={method} onChange={(event) => setMethod(event.target.value)}><option value="CASH">Tunai</option><option value="QRIS">QRIS</option><option value="CARD">Kartu</option></select></label>
          <label className="field-label">Nominal diterima<div className="money-input"><span>Rp</span><input required type="number" min={total} step="1000" value={payment} onChange={(event) => setPayment(event.target.value)} placeholder="0" /></div></label>
          {Number(payment) >= total && total > 0 && <div className="change-note"><Check size={14} />Kembalian {money(Number(payment) - total)}</div>}
          {error && <p className="inline-error" role="alert">{error}</p>}
          <button className="button button-primary pay-button" disabled={!cart.length || busy || discountInvalid}>{busy ? 'Memproses transaksi...' : 'Bayar sekarang'}<span>{money(total)}</span></button>
        </form>
      </aside>

      {receipt && <div className="modal-backdrop" role="presentation" onClick={() => setReceipt(null)}><section className="receipt-modal" role="dialog" aria-modal="true" aria-label="Struk transaksi" onClick={(event) => event.stopPropagation()}>
        <button className="icon-button modal-close" onClick={() => setReceipt(null)} aria-label="Tutup"><X size={18} /></button><div className="receipt-paper"><span className="receipt-check"><Check size={22} /></span><p className="eyebrow">PEMBAYARAN BERHASIL</p><h2>Terima kasih!</h2><p className="receipt-number">{receipt.receiptNumber}</p><div className="receipt-meta"><span>{dateTime(receipt.createdAt)}</span><span>Kasir: {receipt.cashier?.name ?? user?.name}</span></div><div className="receipt-lines">{receipt.items.map((item) => <div key={item.id}><span>{item.productName} × {item.quantity}</span><b>{money(item.lineTotal)}</b></div>)}</div><div className="receipt-sum"><span>Subtotal</span><b>{money(receipt.subtotal)}</b></div>{Number(receipt.discount) > 0 && <div className="receipt-sum"><span>Diskon</span><b>− {money(receipt.discount)}</b></div>}<div className="receipt-sum"><span>Total</span><b>{money(receipt.total)}</b></div><div className="receipt-sum"><span>Tunai diterima</span><b>{money(receipt.amountPaid)}</b></div><div className="receipt-sum"><span>Kembalian</span><b>{money(receipt.change)}</b></div><p className="receipt-thanks">Studio Sore · Sampai jumpa kembali</p></div><button className="button button-primary receipt-print" onClick={() => window.print()}>Cetak struk</button>
      </section></div>}
    </div>
  );
}