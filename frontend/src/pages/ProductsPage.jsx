import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Edit2, Plus, Search, X } from 'lucide-react';
import { api, money } from '../lib/api.js';

const blankProduct = { sku: '', name: '', description: '', price: '', stock: '', lowStockAt: '5', categoryId: '', isActive: true };

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [status, setStatus] = useState('active');
  const [editing, setEditing] = useState(undefined);
  const [form, setForm] = useState(blankProduct);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!imageFile) return undefined;
    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  async function load() {
    const query = new URLSearchParams({ page: String(page), limit: '10', ...(search ? { search } : {}), ...(status === 'all' ? { status: 'all' } : {}) });
    const [result, categoryResult] = await Promise.all([api(`/products?${query}`), api('/categories')]);
    setProducts(result.data);
    setMeta(result.meta);
    setCategories(categoryResult.data);
  }

  useEffect(() => { load().catch((requestError) => setError(requestError.message)); }, [search, page, status]);

  function openForm(product) {
    setEditing(product ?? null);
    setForm(product ? { ...product, price: String(product.price), stock: String(product.stock), lowStockAt: String(product.lowStockAt), categoryId: product.categoryId ?? '' } : blankProduct);
    setImageFile(null);
    setImagePreview(product?.imageUrl ?? '');
    setError('');
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const payload = { ...form, price: Number(form.price), stock: Number(form.stock), lowStockAt: Number(form.lowStockAt), categoryId: form.categoryId || null };
    try {
      const body = new FormData();
      body.append('product', JSON.stringify(payload));
      if (imageFile) body.append('image', imageFile);
      await api(editing ? `/products/${editing.id}` : '/products', { method: editing ? 'PATCH' : 'POST', body });
      setEditing(undefined);
      setImageFile(null);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function archive(product) {
    if (!window.confirm(`Nonaktifkan ${product.name}?`)) return;
    try {
      await api(`/products/${product.id}`, { method: 'DELETE' });
      await load();
    } catch (requestError) { setError(requestError.message); }
  }

  const activeForm = editing !== undefined;
  return <div className="page-stack">
    <section className="page-intro"><div><p className="eyebrow">KATALOG TOKO</p><h2>Produk yang selalu siap.</h2><p>Atur harga, kategori, dan ketersediaan stok dari satu tempat.</p></div><button className="button button-primary" onClick={() => openForm(null)}><Plus size={17} />Tambah produk</button></section>
    <section className="panel table-panel">
      <div className="table-toolbar"><label className="search-field"><Search size={16} /><input placeholder="Cari nama atau SKU" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label><select className="toolbar-select" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="active">Produk aktif</option><option value="all">Semua produk</option></select><span className="table-count">{meta.total} produk</span></div>
      {error && !activeForm && <p className="inline-error table-error">{error}</p>}
      <div className="table-scroll"><table><thead><tr><th>PRODUK</th><th>KATEGORI</th><th>HARGA</th><th>STOK</th><th>STATUS</th><th /></tr></thead><tbody>{products.map((product, index) => <tr key={product.id}><td><span className={`table-product-mark mark-${index % 5}`}>{product.imageUrl ? <img src={product.imageUrl} alt="" /> : product.name.slice(0, 1)}</span><span className="table-product-name"><b>{product.name}</b><small>{product.sku}</small></span></td><td>{product.category?.name ?? 'Tanpa kategori'}</td><td className="numeric-cell">{money(product.price)}</td><td><span className={`stock-pill ${product.stock <= product.lowStockAt ? 'stock-pill-low' : ''}`}>{product.stock} unit</span></td><td><span className={`status-pill ${product.isActive ? 'status-active' : 'status-inactive'}`}><i />{product.isActive ? 'Aktif' : 'Nonaktif'}</span></td><td><div className="row-actions"><button className="icon-button" title="Edit produk" onClick={() => openForm(product)}><Edit2 size={15} /></button>{product.isActive && <button className="icon-button archive-button" title="Nonaktifkan produk" onClick={() => archive(product)}><X size={16} /></button>}</div></td></tr>)}</tbody></table></div>
      {!products.length && <div className="empty-state table-empty"><b>Belum ada produk</b><span>Tambahkan produk atau ubah pencarian.</span></div>}
      <div className="table-footer"><span>Menampilkan {products.length ? (page - 1) * 10 + 1 : 0}–{Math.min(page * 10, meta.total)} dari {meta.total} produk</span><div><button className="icon-button" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Sebelumnya"><ArrowDown size={15} /></button><span>{page} / {Math.max(meta.totalPages, 1)}</span><button className="icon-button" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)} aria-label="Berikutnya"><ArrowUp size={15} /></button></div></div>
    </section>
    {activeForm && <div className="modal-backdrop" role="presentation" onClick={() => setEditing(undefined)}><section className="edit-modal" role="dialog" aria-modal="true" aria-label={editing ? 'Edit produk' : 'Tambah produk'} onClick={(event) => event.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">KATALOG PRODUK</p><h2>{editing ? 'Perbarui produk' : 'Produk baru'}</h2></div><button className="icon-button" onClick={() => setEditing(undefined)} aria-label="Tutup"><X size={19} /></button></div><form onSubmit={save} className="product-form"><label>Nama produk<input required minLength="2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><div className="form-grid"><label>SKU<input required value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></label><label>Kategori<select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Tanpa kategori</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label>Harga (Rp)<input required type="number" min="1" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label><label>Jumlah stok<input required type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label><label>Batas stok rendah<input required type="number" min="0" value={form.lowStockAt} onChange={(event) => setForm({ ...form, lowStockAt: event.target.value })} /></label></div><label>Gambar produk <span className="optional-label">opsional · JPG, PNG, WebP · maks. 4 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} />{imagePreview && <img className="product-image-preview" src={imagePreview} alt="Pratinjau gambar produk" />}</label><label>Deskripsi <span className="optional-label">opsional</span><textarea rows="3" maxLength="500" value={form.description ?? ''} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>{editing && <label className="checkbox-label"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />Produk aktif</label>}{error && <p className="inline-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setEditing(undefined)}>Batal</button><button className="button button-primary" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan produk'}</button></div></form></section></div>}
  </div>;
}