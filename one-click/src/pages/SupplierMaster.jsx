// src/pages/SupplierMaster.jsx
import { useState, useEffect, useCallback } from 'react';
import { supplierAPI } from '../api/axios';
import { readDraft, saveDraft, clearDraft } from '../hooks/useDraft';
import MasterLayout from '../components/MasterLayout';
import '../styles/masterStyles.css';
import './SupplierMaster.css';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh','Puducherry'
];

const EMPTY_FORM = {
  supplierName: '', contactPerson: '', email: '',
  mobile: '', landline: '', address: '',
  state: '', gstTin: '', aadharNo: '', panNo: ''
};

const DRAFT_KEY = 'supplier-master';

export default function SupplierMaster() {
  const [form,       setForm]       = useState(() => { const d = readDraft(DRAFT_KEY); return d ? { ...EMPTY_FORM, ...d } : EMPTY_FORM; });
  const [hasDraft]                 = useState(() => !!readDraft(DRAFT_KEY));
  const [suppliers,  setSuppliers]  = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [nextId,     setNextId]     = useState('SUP-0001');
  const [loading,    setLoading]    = useState(false);
  const [toast,      setToast]      = useState(null);
  const [search,     setSearch]     = useState('');
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).replace(/ /g, '/');

  const loadSuppliers = useCallback(async () => {
    try { const res = await supplierAPI.getAll(); setSuppliers(res.data); }
    catch (e) { showToast('error', e.message); }
  }, []);

  const loadNextId = useCallback(async () => {
    try { const res = await supplierAPI.getNextId(); setNextId(res.data); } catch {}
  }, []);

  useEffect(() => { loadSuppliers(); loadNextId(); }, [loadSuppliers, loadNextId]);

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

  const handleSelect = (s) => {
    clearDraft(DRAFT_KEY);
    setSelected(s);
    setForm({
      supplierName:  s.supplierName  || '', contactPerson: s.contactPerson || '',
      email:         s.email         || '', mobile:        s.mobile        || '',
      landline:      s.landline      || '', address:       s.address       || '',
      state:         s.state         || '', gstTin:        s.gstTin        || '',
      aadharNo:      s.aadharNo      || '', panNo:         s.panNo         || '',
    });
  };

  const handleClear = () => { clearDraft(DRAFT_KEY); setForm(EMPTY_FORM); setSelected(null); };

  const handleAdd = async () => {
    if (!form.supplierName.trim()) return showToast('error', 'Supplier name is required');
    setLoading(true);
    try {
      await supplierAPI.create(form);
      showToast('success', 'Supplier added successfully');
      handleClear(); loadSuppliers(); loadNextId();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!selected) return showToast('error', 'Select a supplier to update');
    setLoading(true);
    try {
      await supplierAPI.update(selected.id, form);
      showToast('success', 'Supplier updated');
      handleClear(); loadSuppliers();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selected) return showToast('error', 'Select a supplier to delete');
    if (!window.confirm(`Delete "${selected.supplierName}"?`)) return;
    setLoading(true);
    try {
      await supplierAPI.delete(selected.id);
      showToast('success', 'Supplier deleted');
      handleClear(); loadSuppliers(); loadNextId();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const filtered = suppliers.filter(s =>
    s.supplierName.toLowerCase().includes(search.toLowerCase()) ||
    s.supplierId.toLowerCase().includes(search.toLowerCase())
  );

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
            <h1 className="ms-page-title">Supplier Master</h1>
            <p className="ms-page-subtitle">Manage supplier master information</p>
          </div>
          <div className="ms-entry-date-box">
            <span className="ms-entry-label">ENTRY DATE</span>
            <span className="ms-entry-value">{today}</span>
          </div>
        </div>

        <div className="ms-form-card">
          {/* ID + Name */}
          <div className="ms-row">
            <div className="ms-field">
              <label className="ms-label">SUPPLIER ID</label>
              <input className="ms-input ms-input-disabled"
                value={selected ? selected.supplierId : nextId} readOnly />
            </div>
            <div className="ms-field flex-2">
              <label className="ms-label">SUPPLIER NAME</label>
              <input className="ms-input" name="supplierName" value={form.supplierName}
                onChange={handleChange} placeholder="Select or type supplier name..." list="supplier-list" />
              <datalist id="supplier-list">
                {suppliers.map(s => <option key={s.id} value={s.supplierName} />)}
              </datalist>
            </div>
          </div>

          {/* Contact */}
          <div className="ms-row">
            <div className="ms-field">
              <label className="ms-label">CONTACT PERSON NAME</label>
              <input className="ms-input" name="contactPerson" value={form.contactPerson}
                onChange={handleChange} placeholder="John Doe" />
            </div>
            <div className="ms-field">
              <label className="ms-label">EMAIL ADDRESS</label>
              <input className="ms-input" name="email" type="email" value={form.email}
                onChange={handleChange} placeholder="contact@supplier.com" />
            </div>
          </div>

          {/* Phone */}
          <div className="ms-row">
            <div className="ms-field">
              <label className="ms-label">MOBILE NO.</label>
              <div className="d-flex">
                <span className="ms-input-prefix-span">+91</span>
                <input className="ms-input flex-1 radius-right-only"
                  name="mobile" value={form.mobile} onChange={handleChange} placeholder="98765 43210" />
              </div>
            </div>
            <div className="ms-field">
              <label className="ms-label">CONTACT NO. (LANDLINE)</label>
              <input className="ms-input" name="landline" value={form.landline}
                onChange={handleChange} placeholder="022-22003344" />
            </div>
          </div>

          {/* Address */}
          <div className="ms-field mb-16">
            <label className="ms-label">FULL ADDRESS</label>
            <textarea className="ms-textarea" name="address" value={form.address}
              onChange={handleChange} placeholder="Enter complete office or warehouse address..." />
          </div>

          {/* State */}
          <div className="ms-field max-w-340 mb-16">
            <label className="ms-label">STATE</label>
            <select className="ms-select" name="state" value={form.state} onChange={handleChange}>
              <option value="">Select State</option>
              {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>

          {/* Legal */}
          <div className="ms-section-divider">LEGAL &amp; TAX COMPLIANCE</div>
          <div className="ms-row">
            <div className="ms-field">
              <label className="ms-label">GST TIN</label>
              <input className="ms-input" name="gstTin" value={form.gstTin}
                onChange={handleChange} placeholder="27AAAAA0000A1Z5" maxLength={15} />
            </div>
            <div className="ms-field">
              <label className="ms-label">AADHAR NO.</label>
              <input className="ms-input" name="aadharNo" value={form.aadharNo}
                onChange={handleChange} placeholder="0000-0000-0000" maxLength={14} />
            </div>
            <div className="ms-field">
              <label className="ms-label">PAN NO.</label>
              <input className="ms-input" name="panNo" value={form.panNo}
                onChange={handleChange} placeholder="ABCDE1234F" maxLength={10} />
            </div>
          </div>
        </div>

        {/* All Suppliers Table */}
        <div className="ms-table-card">
          <div className="ms-table-header">
            <span className="ms-table-title">All Suppliers ({filtered.length})</span>
            <input className="ms-input w-240 m-0"
              placeholder="Search by name or ID..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="ms-table-wrap">
            <table className="ms-table">
              <thead>
                <tr>
                  {['Sr.','Supplier ID','Name','Contact Person','Mobile','State','GST TIN'].map(h => (
                    <th key={h} className="ms-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="ms-empty">No suppliers found</td></tr>
                ) : filtered.map((sup, i) => (
                  <tr key={sup.id}
                    className={`ms-tr ${selected?.id === sup.id ? 'ms-tr-selected' : ''}`}
                    onClick={() => handleSelect(sup)}>
                    <td className="ms-td">{i + 1}</td>
                    <td className="ms-td sm-id-cell">{sup.supplierId}</td>
                    <td className="ms-td sm-name-cell">{sup.supplierName}</td>
                    <td className="ms-td">{sup.contactPerson || '—'}</td>
                    <td className="ms-td">{sup.mobile || '—'}</td>
                    <td className="ms-td">{sup.state || '—'}</td>
                    <td className="ms-td">{sup.gstTin || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ms-table-footer">Showing {filtered.length} records</div>
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
