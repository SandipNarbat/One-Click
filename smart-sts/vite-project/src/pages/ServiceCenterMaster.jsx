// src/pages/ServiceCenterMaster.jsx
import { useState, useEffect, useCallback } from 'react';
import { serviceCenterAPI } from '../api/axios';

const EMPTY_FORM = { productType: '', brandName: '', serviceCentreNo: '' };

export default function ServiceCenterMaster() {
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [centers,   setCenters]   = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [products,  setProducts]  = useState([]);
  const [brands,    setBrands]    = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState(null);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).replace(/ /g, '/');

  const load = useCallback(async () => {
    try {
      const [cenRes, ptRes, brRes] = await Promise.all([
        serviceCenterAPI.getAll(),
        serviceCenterAPI.getProductTypes(),
        serviceCenterAPI.getBrands(),
      ]);
      setCenters(cenRes.data);
      setProducts(ptRes.data);
      setBrands(brRes.data);
    } catch (e) { showToast('error', e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSelect = (c) => {
    setSelected(c);
    setForm({ productType: c.productType || '', brandName: c.brandName || '', serviceCentreNo: c.serviceCentreNo || '' });
  };

  const handleClear = () => { setForm(EMPTY_FORM); setSelected(null); };

  const handleAdd = async () => {
    if (!form.productType || !form.brandName) return showToast('error', 'Product type and brand are required');
    setLoading(true);
    try {
      await serviceCenterAPI.create(form);
      showToast('success', 'Service center added');
      handleClear(); load();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!selected) return showToast('error', 'Select a record to update');
    setLoading(true);
    try {
      await serviceCenterAPI.update(selected.id, form);
      showToast('success', 'Updated successfully');
      handleClear(); load();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selected) return showToast('error', 'Select a record to delete');
    if (!window.confirm('Delete this service center?')) return;
    setLoading(true);
    try {
      await serviceCenterAPI.delete(selected.id);
      showToast('success', 'Deleted successfully');
      handleClear(); load();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const s = styles;

  return (
    <div style={s.page}>
      {toast && <div style={{ ...s.toast, background: toast.type === 'success' ? '#10b981' : '#ef4444' }}>{toast.msg}</div>}

      <div style={s.header}>
        <div>
          <h1 style={s.title}>Service Center Master</h1>
          <p style={s.subtitle}>Manage and configure service centre entity records.</p>
        </div>
        <div style={s.entryDate}>
          <span style={s.entryLabel}>ENTRY DATE</span>
          <span style={s.entryValue}>{today}</span>
        </div>
      </div>

      <div style={s.card}>
        {/* Form — matches your screenshot's label:dropdown layout */}
        <div style={s.formGrid}>

          <div style={s.formRow}>
            <label style={s.labelRight}>Sr No :</label>
            <div style={{ flex: 1 }}>
              <input style={{ ...s.input, ...s.inputDisabled }}
                value={selected ? selected.serialNo : 'Auto-generated'} readOnly />
            </div>
          </div>

          <div style={s.formRow}>
            <label style={s.labelRight}>Product Type :</label>
            <div style={{ flex: 1 }}>
              <select style={s.select} name="productType" value={form.productType} onChange={handleChange}>
                <option value="">Select Product Type...</option>
                {products.map(p => (
                  <option key={p.id} value={p.productName}>{p.productName}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={s.formRow}>
            <label style={s.labelRight}>Brand Name :</label>
            <div style={{ flex: 1 }}>
              <select style={s.select} name="brandName" value={form.brandName} onChange={handleChange}>
                <option value="">Select Brand...</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div style={s.formRow}>
            <label style={s.labelRight}>Service Centre No :</label>
            <div style={{ flex: 1 }}>
              <input style={s.input} name="serviceCentreNo" value={form.serviceCentreNo}
                onChange={handleChange} placeholder="Enter centre number..." />
            </div>
          </div>

        </div>

        {/* Buttons */}
        <div style={{ ...s.btnRow, marginTop: 32 }}>
          <div style={s.btnLeft}>
            <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleAdd} disabled={loading}>+ ADD</button>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={handleSave} disabled={loading}>✎ EDIT</button>
            <button style={{ ...s.btn, ...s.btnDanger }} onClick={handleDelete} disabled={loading}>🗑 DELETE</button>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={handleClear}>⊘ CLEAR</button>
          </div>
          <div style={s.btnRight}>
            <button style={{ ...s.btn, ...s.btnSuccess }} onClick={handleSave} disabled={loading}>💾 SAVE</button>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={() => window.print()}>🖨 PRINT</button>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={handleClear}>← BACK</button>
          </div>
        </div>
      </div>

      {/* Table */}
      {centers.length > 0 && (
        <div style={s.card}>
          <div style={s.tableHeader}>
            <span style={s.tableTitle}>Service Centers ({centers.length})</span>
          </div>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Sr.', 'Serial No', 'Product Type', 'Brand Name', 'Centre No'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {centers.map((c, i) => (
                  <tr key={c.id}
                    style={{ ...s.tr, ...(selected?.id === c.id ? s.trSelected : {}) }}
                    onClick={() => handleSelect(c)}>
                    <td style={s.td}>{i + 1}</td>
                    <td style={{ ...s.td, color: '#60a5fa' }}>{c.serialNo}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{c.productType || '—'}</td>
                    <td style={s.td}>{c.brandName || '—'}</td>
                    <td style={s.td}>{c.serviceCentreNo || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={s.tableFooter}>Showing {centers.length} records</div>
        </div>
      )}
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
  card:        { background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 20, border: '1px solid #334155' },
  formGrid:    { display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600, margin: '0 auto' },
  formRow:     { display: 'flex', alignItems: 'center', gap: 16 },
  labelRight:  { width: 180, textAlign: 'right', color: '#94a3b8', fontSize: 14, flexShrink: 0 },
  input:       { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  inputDisabled:{ background: '#0d1a2d', color: '#94a3b8' },
  select:      { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', cursor: 'pointer', width: '100%' },
  btnRow:      { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  btnLeft:     { display: 'flex', gap: 8 },
  btnRight:    { display: 'flex', gap: 8 },
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
  tableFooter: { fontSize: 12, color: '#475569', marginTop: 12 },
  toast:       { position: 'fixed', top: 20, right: 20, padding: '12px 24px', borderRadius: 8, color: '#fff', fontWeight: 600, zIndex: 9999, fontSize: 14 },
};