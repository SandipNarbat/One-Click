// src/pages/PriceDrop.jsx
import { useState, useEffect, useCallback } from 'react';
import { priceDropAPI, productAPI } from '../api/axios';

const EMPTY_FORM = { productId: '', model: '', brand: '', newDp: '', newSalePrice: '', remark: '', startLabel: '' };

export default function PriceDrop() {
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [items,    setItems]    = useState([]);
  const [products, setProducts] = useState([]);
  const [models,   setModels]   = useState([]);
  const [brands,   setBrands]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState(null);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).replace(/ /g, '/');

  const loadProducts = useCallback(async () => {
    try {
      const res = await productAPI.getAll();
      setProducts(res.data);
    } catch (e) { showToast('error', e.message); }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const loadOptions = useCallback(async (productId) => {
    try {
      const params = productId ? { productId } : {};
      const [mRes, bRes] = await Promise.all([
        priceDropAPI.getModels(params),
        priceDropAPI.getBrands(params),
      ]);
      setModels(mRes.data);
      setBrands(bRes.data);
    } catch {}
  }, []);

  const handleShow = async () => {
    try {
      const params = {};
      if (form.productId) params.productId = form.productId;
      if (form.model)     params.model     = form.model;
      if (form.brand)     params.brand     = form.brand;
      const res = await priceDropAPI.getItems(params);
      setItems(res.data);
      setSelected(null);
    } catch (e) { showToast('error', e.message); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (name === 'productId') loadOptions(value);
  };

  const handleClear = () => { setForm(EMPTY_FORM); setItems([]); setSelected(null); };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!form.newDp && !form.newSalePrice) {
      return showToast('error', 'Enter at least New DP or New Sale Price');
    }
    setLoading(true);
    try {
      const payload = {
        productId:    form.productId || undefined,
        model:        form.model     || undefined,
        brand:        form.brand     || undefined,
        newDp:        form.newDp        || undefined,
        newSalePrice: form.newSalePrice || undefined,
        remark:       form.remark       || undefined,
        itemIds:      selected ? [selected.id] : undefined,
      };
      const res = await priceDropAPI.applyDrop(payload);
      showToast('success', res.message || 'Price updated successfully');
      handleShow();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const s = styles;

  return (
    <div style={s.page}>
      {toast && <div style={{ ...s.toast, background: toast.type === 'success' ? '#10b981' : '#ef4444' }}>{toast.msg}</div>}

      <div style={s.header}>
        <div>
          <h1 style={s.title}>Price Adjustment</h1>
          <p style={s.subtitle}>Manage and update product pricing across all tiers.</p>
        </div>
        <div style={s.entryDate}>
          <span style={s.entryLabel}>ENTRY DATE</span>
          <span style={s.entryValue}>{today}</span>
        </div>
      </div>

      <div style={s.splitWrap}>

        {/* LEFT — Filters + DP Change Form */}
        <div style={{ ...s.card, width: 340, flexShrink: 0 }}>

          {/* Filter section */}
          <div style={{ ...s.field, marginBottom: 16 }}>
            <label style={s.label}>PROD. NAME</label>
            <div style={{ display: 'flex', gap: 0 }}>
              <select style={{ ...s.select, flex: 1, borderRadius: '6px 0 0 6px' }}
                name="productId" value={form.productId} onChange={handleChange}>
                <option value="">Select Product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
              </select>
            </div>
          </div>

          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>MODEL</label>
              <select style={s.select} name="model" value={form.model} onChange={handleChange}>
                <option value="">Model...</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>BRAND</label>
              <select style={s.select} name="brand" value={form.brand} onChange={handleChange}>
                <option value="">Brand...</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <button style={{ ...s.btn, ...s.btnShow, width: '100%', marginBottom: 20 }} onClick={handleShow}>
            👁 SHOW
          </button>

          {/* DP Change section */}
          <div style={s.sectionLabel}>↓ DP CHANGE</div>

          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>NEW DP</label>
              <div style={s.rupeeWrap}>
                <span style={s.rupeePrefix}>₹</span>
                <input style={{ ...s.input, flex: 1, borderRadius: '0 6px 6px 0', borderLeft: 'none' }}
                  type="number" name="newDp" value={form.newDp}
                  onChange={handleChange} placeholder="0.00" step="0.01" />
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>NEW SALE PRICE</label>
              <div style={s.rupeeWrap}>
                <span style={s.rupeePrefix}>₹</span>
                <input style={{ ...s.input, flex: 1, borderRadius: '0 6px 6px 0', borderLeft: 'none' }}
                  type="number" name="newSalePrice" value={form.newSalePrice}
                  onChange={handleChange} placeholder="0.00" step="0.01" />
              </div>
            </div>
          </div>

          <div style={{ ...s.field, marginBottom: 16 }}>
            <label style={s.label}>REMARK</label>
            <textarea style={s.textarea} name="remark" value={form.remark}
              onChange={handleChange} placeholder="Enter reason for price adjustment..." />
          </div>

          <div style={{ ...s.field, marginBottom: 20 }}>
            <label style={s.label}>START LABEL</label>
            <input style={s.input} name="startLabel" value={form.startLabel}
              onChange={handleChange} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...s.btn, ...s.btnSecondary, flex: 1 }} onClick={handleClear}>CLEAR</button>
            <button style={{ ...s.btn, ...s.btnPrimary, flex: 1 }} onClick={handleSave} disabled={loading}>SAVE</button>
          </div>
        </div>

        {/* RIGHT — Product Directory */}
        <div style={{ ...s.card, flex: 1 }}>
          <div style={s.tableHeader}>
            <span style={{ ...s.tableTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📋</span> Product Directory
            </span>
            <span style={{ fontSize: 12, color: '#64748b' }}>{selected ? `Selected: ${selected.itemId}` : 'Click row to select'}</span>
          </div>

          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['SR NO', 'ITEM ID', 'PRODUCT NAME', 'DP (₹)', 'QTY', 'MODEL', 'BRAND', 'COLOUR'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={8} style={s.empty}>Use filters above and click SHOW to load items.</td></tr>
                ) : items.map((item, i) => (
                  <tr key={item.id}
                    style={{ ...s.tr, ...(selected?.id === item.id ? s.trSelected : {}) }}
                    onClick={() => setSelected(selected?.id === item.id ? null : item)}>
                    <td style={s.td}>{String(i + 1).padStart(2, '0')}</td>
                    <td style={{ ...s.td, color: '#60a5fa' }}>{item.itemId}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{item.product?.productName || '—'}</td>
                    <td style={{ ...s.td, color: '#f59e0b' }}>{item.dp?.toLocaleString('en-IN') || '—'}</td>
                    <td style={{ ...s.td, color: item.quantity > 50 ? '#4ade80' : '#f87171', fontWeight: 700 }}>{item.quantity}</td>
                    <td style={s.td}>{item.model || '—'}</td>
                    <td style={s.td}>{item.brand || '—'}</td>
                    <td style={s.td}>{item.colour || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <div style={s.tableFooter}>Showing {items.length} items</div>
            <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
              Total Stock Quantity: <span style={{ color: '#60a5fa', fontSize: 16 }}>{totalQty}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom action row */}
      <div style={{ ...s.card, padding: '16px 24px' }}>
        <div style={s.btnRow}>
          <div style={s.btnLeft}>
            <button style={{ ...s.btn, ...s.btnPrimary }}>+ ADD</button>
            <button style={{ ...s.btn, ...s.btnSecondary }}>✎ EDIT</button>
            <button style={{ ...s.btn, ...s.btnDanger }}>🗑 DELETE</button>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={handleClear}>⊘ CLEAR</button>
          </div>
          <div style={s.btnRight}>
            <button style={{ ...s.btn, ...s.btnSuccess }} onClick={handleSave} disabled={loading}>💾 SAVE</button>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={() => window.print()}>🖨 PRINT</button>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={handleClear}>← BACK</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page:        { padding: '24px', color: '#e2e8f0', fontFamily: "'Courier New', monospace" },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title:       { fontSize: 26, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  subtitle:    { fontSize: 13, color: '#64748b', margin: '4px 0 0' },
  entryDate:   { textAlign: 'right' },
  entryLabel:  { display: 'block', fontSize: 11, color: '#64748b', letterSpacing: 1 },
  entryValue:  { fontSize: 14, color: '#e2e8f0', fontWeight: 600 },
  splitWrap:   { display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 20 },
  card:        { background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid #334155' },
  sectionLabel:{ fontSize: 11, color: '#64748b', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase', borderTop: '1px solid #334155', paddingTop: 16 },
  row:         { display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  field:       { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 120 },
  label:       { fontSize: 11, color: '#64748b', letterSpacing: 1, marginBottom: 6 },
  input:       { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  textarea:    { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, outline: 'none', minHeight: 70, resize: 'vertical', fontFamily: 'inherit' },
  select:      { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', cursor: 'pointer' },
  rupeeWrap:   { display: 'flex' },
  rupeePrefix: { background: '#1e293b', border: '1px solid #334155', borderRight: 'none', borderRadius: '6px 0 0 6px', padding: '10px 10px', color: '#94a3b8', fontSize: 14 },
  btnShow:     { background: '#1e3a5f', color: '#60a5fa', border: '1px solid #1e4a8f', borderRadius: 6, padding: '10px', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btn:         { padding: '9px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnPrimary:  { background: '#6366f1', color: '#fff' },
  btnSecondary:{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' },
  btnDanger:   { background: 'transparent', color: '#f87171', border: '1px solid #f87171' },
  btnSuccess:  { background: '#0891b2', color: '#fff' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  tableTitle:  { fontSize: 15, fontWeight: 600, color: '#e2e8f0' },
  tableWrap:   { overflowX: 'auto' },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:          { padding: '10px 14px', textAlign: 'left', color: '#60a5fa', fontSize: 11, letterSpacing: 1, borderBottom: '1px solid #334155', textTransform: 'uppercase' },
  tr:          { borderBottom: '1px solid #1e293b', cursor: 'pointer' },
  trSelected:  { background: '#1e3a5f' },
  td:          { padding: '10px 14px', color: '#cbd5e1' },
  empty:       { textAlign: 'center', padding: 40, color: '#475569' },
  tableFooter: { fontSize: 12, color: '#475569' },
  btnRow:      { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  btnLeft:     { display: 'flex', gap: 8 },
  btnRight:    { display: 'flex', gap: 8 },
  toast:       { position: 'fixed', top: 20, right: 20, padding: '12px 24px', borderRadius: 8, color: '#fff', fontWeight: 600, zIndex: 9999, fontSize: 14 },
};