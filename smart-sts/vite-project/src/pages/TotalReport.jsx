// src/pages/TotalReport.jsx
import { useState, useEffect, useCallback } from 'react';
import { reportAPI } from '../api/axios';

const EMPTY_FILTER = { supplierId: '', productName: '', brand: '', model: '', from: '', to: '' };

export default function TotalReport() {
  const [filter,    setFilter]    = useState(EMPTY_FILTER);
  const [records,   setRecords]   = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [products,  setProducts]  = useState([]);
  const [brands,    setBrands]    = useState([]);
  const [models,    setModels]    = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState(null);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).replace(/ /g, '/');

  const loadOptions = useCallback(async () => {
    try {
      const [sRes, pRes, bRes, mRes] = await Promise.all([
        reportAPI.getSuppliers(),
        reportAPI.getProducts(),
        reportAPI.getBrands(),
        reportAPI.getModels(),
      ]);
      setSuppliers(sRes.data);
      setProducts(pRes.data);
      setBrands(bRes.data);
      setModels(mRes.data);
    } catch (e) { showToast('error', e.message); }
  }, []);

  useEffect(() => { loadOptions(); }, [loadOptions]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (e) => setFilter(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleView = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.supplierId)   params.supplierId   = filter.supplierId;
      if (filter.productName)  params.productName  = filter.productName;
      if (filter.brand)        params.brand        = filter.brand;
      if (filter.model)        params.model        = filter.model;
      if (filter.from)         params.from         = filter.from;
      if (filter.to)           params.to           = filter.to;

      const res = await reportAPI.getReport(params);
      setRecords(res.data);
      setSummary(res.summary);
      setSelected(null);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleClear = () => {
    setFilter(EMPTY_FILTER);
    setRecords([]);
    setSummary(null);
    setSelected(null);
  };

  const handleDelete = async () => {
    if (!selected) return showToast('error', 'Select a record to delete');
    if (!window.confirm('Delete this sale record?')) return;
    try {
      await reportAPI.deleteSale(selected.id);
      showToast('success', 'Record deleted');
      handleView();
    } catch (e) { showToast('error', e.message); }
  };

  const s = styles;

  return (
    <div style={s.page}>
      {toast && <div style={{ ...s.toast, background: toast.type === 'success' ? '#10b981' : '#ef4444' }}>{toast.msg}</div>}

      <div style={s.header}>
        <div>
          <h1 style={s.title}>Total Report Master</h1>
          <p style={s.subtitle}>Generate and filter records</p>
        </div>
        <div style={s.entryDate}>
          <span style={s.entryLabel}>ENTRY DATE</span>
          <span style={s.entryValue}>{today}</span>
        </div>
      </div>

      <div style={s.card}>
        {/* Filter row 1 */}
        <div style={s.filterGrid}>
          <div style={s.field}>
            <label style={s.label}>SUPPLIER NAME</label>
            <select style={s.select} name="supplierId" value={filter.supplierId} onChange={handleChange}>
              <option value="">Select Supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplierName}</option>)}
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>PRODUCT NAME</label>
            <select style={s.select} name="productName" value={filter.productName} onChange={handleChange}>
              <option value="">Select Product</option>
              {products.map(p => <option key={p.id} value={p.productName}>{p.productName}</option>)}
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>BRAND</label>
            <select style={s.select} name="brand" value={filter.brand} onChange={handleChange}>
              <option value="">Select Brand</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>MODEL</label>
            <select style={s.select} name="model" value={filter.model} onChange={handleChange}>
              <option value="">Select Model</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Filter row 2: dates + buttons */}
        <div style={{ ...s.filterGrid, marginTop: 12, alignItems: 'flex-end' }}>
          <div style={s.field}>
            <label style={s.label}>FROM DATE</label>
            <input style={s.input} type="date" name="from" value={filter.from} onChange={handleChange} />
          </div>
          <div style={s.field}>
            <label style={s.label}>TO DATE</label>
            <input style={s.input} type="date" name="to" value={filter.to} onChange={handleChange} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingBottom: 0 }}>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={handleClear}>Clear</button>
            <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleView} disabled={loading}>
              {loading ? 'Loading...' : 'View'}
            </button>
          </div>
          <div /> {/* spacer */}
        </div>

        {/* Summary strip */}
        {summary && (
          <div style={s.summaryStrip}>
            <div style={s.summaryItem}>
              <span style={s.summaryLabel}>TOTAL RECORDS</span>
              <span style={s.summaryValue}>{summary.count}</span>
            </div>
            <div style={s.summaryItem}>
              <span style={s.summaryLabel}>TOTAL QTY</span>
              <span style={s.summaryValue}>{summary.totalQty?.toLocaleString('en-IN')}</span>
            </div>
            <div style={s.summaryItem}>
              <span style={s.summaryLabel}>TOTAL AMOUNT</span>
              <span style={{ ...s.summaryValue, color: '#4ade80' }}>₹{summary.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        {/* Table */}
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['SR NO', 'INVOICE NO', 'INV DATE', 'VENDOR NAME', 'ITEM ID', 'PRODUCT', 'MODEL', 'BRAND', 'QTY', 'AMOUNT'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={10} style={s.empty}>
                    Select filters above and click <strong>View</strong> to generate report.
                  </td>
                </tr>
              ) : records.map((rec, i) => (
                <tr key={rec.id}
                  style={{ ...s.tr, ...(selected?.id === rec.id ? s.trSelected : {}) }}
                  onClick={() => setSelected(selected?.id === rec.id ? null : rec)}>
                  <td style={s.td}>{i + 1}</td>
                  <td style={{ ...s.td, color: '#60a5fa' }}>{rec.invoiceNo}</td>
                  <td style={s.td}>{rec.invoiceDate ? new Date(rec.invoiceDate).toLocaleDateString() : '—'}</td>
                  <td style={s.td}>{rec.customer?.customerName || '—'}</td>
                  <td style={s.td}>{rec.itemId || '—'}</td>
                  <td style={{ ...s.td, fontWeight: 600 }}>{rec.productName || '—'}</td>
                  <td style={s.td}>{rec.model || '—'}</td>
                  <td style={s.td}>{rec.brand || '—'}</td>
                  <td style={{ ...s.td, textAlign: 'center' }}>{rec.quantity}</td>
                  <td style={{ ...s.td, color: '#4ade80' }}>{rec.amount ? `$${rec.amount.toLocaleString()}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Buttons */}
        <div style={{ ...s.btnRow, marginTop: 20 }}>
          <div style={s.btnLeft}>
            <button style={{ ...s.btn, ...s.btnPrimary }}>+ ADD</button>
            <button style={{ ...s.btn, ...s.btnSecondary }}>✎ EDIT</button>
            <button style={{ ...s.btn, ...s.btnDanger }} onClick={handleDelete}>🗑 DELETE</button>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={handleClear}>⊘ CLEAR</button>
          </div>
          <div style={s.btnRight}>
            <button style={{ ...s.btn, ...s.btnSuccess }}>💾 SAVE</button>
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
  filterGrid:   { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
  field:        { display: 'flex', flexDirection: 'column' },
  label:        { fontSize: 11, color: '#64748b', letterSpacing: 1, marginBottom: 6 },
  input:        { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  select:       { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', cursor: 'pointer' },
  summaryStrip: { display: 'flex', gap: 32, background: '#0f172a', borderRadius: 8, padding: '14px 20px', margin: '16px 0', border: '1px solid #334155' },
  summaryItem:  { display: 'flex', flexDirection: 'column' },
  summaryLabel: { fontSize: 10, color: '#64748b', letterSpacing: 1, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: 700, color: '#e2e8f0' },
  tableWrap:    { overflowX: 'auto', marginTop: 16 },
  table:        { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:           { padding: '10px 14px', textAlign: 'left', color: '#60a5fa', fontSize: 11, letterSpacing: 1, borderBottom: '1px solid #334155', textTransform: 'uppercase', whiteSpace: 'nowrap' },
  tr:           { borderBottom: '1px solid #1e293b', cursor: 'pointer' },
  trSelected:   { background: '#1e3a5f' },
  td:           { padding: '10px 14px', color: '#cbd5e1', whiteSpace: 'nowrap' },
  empty:        { textAlign: 'center', padding: 48, color: '#475569' },
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