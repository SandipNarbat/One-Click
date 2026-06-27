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
                    <td className="ms-td tr-amount-cell">{rec.amount ? `$${rec.amount.toLocaleString()}` : '—'}</td>
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
            <button className="ms-btn ms-btn-edit">✎ EDIT</button>
            <button className="ms-btn ms-btn-delete" onClick={handleDelete}>🗑 DELETE</button>
            <button className="ms-btn ms-btn-clear" onClick={handleClear}>⊘ CLEAR</button>
          </div>
          <div className="ms-action-right">
            <button className="ms-btn ms-btn-save">💾 SAVE</button>
            <button className="ms-btn ms-btn-print" onClick={() => window.print()}>🖨 PRINT</button>
            <button className="ms-btn ms-btn-back" onClick={handleClear}>← BACK</button>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
}