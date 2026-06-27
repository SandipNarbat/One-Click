// src/pages/DOAAdjust.jsx
import { useState, useEffect, useCallback } from 'react';
import { doaAPI, supplierAPI } from '../api/axios';
import MasterLayout from '../components/MasterLayout';
import '../styles/masterStyles.css';
import './DOAAdjust.css';

const EMPTY_FORM = {
  supplierId: '', invoiceNo: '', invoiceDate: '',
  totalQty: '', totalAmount: '', itemId: '', productName: ''
};

export default function DOAAdjust() {
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [records,   setRecords]   = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [activeId,  setActiveId]  = useState('lblinid');
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState(null);
  const [page,      setPage]      = useState(0);

  const PAGE_SIZE = 8;
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).replace(/ /g, '/');

  const loadSuppliers = useCallback(async () => {
    try { const res = await supplierAPI.getAll(); setSuppliers(res.data); }
    catch (e) { showToast('error', e.message); }
  }, []);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const loadRecords = useCallback(async (suppId) => {
    if (!suppId) { setRecords([]); return; }
    try {
      const res = await doaAPI.getBySupplier(suppId);
      setRecords(res.data); setPage(0);
    } catch (e) { showToast('error', e.message); }
  }, []);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };
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
      supplierId:  String(rec.supplierId),
      invoiceNo:   rec.invoiceNo   || '',
      invoiceDate: rec.invoiceDate ? rec.invoiceDate.slice(0, 10) : '',
      totalQty:    String(rec.totalQty   || ''),
      totalAmount: String(rec.totalAmount || ''),
      itemId:      rec.itemId      || '',
      productName: rec.productName || '',
    });
  };

  const handleClear = () => { setForm(EMPTY_FORM); setSelected(null); setRecords([]); setActiveId('lblinid'); };

  const handleAdd = async () => {
    if (!form.supplierId || !form.invoiceNo || !form.invoiceDate)
      return showToast('error', 'Supplier, invoice no and date are required');
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
      setSelected(null); loadRecords(form.supplierId);
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
      setSelected(null); loadRecords(form.supplierId);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const paged   = records.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const maxPage = Math.ceil(records.length / PAGE_SIZE) - 1;

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
            <h1 className="ms-page-title">DOA Adjust</h1>
            <p className="ms-page-subtitle">Manage and process DOA adjustments and bill information.</p>
          </div>
          <div className="ms-entry-date-box">
            <span className="ms-entry-label">ENTRY DATE</span>
            <span className="ms-entry-value">{today}</span>
          </div>
        </div>

        <div className="ms-form-card">
          {/* Supplier selector */}
          <div className="da-select-container">
            <label className="ms-label da-select-label">BILL INFO / SELECT SUPPLIER NAME</label>
            <div className="da-select-row">
              <select className="ms-select da-select-field"
                name="supplierId" value={form.supplierId} onChange={handleSupplierChange}>
                <option value="">Select a supplier...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.supplierName}</option>
                ))}
              </select>
              {/* Active ID box */}
              <div className="da-active-id-box">
                <span className="da-active-id-label">Active ID</span>
                <span className="da-active-id-value">{activeId}</span>
              </div>
              <button className="ms-btn ms-btn-show da-btn-show"
                onClick={() => loadRecords(form.supplierId)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                Show
              </button>
            </div>
          </div>

          {/* Form fields — only when supplier selected */}
          {form.supplierId && (
            <>
              <div className="ms-row">
                <div className="ms-field">
                  <label className="ms-label">INVOICE NO</label>
                  <input className="ms-input" name="invoiceNo" value={form.invoiceNo}
                    onChange={handleChange} placeholder="INV-001" />
                </div>
                <div className="ms-field">
                  <label className="ms-label">INVOICE DATE</label>
                  <input className="ms-input" type="date" name="invoiceDate" value={form.invoiceDate}
                    onChange={handleChange} />
                </div>
                <div className="ms-field">
                  <label className="ms-label">TOTAL QTY</label>
                  <input className="ms-input" type="number" name="totalQty" value={form.totalQty}
                    onChange={handleChange} placeholder="0" min="0" />
                </div>
                <div className="ms-field">
                  <label className="ms-label">TOTAL AMOUNT (₹)</label>
                  <input className="ms-input" type="number" name="totalAmount" value={form.totalAmount}
                    onChange={handleChange} placeholder="0.00" step="0.01" />
                </div>
              </div>
              <div className="ms-row">
                <div className="ms-field">
                  <label className="ms-label">ITEM ID</label>
                  <input className="ms-input" name="itemId" value={form.itemId}
                    onChange={handleChange} placeholder="ITM-XXXX" />
                </div>
                <div className="ms-field flex-2">
                  <label className="ms-label">PRODUCT NAME</label>
                  <input className="ms-input" name="productName" value={form.productName}
                    onChange={handleChange} placeholder="Product name..." />
                </div>
              </div>
            </>
          )}

          {/* Records Table */}
          <div className="da-table-container">
            <table className="ms-table">
              <thead>
                <tr>
                  {['SR NO','INVOICE NO','INV DATE','TOTAL QTY','TOTAL AMOUNT','ITEM ID','PRODUCT NAME'].map(h => (
                    <th key={h} className="ms-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="ms-empty">
                      <div className="da-empty-wrap">
                        <div className="da-empty-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                        </div>
                        <div>Select a supplier to view DOA records.</div>
                      </div>
                    </td>
                  </tr>
                ) : paged.map((rec, i) => (
                  <tr key={rec.id}
                    className={`ms-tr ${selected?.id === rec.id ? 'ms-tr-selected' : ''}`}
                    onClick={() => handleSelectRecord(rec)}>
                    <td className="ms-td">{page * PAGE_SIZE + i + 1}</td>
                    <td className="ms-td da-id-cell">{rec.invoiceNo}</td>
                    <td className="ms-td">{rec.invoiceDate ? new Date(rec.invoiceDate).toLocaleDateString() : '—'}</td>
                    <td className="ms-td da-center-cell">{rec.totalQty}</td>
                    <td className="ms-td">₹{rec.totalAmount?.toLocaleString('en-IN')}</td>
                    <td className="ms-td">{rec.itemId || '—'}</td>
                    <td className="ms-td da-name-cell">{rec.productName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="da-pagination-bar">
              <span>Showing {records.length} records</span>
              {maxPage > 0 && (
                <div className="da-pagination-btns">
                  <button className="da-pagination-btn"
                    onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <button className="da-pagination-btn"
                    onClick={() => setPage(p => Math.min(maxPage, p + 1))} disabled={page >= maxPage}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="ms-action-bar">
          <div className="ms-action-left">
            <button className="ms-btn ms-btn-add" onClick={handleAdd} disabled={loading}><span>+</span> ADD</button>
            <button className="ms-btn ms-btn-edit" onClick={handleSave} disabled={loading}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              EDIT
            </button>
            <button className="ms-btn ms-btn-delete" onClick={handleDelete} disabled={loading}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              DELETE
            </button>
            <button className="ms-btn ms-btn-clear" onClick={handleClear}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              CLEAR
            </button>
          </div>
          <div className="ms-action-right">
            <button className="ms-btn ms-btn-save" onClick={handleSave} disabled={loading}>
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