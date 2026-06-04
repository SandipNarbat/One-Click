// src/pages/ProductMaster.jsx
import { useState, useEffect, useCallback } from 'react';
import { productAPI } from '../api/axios';

const PRODUCT_TYPES = ['SINGLE', 'MULTIPLE'];
const GST_RATES     = [0, 5, 12, 18, 28];
const HSN_CODES     = [
  { code: '85171300', desc: 'Mobiles' },
  { code: '85235220', desc: 'Memory Cards' },
  { code: '84717090', desc: 'Pen Drives' },
  { code: '70200090', desc: 'Scratch Guards' },
  { code: '85183000', desc: 'Bluetooth Headsets' },
  { code: '85044030', desc: 'Chargers' },
  { code: '85044090', desc: 'Inverters' },
  { code: '85072000', desc: 'Batteries' },
];
const CATEGORIES = ['Electronics', 'Accessories', 'Power Backup', 'Solar', 'Other'];

const EMPTY_FORM = {
  productName: '', productType: '', hsnCode: '',
  productCategory: '', gstPercentage: '', organisation: ''
};

export default function ProductMaster() {
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState(null);
  const [search,   setSearch]   = useState('');

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

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSelect = (product) => {
    setSelected(product);
    setForm({
      productName:     product.productName     || '',
      productType:     product.productType     || '',
      hsnCode:         product.hsnCode         || '',
      productCategory: product.productCategory || '',
      gstPercentage:   product.gstPercentage != null ? String(product.gstPercentage) : '',
      organisation:    product.organisation    || '',
    });
  };

  const handleClear = () => { setForm(EMPTY_FORM); setSelected(null); };

  const handleAdd = async () => {
    if (!form.productName.trim()) return showToast('error', 'Product name is required');
    if (!form.productType)        return showToast('error', 'Product type is required');
    setLoading(true);
    try {
      await productAPI.create(form);
      showToast('success', 'Product added successfully');
      handleClear(); loadProducts();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!selected) return showToast('error', 'Select a product to update');
    setLoading(true);
    try {
      await productAPI.update(selected.id, form);
      showToast('success', 'Product updated');
      handleClear(); loadProducts();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selected) return showToast('error', 'Select a product to delete');
    if (!window.confirm(`Delete "${selected.productName}"?`)) return;
    setLoading(true);
    try {
      await productAPI.delete(selected.id);
      showToast('success', 'Product deleted');
      handleClear(); loadProducts();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const filtered = products.filter(p =>
    p.productName.toLowerCase().includes(search.toLowerCase()) ||
    p.prodCode.includes(search) ||
    (p.hsnCode || '').includes(search)
  );

  const s = styles;

  return (
    <div style={s.page}>
      {toast && (
        <div style={{ ...s.toast, background: toast.type === 'success' ? '#10b981' : '#ef4444' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Product Master</h1>
          <p style={s.subtitle}>Manage inventory items and categorization</p>
        </div>
        <div style={s.entryDate}>
          <span style={s.entryLabel}>ENTRY DATE</span>
          <span style={s.entryValue}>{today}</span>
        </div>
      </div>

      {/* Split layout: form left, table right */}
      <div style={s.splitWrap}>

        {/* LEFT — Form */}
        <div style={{ ...s.card, flex: '0 0 380px' }}>

          <div style={{ ...s.field, marginBottom: 16 }}>
            <label style={s.label}>ORGANISATION</label>
            <input style={s.input} name="organisation" value={form.organisation}
              onChange={handleChange} placeholder="e.g. SHREE SONY NX" />
          </div>

          <div style={{ ...s.field, marginBottom: 16 }}>
            <label style={s.label}>PROD CODE</label>
            <input style={{ ...s.input, ...s.inputDisabled }}
              value={selected ? selected.prodCode : 'Auto-generated'} readOnly />
          </div>

          <div style={{ ...s.field, marginBottom: 16 }}>
            <label style={s.label}>PRODUCT NAME</label>
            <input style={s.input} name="productName" value={form.productName}
              onChange={handleChange} placeholder="Select or type product name..."
              list="product-names" />
            <datalist id="product-names">
              {products.map(p => <option key={p.id} value={p.productName} />)}
            </datalist>
          </div>

          <div style={{ ...s.field, marginBottom: 16 }}>
            <label style={s.label}>PRODUCT TYPE</label>
            <select style={s.select} name="productType" value={form.productType} onChange={handleChange}>
              <option value="">Select Type...</option>
              {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ ...s.field, marginBottom: 16 }}>
            <label style={s.label}>HSN CODE</label>
            <select style={s.select} name="hsnCode" value={form.hsnCode} onChange={handleChange}>
              <option value="">Select HSN...</option>
              {HSN_CODES.map(h => (
                <option key={h.code} value={h.code}>{h.code} — {h.desc}</option>
              ))}
              <option value="0">0 — Not Applicable</option>
            </select>
          </div>

          <div style={{ ...s.field, marginBottom: 16 }}>
            <label style={s.label}>PRODUCT CATEGORY</label>
            <select style={s.select} name="productCategory" value={form.productCategory} onChange={handleChange}>
              <option value="">Select Category...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ ...s.field, marginBottom: 20 }}>
            <label style={s.label}>GST PERCENTAGE</label>
            <select style={s.select} name="gstPercentage" value={form.gstPercentage} onChange={handleChange}>
              <option value="">Select %...</option>
              {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleAdd} disabled={loading}>+ ADD</button>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={handleSave} disabled={loading}>✎ UPDATE</button>
            <button style={{ ...s.btn, ...s.btnDanger }} onClick={handleDelete} disabled={loading}>🗑 DELETE</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={handleClear}>⊘ CLEAR</button>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={() => window.print()}>🖨 PRINT</button>
          </div>
        </div>

        {/* RIGHT — Product Directory Table */}
        <div style={{ ...s.card, flex: 1 }}>
          <div style={s.tableHeader}>
            <span style={s.tableTitle}>Product Directory</span>
            <input style={{ ...s.input, width: 220, margin: 0 }}
              placeholder="Common Search..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['SR. NO.','PROD CODE','PRODUCT NAME','HSN CODE','TYPE','GST(%)'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={s.empty}>No products found</td></tr>
                ) : filtered.map((p, i) => (
                  <tr key={p.id}
                    style={{ ...s.tr, ...(selected?.id === p.id ? s.trSelected : {}) }}
                    onClick={() => handleSelect(p)}>
                    <td style={s.td}>{i + 1}</td>
                    <td style={{ ...s.td, color: '#60a5fa' }}>{p.prodCode}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{p.productName}</td>
                    <td style={s.td}>{p.hsnCode || '0'}</td>
                    <td style={s.td}>
                      <span style={{
                        ...s.badge,
                        background: p.productType === 'SINGLE' ? '#1e3a5f' : '#1a3a2a',
                        color: p.productType === 'SINGLE' ? '#60a5fa' : '#4ade80',
                      }}>
                        {p.productType}
                      </span>
                    </td>
                    <td style={s.td}>{p.gstPercentage ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={s.tableFooter}>Showing {filtered.length} records</div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page:         { padding: '24px', color: '#e2e8f0', fontFamily: "'Courier New', monospace" },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title:        { fontSize: 26, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  subtitle:     { fontSize: 13, color: '#64748b', margin: '4px 0 0' },
  entryDate:    { textAlign: 'right' },
  entryLabel:   { display: 'block', fontSize: 11, color: '#64748b', letterSpacing: 1 },
  entryValue:   { fontSize: 14, color: '#e2e8f0', fontWeight: 600 },
  splitWrap:    { display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' },
  card:         { background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 20, border: '1px solid #334155' },
  field:        { display: 'flex', flexDirection: 'column' },
  label:        { fontSize: 11, color: '#64748b', letterSpacing: 1, marginBottom: 6 },
  input:        { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  inputDisabled:{ background: '#0d1a2d', color: '#94a3b8' },
  select:       { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', cursor: 'pointer' },
  btn:          { padding: '9px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnPrimary:   { background: '#6366f1', color: '#fff' },
  btnSecondary: { background: '#0f172a', color: '#94a3b8', border: '1px solid #334155' },
  btnDanger:    { background: 'transparent', color: '#f87171', border: '1px solid #f87171' },
  btnSuccess:   { background: '#0891b2', color: '#fff' },
  tableHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  tableTitle:   { fontSize: 15, fontWeight: 600, color: '#e2e8f0' },
  tableWrap:    { overflowX: 'auto' },
  table:        { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:           { padding: '10px 14px', textAlign: 'left', color: '#60a5fa', fontSize: 11, letterSpacing: 1, borderBottom: '1px solid #334155', textTransform: 'uppercase' },
  tr:           { borderBottom: '1px solid #1e293b', cursor: 'pointer' },
  trSelected:   { background: '#1e3a5f' },
  td:           { padding: '10px 14px', color: '#cbd5e1' },
  badge:        { padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 },
  empty:        { textAlign: 'center', padding: 40, color: '#475569' },
  tableFooter:  { fontSize: 12, color: '#475569', marginTop: 12 },
  toast:        { position: 'fixed', top: 20, right: 20, padding: '12px 24px', borderRadius: 8, color: '#fff', fontWeight: 600, zIndex: 9999, fontSize: 14 },
};
