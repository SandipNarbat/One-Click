// src/pages/TotalReport.jsx
import { useState, useEffect, useCallback } from 'react';
import { reportAPI } from '../api/axios';
import MasterLayout from '../components/MasterLayout';
import '../styles/masterStyles.css';
import './TotalReport.css';

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
        reportAPI.getSuppliers(), reportAPI.getProducts(),
        reportAPI.getBrands(), reportAPI.getModels(),
      ]);
      setSuppliers(sRes.data); setProducts(pRes.data); setBrands(bRes.data); setModels(mRes.data);
    } catch (e) { showToast('error', e.message); }
  }, []);

  useEffect(() => { loadOptions(); }, [loadOptions]);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };
  const handleChange = (e) => setFilter(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleView = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.supplierId)  params.supplierId  = filter.supplierId;
      if (filter.productName) params.productName = filter.productName;
      if (filter.brand)       params.brand       = filter.brand;
      if (filter.model)       params.model       = filter.model;
      if (filter.from)        params.from        = filter.from;
      if (filter.to)          params.to          = filter.to;
      const res = await reportAPI.getReport(params);
      setRecords(res.data); setSummary(res.summary); setSelected(null);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleClear = () => { setFilter(EMPTY_FILTER); setRecords([]); setSummary(null); setSelected(null); };

  const handleDelete = async () => {
    if (!selected) return showToast('error', 'Select a record to delete');
    if (!window.confirm('Delete this sale record?')) return;
    try {
      await reportAPI.deleteSale(selected.id);
      showToast('success', 'Record deleted'); handleView();
    } catch (e) { showToast('error', e.message); }
  };

  return (
    <MasterLayout>
      {toast && (
        <div className={`ms-toast ms-toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}
      <div className="ms-page">
        <div className="ms-page-header">
          <div>
            <h1 className="ms-page-title">Total Report Master</h1>
            <p className="ms-page-subtitle">Generate and filter records</p>
          </div>
          <div className="ms-entry-date-box">
            <span className="ms-entry-label">ENTRY DATE</span>
            <span className="ms-entry-value">{today}</span>
          </div>
        </div>

        <div className="ms-form-card">
          {/* Filter Grid */}
          <div className="tr-filter-grid-4">
            <div className="ms-field">
              <label className="ms-label">SUPPLIER NAME</label>
              <select className="ms-select" name="supplierId" value={filter.supplierId} onChange={handleChange}>
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplierName}</option>)}
              </select>
            </div>
            <div className="ms-field">
              <label className="ms-label">PRODUCT NAME</label>
              <select className="ms-select" name="productName" value={filter.productName} onChange={handleChange}>
                <option value="">Select Product</option>
                {products.map(p => <option key={p.id} value={p.productName}>{p.productName}</option>)}
              </select>
            </div>
            <div className="ms-field">
              <label className="ms-label">BRAND</label>
              <select className="ms-select" name="brand" value={filter.brand} onChange={handleChange}>
                <option value="">Select Brand</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="ms-field">
              <label className="ms-label">MODEL</label>
              <select className="ms-select" name="model" value={filter.model} onChange={handleChange}>
                <option value="">Select Model</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="tr-filter-grid-align-end">
            <div className="ms-field">
              <label className="ms-label">FROM DATE</label>
              <input className="ms-input" type="date" name="from" value={filter.from} onChange={handleChange} />
            </div>
            <div className="ms-field">
              <label className="ms-label">TO DATE</label>
              <input className="ms-input" type="date" name="to" value={filter.to} onChange={handleChange} />
            </div>
            <div className="d-flex gap-8">
              <button className="ms-btn ms-btn-clear" onClick={handleClear}>Clear</button>
              <button className="ms-btn ms-btn-show" onClick={handleView} disabled={loading}>
                {loading ? 'Loading...' : 'View'}
              </button>
            </div>
          </div>

          {/* Summary strip */}
          {summary && (
            <div className="tr-summary-strip">
              {[
                { label: 'TOTAL RECORDS', value: summary.count, color: '#f1f5f9' },
                { label: 'TOTAL QTY', value: summary.totalQty?.toLocaleString('en-IN'), color: '#f1f5f9' },
                { label: 'TOTAL AMOUNT', value: `₹${summary.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#4ade80' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="tr-summary-label">{label}</div>
                  <div className="tr-summary-value" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="tr-table-container">
            <table className="ms-table">
              <thead>
                <tr>
                  {['SR NO','INVOICE NO','INV DATE','VENDOR NAME','ITEM ID','PRODUCT','MODEL','BRAND','QTY','AMOUNT'].map(h => (
                    <th key={h} className="ms-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={10} className="ms-empty">Select filters above and click <strong>View</strong> to generate report.</td></tr>
                ) : records.map((rec, i) => (
                  <tr key={rec.id}
                    className={`ms-tr ${selected?.id === rec.id ? 'ms-tr-selected' : ''}`}
                    onClick={() => setSelected(selected?.id === rec.id ? null : rec)}>
                    <td className="ms-td">{i + 1}</td>
                    <td className="ms-td tr-id-cell">{rec.invoiceNo}</td>
                    <td className="ms-td">{rec.invoiceDate ? new Date(rec.invoiceDate).toLocaleDateString() : '—'}</td>
                    <td className="ms-td">{rec.customer?.customerName || '—'}</td>
                    <td className="ms-td">{rec.itemId || '—'}</td>
                    <td className="ms-td tr-name-cell">{rec.productName || '—'}</td>
                    <td className="ms-td">{rec.model || '—'}</td>
                    <td className="ms-td">{rec.brand || '—'}</td>
                    <td className="ms-td tr-center-cell">{rec.quantity}</td>
                    <td className="ms-td tr-amount-cell">{rec.amount ? `₹${rec.amount.toLocaleString('en-IN')}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Bar */}
        <div className="ms-action-bar">
          <div className="ms-action-left">
            <button className="ms-btn ms-btn-add"><span>+</span> ADD</button>
            <button className="ms-btn ms-btn-edit">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              EDIT
            </button>
            <button className="ms-btn ms-btn-delete" onClick={handleDelete}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              DELETE
            </button>
            <button className="ms-btn ms-btn-clear" onClick={handleClear}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              CLEAR
            </button>
          </div>
          <div className="ms-action-right">
            <button className="ms-btn ms-btn-save">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              SAVE
            </button>
            <button className="ms-btn ms-btn-print" onClick={() => window.print()}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              PRINT
            </button>
            <button className="ms-btn ms-btn-back" onClick={handleClear}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              BACK
            </button>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
}