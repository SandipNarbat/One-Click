// src/pages/DOAAdjust.jsx
import { useState, useEffect, useCallback } from 'react';
import { doaAPI, supplierAPI } from '../api/axios';

const EMPTY_FORM = {
  supplierId: '', invoiceNo: '', invoiceDate: '',
  totalQty: '', totalAmount: '', itemId: '', productName: ''
};

export default function DOAAdjust() {
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [records,   setRecords]   = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selected,  setSelected]  = useState(null);         // selected DOA record
  const [activeId,  setActiveId]  = useState('lblinid');    // Active ID display
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState(null);
  const [page,      setPage]      = useState(0);

  const PAGE_SIZE = 8;
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).replace(/ /g, '/');

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await supplierAPI.getAll();
      setSuppliers(res.data);
    } catch (e) { showToast('error', e.message); }
  }, []);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const loadRecords = useCallback(async (suppId) => {
    if (!suppId) { setRecords([]); return; }
    try {
      const res = await doaAPI.getBySupplier(suppId);
      setRecords(res.data);
      setPage(0);
    } catch (e) { showToast('error', e.message); }
  }, []);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSupplierChange = (e) => {
    const suppId = e.target.value;
    setForm(f => ({ ...f, supplierId: suppId }));
    setSelected(null);
    const sup = suppliers.find(s => String(s.id) === suppId);
    if (sup) setActiveId(sup.supplierId);
    loadRecords(suppId);
  };

  const handleSelectRecord = (rec) => {
    setSelected(rec);
    setForm({
      supplierId:   String(rec.supplierId),
      invoiceNo:    rec.invoiceNo   || '',
      invoiceDate:  rec.invoiceDate ? rec.invoiceDate.slice(0, 10) : '',
      totalQty:     String(rec.totalQty   || ''),
      totalAmount:  String(rec.totalAmount || ''),
      itemId:       rec.itemId      || '',
      productName:  rec.productName || '',
    });
  };

  const handleClear = () => { setForm(EMPTY_FORM); setSelected(null); setRecords([]); setActiveId('lblinid'); };

  const handleAdd = async () => {
    if (!form.supplierId || !form.invoiceNo || !form.invoiceDate) {
      return showToast('error', 'Supplier, invoice no and date are required');
    }
    setLoading(true);
    try {
      await doaAPI.create(form);
      showToast('success', 'DOA record added');
      const f = { ...form }; setForm(EMPTY_FORM);
      setForm(prev => ({ ...EMPTY_FORM, supplierId: f.supplierId }));
      loadRecords(f.supplierId);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!selected) return showToast('error', 'Select a record to update');
    setLoading(true);
    try {
      await doaAPI.update(selected.id, form);
      showToast('success', 'Record updated');
      setSelected(null);
      loadRecords(form.supplierId);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selected) return showToast('error', 'Select a record to delete');
    if (!window.confirm('Delete this DOA record?')) return;
    setLoading(true);
    try {
      await doaAPI.delete(selected.id);
      showToast('success', 'Record deleted');
      setSelected(null);
      loadRecords(form.supplierId);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const paged    = records.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const maxPage  = Math.ceil(records.length / PAGE_SIZE) - 1;

  const s = styles;

  return (
    <div style={s.page}>
      {toast && <div style={{ ...s.toast, background: toast.type === 'success' ? '#10b981' : '#ef4444' }}>{toast.msg}</div>}

      <div style={s.header}>
        <div>
          <h1 style={s.title}>DOA Adjust</h1>
          <p style={s.subtitle}>Manage and process DOA adjustments and bill information.</p>
        </div>
        <div style={s.entryDate}>
          <span style={s.entryLabel}>ENTRY DATE</span>
          <span style={s.entryValue}>{today}</span>
        </div>
      </div>

      <div style={s.card}>
        {/* Supplier selector row */}
        <div style={s.supplierRow}>
          <div style={{ flex: 1 }}>
            <label style={{ ...s.label, display: 'block', marginBottom: 6 }}>BILL INFO / SELECT SUPPLIER NAME</label>
            <div style={{ display: 'flex', gap: 0 }}>
              <select style={{ ...s.select, flex: 1, borderRadius: '6px 0 0 6px' }}
                name="supplierId" value={form.supplierId} onChange={handleSupplierChange}>
                <option value="">Select a supplier...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.supplierName}</option>
                ))}
              </select>
              {/* Dropdown arrow area + active ID */}
              <div style={s.activeIdBox}>
                <span style={s.activeIdLabel}>Active ID</span>
                <span style={s.activeIdValue}>{activeId}</span>
              </div>
              <button style={{ ...s.btn, ...s.btnShow }} onClick={() => loadRecords(form.supplierId)}>
                ☰ Show
              </button>
            </div>
          </div>
        </div>

        {/* Form fields — only show when supplier selected */}
        {form.supplierId && (
          <div style={{ marginTop: 20 }}>
            <div style={s.row}>
              <div style={s.field}>
                <label style={s.label}>INVOICE NO</label>
                <input style={s.input} name="invoiceNo" value={form.invoiceNo}
                  onChange={handleChange} placeholder="INV-001" />
              </div>
              <div style={s.field}>
                <label style={s.label}>INVOICE DATE</label>
                <input style={s.input} type="date" name="invoiceDate" value={form.invoiceDate}
                  onChange={handleChange} />
              </div>
              <div style={s.field}>
                <label style={s.label}>TOTAL QTY</label>
                <input style={s.input} type="number" name="totalQty" value={form.totalQty}
                  onChange={handleChange} placeholder="0" min="0" />
              </div>
              <div style={s.field}>
                <label style={s.label}>TOTAL AMOUNT (₹)</label>
                <input style={s.input} type="number" name="totalAmount" value={form.totalAmount}
                  onChange={handleChange} placeholder="0.00" step="0.01" />
              </div>
            </div>
            <div style={s.row}>
              <div style={s.field}>
                <label style={s.label}>ITEM ID</label>
                <input style={s.input} name="itemId" value={form.itemId}
                  onChange={handleChange} placeholder="ITM-XXXX" />
              </div>
              <div style={{ ...s.field, flex: 2 }}>
                <label style={s.label}>PRODUCT NAME</label>
                <input style={s.input} name="productName" value={form.productName}
                  onChange={handleChange} placeholder="Product name..." />
              </div>
            </div>
          </div>
        )}

        {/* Records Table */}
        <div style={{ ...s.tableBox, marginTop: 20 }}>
          <table style={s.table}>
            <thead>
              <tr>
                {['SR NO', 'INVOICE NO', 'INV DATE', 'TOTAL QTY', 'TOTAL AMOUNT', 'ITEM ID', 'PRODUCT NAME'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} style={s.empty}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                      <div>Select a supplier to view DOA records.</div>
                    </div>
                  </td>
                </tr>
              ) : paged.map((rec, i) => (
                <tr key={rec.id}
                  style={{ ...s.tr, ...(selected?.id === rec.id ? s.trSelected : {}) }}
                  onClick={() => handleSelectRecord(rec)}>
                  <td style={s.td}>{page * PAGE_SIZE + i + 1}</td>
                  <td style={{ ...s.td, color: '#60a5fa' }}>{rec.invoiceNo}</td>
                  <td style={s.td}>{rec.invoiceDate ? new Date(rec.invoiceDate).toLocaleDateString() : '—'}</td>
                  <td style={{ ...s.td, textAlign: 'center' }}>{rec.totalQty}</td>
                  <td style={s.td}>₹{rec.totalAmount?.toLocaleString('en-IN')}</td>
                  <td style={s.td}>{rec.itemId || '—'}</td>
                  <td style={{ ...s.td, fontWeight: 600 }}>{rec.productName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={s.tableFooter}>
            <span>Showing {records.length} records</span>
            {maxPage > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.pageBtn} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>‹</button>
                <button style={s.pageBtn} onClick={() => setPage(p => Math.min(maxPage, p + 1))} disabled={page >= maxPage}>›</button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ ...s.btnRow, marginTop: 20 }}>
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
  card:         { background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 20, border: '1px solid #334155' },
  supplierRow:  { display: 'flex', gap: 16, alignItems: 'flex-end' },
  activeIdBox:  { background: '#0f172a', border: '1px solid #334155', borderLeft: 'none', padding: '6px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  activeIdLabel:{ fontSize: 10, color: '#64748b', letterSpacing: 1 },
  activeIdValue:{ fontSize: 13, color: '#60a5fa', fontWeight: 600 },
  btnShow:      { background: '#6366f1', color: '#fff', borderRadius: '0 6px 6px 0', padding: '10px 18px', border: 'none', cursor: 'pointer', fontWeight: 600 },
  row:          { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  field:        { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 180 },
  label:        { fontSize: 11, color: '#64748b', letterSpacing: 1, marginBottom: 6 },
  input:        { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  select:       { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', cursor: 'pointer' },
  tableBox:     { border: '1px solid #334155', borderRadius: 8, overflow: 'hidden' },
  table:        { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:           { padding: '10px 14px', textAlign: 'left', color: '#60a5fa', fontSize: 11, letterSpacing: 1, borderBottom: '1px solid #334155', background: '#0f172a', textTransform: 'uppercase' },
  tr:           { borderBottom: '1px solid #1e293b', cursor: 'pointer' },
  trSelected:   { background: '#1e3a5f' },
  td:           { padding: '10px 14px', color: '#cbd5e1' },
  empty:        { padding: 48, color: '#475569', textAlign: 'center' },
  tableFooter:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', fontSize: 12, color: '#475569', background: '#0f172a' },
  pageBtn:      { background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 16 },
  btnRow:       { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  btnLeft:      { display: 'flex', gap: 8 },
  btnRight:     { display: 'flex', gap: 8 },
  btn:          { padding: '9px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnPrimary:   { background: '#6366f1', color: '#fff' },
  btnSecondary: { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' },
  btnDanger:    { background: 'transparent', color: '#f87171', border: '1px solid #f87171' },
  btnSuccess:   { background: '#0891b2', color: '#fff' },
  toast:        { position: 'fixed', top: 20, right: 20, padding: '12px 24px', borderRadius: 8, color: '#fff', fontWeight: 600, zIndex: 9999, fontSize: 14 },
};