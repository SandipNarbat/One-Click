// src/pages/SalesPersonMaster.jsx
import { useState, useEffect, useCallback } from 'react';
import { salesPersonAPI } from '../api/axios';
import MasterLayout from '../components/MasterLayout';
import '../styles/masterStyles.css';
import './SalesPersonMaster.css';

const EMPTY_FORM = {
  name: '', mobile: '', contactNo: '', email: '', address: '', visible: true
};

export default function SalesPersonMaster() {
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [persons,  setPersons]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [nextId,   setNextId]   = useState('EMP-1001');
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState(null);
  const [search,   setSearch]   = useState('');

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).replace(/ /g, '/');

  const load = useCallback(async () => {
    try { const res = await salesPersonAPI.getAll(); setPersons(res.data); }
    catch (e) { showToast('error', e.message); }
  }, []);

  const loadNextId = useCallback(async () => {
    try { const r = await salesPersonAPI.getNextId(); setNextId(r.data); } catch {}
  }, []);

  useEffect(() => { load(); loadNextId(); }, [load, loadNextId]);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [e.target.name]: val }));
  };

  const handleSelect = (p) => {
    setSelected(p);
    setForm({ name: p.name || '', mobile: p.mobile || '', contactNo: p.contactNo || '', email: p.email || '', address: p.address || '', visible: p.visible ?? true });
  };

  const handleClear = () => { setForm(EMPTY_FORM); setSelected(null); };

  const handleAdd = async () => {
    if (!form.name.trim()) return showToast('error', 'Name is required');
    setLoading(true);
    try {
      await salesPersonAPI.create(form);
      showToast('success', 'Sales person added');
      handleClear(); load(); loadNextId();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!selected) return showToast('error', 'Select a record to update');
    setLoading(true);
    try {
      await salesPersonAPI.update(selected.id, form);
      showToast('success', 'Updated successfully');
      handleClear(); load();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selected) return showToast('error', 'Select a record to delete');
    if (!window.confirm(`Delete "${selected.name}"?`)) return;
    setLoading(true);
    try {
      await salesPersonAPI.delete(selected.id);
      showToast('success', 'Deleted successfully');
      handleClear(); load(); loadNextId();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const filtered = persons.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.employeeId.toLowerCase().includes(search.toLowerCase()) ||
    (p.mobile || '').includes(search)
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
            <h1 className="ms-page-title">Sales Persons Master</h1>
            <p className="ms-page-subtitle">Manage sales personnel details and access credentials.</p>
          </div>
          <div className="ms-entry-date-box">
            <span className="ms-entry-label">ENTRY DATE</span>
            <span className="ms-entry-value">{today}</span>
          </div>
        </div>

        <div className="ms-form-card">
          {/* Row 1: Employee ID + Visible */}
          <div className="ms-row">
            <div className="ms-field">
              <label className="ms-label">EMPLOYEE ID</label>
              <input className="ms-input ms-input-disabled"
                value={selected ? selected.employeeId : nextId} readOnly />
            </div>
            <div className="ms-field">
              <label className="ms-label">VISIBLE</label>
              <select className="ms-select" name="visible"
                value={form.visible ? 'Yes' : 'No'}
                onChange={e => setForm(f => ({ ...f, visible: e.target.value === 'Yes' }))}>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>

          {/* Employee Name */}
          <div className="ms-field mb-16">
            <label className="ms-label">EMPLOYEE NAME</label>
            <input className="ms-input" name="name" value={form.name} onChange={handleChange}
              placeholder="Search or enter name..." list="emp-names" />
            <datalist id="emp-names">
              {persons.map(p => <option key={p.id} value={p.name} />)}
            </datalist>
          </div>

          {/* Mobile + Contact */}
          <div className="ms-row">
            <div className="ms-field">
              <label className="ms-label">MOBILE NO.</label>
              <input className="ms-input" name="mobile" value={form.mobile}
                onChange={handleChange} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="ms-field">
              <label className="ms-label">CONTACT NO.</label>
              <input className="ms-input" name="contactNo" value={form.contactNo}
                onChange={handleChange} placeholder="+1 (555) 000-0000" />
            </div>
          </div>

          {/* Email */}
          <div className="ms-field mb-16">
            <label className="ms-label">EMAIL</label>
            <input className="ms-input" name="email" type="email" value={form.email}
              onChange={handleChange} placeholder="employee@smartsts.com" />
          </div>

          {/* Address */}
          <div className="ms-field mb-14">
            <label className="ms-label">ADDRESS</label>
            <textarea className="ms-textarea" name="address" value={form.address}
              onChange={handleChange} placeholder="Enter full address..." />
          </div>
        </div>

        {/* Table */}
        <div className="ms-table-card">
          <div className="ms-table-header">
            <span className="ms-table-title">All Sales Persons ({filtered.length})</span>
            <input className="ms-input sp-search-input"
              placeholder="Search by name, ID or mobile..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="ms-table-wrap">
            <table className="ms-table">
              <thead>
                <tr>
                  {['Sr.','Employee ID','Name','Mobile','Contact','Email','Visible'].map(h => (
                    <th key={h} className="ms-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={7} className="ms-empty">No records found</td></tr>
                  : filtered.map((p, i) => (
                    <tr key={p.id}
                      className={`ms-tr ${selected?.id === p.id ? 'ms-tr-selected' : ''}`}
                      onClick={() => handleSelect(p)}>
                      <td className="ms-td">{i + 1}</td>
                      <td className="ms-td sp-id-cell">{p.employeeId}</td>
                      <td className="ms-td sp-name-cell">{p.name}</td>
                      <td className="ms-td">{p.mobile || '—'}</td>
                      <td className="ms-td">{p.contactNo || '—'}</td>
                      <td className="ms-td">{p.email || '—'}</td>
                      <td className="ms-td">
                        <span className={`ms-badge ${p.visible ? 'badge-multi' : 'badge-single'}`} style={{ background: p.visible ? '#1a3a2a' : '#3a1a1a', color: p.visible ? '#4ade80' : '#f87171' }}>
                          {p.visible ? 'Yes' : 'No'}
                        </span>
                      </td>
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