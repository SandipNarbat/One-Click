// src/pages/ServiceCenterMaster.jsx
import { useState, useEffect, useCallback } from 'react';
import { serviceCenterAPI } from '../api/axios';
import { readDraft, saveDraft, clearDraft } from '../hooks/useDraft';
import MasterLayout from '../components/MasterLayout';
import '../styles/masterStyles.css';
import './ServiceCenterMaster.css';
import './PrintReport.css';

const EMPTY_FORM = { productType: '', brandName: '', serviceCentreNo: '' };

const DRAFT_KEY = 'service-center-master';

export default function ServiceCenterMaster() {
  const [form,     setForm]     = useState(() => { const d = readDraft(DRAFT_KEY); return d ? { ...EMPTY_FORM, ...d } : EMPTY_FORM; });
  const [hasDraft]              = useState(() => !!readDraft(DRAFT_KEY));
  const [centers,  setCenters]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [products, setProducts] = useState([]);
  const [brands,   setBrands]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState(null);

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
      setCenters(cenRes.data); setProducts(ptRes.data); setBrands(brRes.data);
    } catch (e) { showToast('error', e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (hasDraft) showToast('info', 'Draft restored — you have unsaved changes'); }, []);
  useEffect(() => {
    if (!selected) {
      const hasData = Object.keys(EMPTY_FORM).some(k => form[k] !== EMPTY_FORM[k]);
      hasData ? saveDraft(DRAFT_KEY, form) : clearDraft(DRAFT_KEY);
    }
  }, [form, selected]); // eslint-disable-line

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSelect = (c) => {
    clearDraft(DRAFT_KEY);
    setSelected(c);
    setForm({ productType: c.productType || '', brandName: c.brandName || '', serviceCentreNo: c.serviceCentreNo || '' });
  };

  const handleClear = () => { clearDraft(DRAFT_KEY); setForm(EMPTY_FORM); setSelected(null); };

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
            <h1 className="ms-page-title">Service Center Master</h1>
            <p className="ms-page-subtitle">Manage and configure service centre entity records.</p>
          </div>
          <div className="ms-entry-date-box">
            <span className="ms-entry-label">ENTRY DATE</span>
            <span className="ms-entry-value">{today}</span>
          </div>
        </div>

        <div className="ms-form-card">
          <div className="sc-form-container">

            <div className="sc-field-row">
              <label className="sc-label">Sr No :</label>
              <input className="ms-input ms-input-disabled flex-1"
                value={selected ? selected.serialNo : 'Auto-generated'} readOnly />
            </div>

            <div className="sc-field-row">
              <label className="sc-label">Product Type :</label>
              <select className="ms-select flex-1" name="productType" value={form.productType} onChange={handleChange}>
                <option value="">Select Product Type...</option>
                {products.map(p => <option key={p.id} value={p.productName}>{p.productName}</option>)}
              </select>
            </div>

            <div className="sc-field-row">
              <label className="sc-label">Brand Name :</label>
              <select className="ms-select flex-1" name="brandName" value={form.brandName} onChange={handleChange}>
                <option value="">Select Brand...</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="sc-field-row">
              <label className="sc-label">Service Centre No :</label>
              <input className="ms-input flex-1" name="serviceCentreNo" value={form.serviceCentreNo}
                onChange={handleChange} placeholder="Enter centre number..." />
            </div>
          </div>
        </div>

        {/* Table */}
        {centers.length > 0 && (
          <div className="ms-table-card">
            <div className="ms-table-header">
              <span className="ms-table-title">Service Centers ({centers.length})</span>
            </div>
            <div className="ms-table-wrap">
              <table className="ms-table">
                <thead>
                  <tr>
                    {['Sr.','Serial No','Product Type','Brand Name','Centre No'].map(h => (
                      <th key={h} className="ms-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {centers.map((c, i) => (
                    <tr key={c.id}
                      className={`ms-tr ${selected?.id === c.id ? 'ms-tr-selected' : ''}`}
                      onClick={() => handleSelect(c)}>
                      <td className="ms-td">{i + 1}</td>
                      <td className="ms-td sc-id-cell">{c.serialNo}</td>
                      <td className="ms-td sc-name-cell">{c.productType || '—'}</td>
                      <td className="ms-td">{c.brandName || '—'}</td>
                      <td className="ms-td">{c.serviceCentreNo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ms-table-footer">Showing {centers.length} records</div>
          </div>
        )}

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

      {/* ── Print Report ── */}
      <div className="pr-print-only">
        <div className="pr-ph-row">
          <div>
            <div className="pr-ph-company">SMART STS</div>
            <div className="pr-ph-tagline">Smart Service &amp; Trading Solutions</div>
          </div>
          <div className="pr-ph-right">
            <div className="pr-ph-title">SERVICE CENTER REPORT</div>
            <div className="pr-ph-meta">{centers.length} records · Printed: {today}</div>
          </div>
        </div>
        <hr className="pr-ph-rule" />
        <div className="pr-ps-strip">
          <div className="pr-ps-cell">
            <span className="pr-ps-label">Total Centers</span>
            <span className="pr-ps-value">{centers.length}</span>
          </div>
          <div className="pr-ps-cell">
            <span className="pr-ps-label">Product Types</span>
            <span className="pr-ps-value pr-ps-blue">{new Set(centers.map(c => c.productType).filter(Boolean)).size}</span>
          </div>
          <div className="pr-ps-cell pr-ps-accent">
            <span className="pr-ps-label">Brands</span>
            <span className="pr-ps-value pr-ps-money">{new Set(centers.map(c => c.brandName).filter(Boolean)).size}</span>
          </div>
        </div>
        <table className="pr-pt">
          <thead>
            <tr>
              <th className="pr-pt-th pr-pt-sr">Sr.</th>
              <th className="pr-pt-th">Serial No.</th>
              <th className="pr-pt-th">Product Type</th>
              <th className="pr-pt-th">Brand Name</th>
              <th className="pr-pt-th">Centre No.</th>
            </tr>
          </thead>
          <tbody>
            {centers.map((c, i) => (
              <tr key={c.id} className={i % 2 === 1 ? 'pr-pt-alt' : ''}>
                <td className="pr-pt-td pr-pt-sr">{i + 1}</td>
                <td className="pr-pt-td pr-pt-bold pr-pt-blue">{c.serialNo}</td>
                <td className="pr-pt-td">{c.productType || '—'}</td>
                <td className="pr-pt-td pr-pt-bold">{c.brandName || '—'}</td>
                <td className="pr-pt-td">{c.serviceCentreNo || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pr-pf-row">
          <span>Generated by Smart STS · {today}, {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
          <div className="pr-pf-sig">Authorised Signatory</div>
        </div>
      </div>
    </MasterLayout>
  );
}