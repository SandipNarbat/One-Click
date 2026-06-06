// src/pages/SalesPersonMaster.jsx
import { useState, useEffect, useCallback } from 'react';
import { salesPersonAPI } from '../api/axios';

const EMPTY_FORM = {
  name: '', mobile: '', contactNo: '', email: '', address: '', visible: true
};

export default function SalesPersonMaster() {
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [persons,     setPersons]     = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [nextId,      setNextId]      = useState('EMP-1001');
  const [loading,     setLoading]     = useState(false);
  const [toast,       setToast]       = useState(null);
  const [search,      setSearch]      = useState('');

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).replace(/ /g, '/');

  const load = useCallback(async () => {
    try {
      const res = await salesPersonAPI.getAll();
      setPersons(res.data);
    } catch (e) { showToast('error', e.message); }
  }, []);

  const loadNextId = useCallback(async () => {
    try { const r = await salesPersonAPI.getNextId(); setNextId(r.data); } catch {}
  }, []);

  useEffect(() => { load(); loadNextId(); }, [load, loadNextId]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

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

  const s = styles;

  return (
    <div style={s.page}>
      {toast && <div style={{ ...s.toast, background: toast.type === 'success' ? '#10b981' : '#ef4444' }}>{toast.msg}</div>}

      <div style={s.header}>
        <div>
          <h1 style={s.title}>Sales Persons Master</h1>
          <p style={s.subtitle}>Manage sales personnel details and access credentials.</p>
        </div>
        <div style={s.entryDate}>
          <span style={s.entryLabel}>ENTRY DATE</span>
          <span style={s.entryValue}>{today}</span>
        </div>
      </div>

      <div style={s.card}>
        {/* Row 1: Employee ID + Visible */}
        <div style={s.row}>
          <div style={s.field}>
            <label style={s.label}>EMPLOYEE ID</label>
            <div style={{ position: 'relative' }}>
              <input style={{ ...s.input, ...s.inputDisabled, paddingRight: 36 }}
                value={selected ? selected.employeeId : nextId} readOnly />
              <span style={s.lockIcon}>🔒</span>
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>VISIBLE</label>
            <select style={s.select} name="visible"
              value={form.visible ? 'Yes' : 'No'}
              onChange={e => setForm(f => ({ ...f, visible: e.target.value === 'Yes' }))}>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>

        {/* Row 2: Employee Name */}
        <div style={{ ...s.field, marginBottom: 16 }}>
          <label style={s.label}>EMPLOYEE NAME</label>
          <div style={{ position: 'relative' }}>
            <input style={{ ...s.input, paddingRight: 40 }}
              name="name" value={form.name} onChange={handleChange}
              placeholder="Search or enter name..."
              list="emp-names" />
            <span style={s.searchIcon}>🔍</span>
            <datalist id="emp-names">
              {persons.map(p => <option key={p.id} value={p.name} />)}
            </datalist>
          </div>
        </div>

        {/* Row 3: Mobile + Contact */}
        <div style={s.row}>
          <div style={s.field}>
            <label style={s.label}>MOBILE NO.</label>
            <input style={s.input} name="mobile" value={form.mobile}
              onChange={handleChange} placeholder="+1 (555) 000-0000" />
          </div>
          <div style={s.field}>
            <label style={s.label}>CONTACT NO.</label>
            <input style={s.input} name="contactNo" value={form.contactNo}
              onChange={handleChange} placeholder="+1 (555) 000-0000" />
          </div>
        </div>

        {/* Row 4: Email */}
        <div style={{ ...s.field, marginBottom: 16 }}>
          <label style={s.label}>EMAIL</label>
          <input style={s.input} name="email" type="email" value={form.email}
            onChange={handleChange} placeholder="employee@smartsts.com" />
        </div>

        {/* Row 5: Address */}
        <div style={{ ...s.field, marginBottom: 20 }}>
          <label style={s.label}>ADDRESS</label>
          <textarea style={s.textarea} name="address" value={form.address}
            onChange={handleChange} placeholder="Enter full address..." />
        </div>

        {/* Buttons */}
        <div style={s.btnRow}>
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
      <div style={s.card}>
        <div style={s.tableHeader}>
          <span style={s.tableTitle}>All Sales Persons ({filtered.length})</span>
          <input style={{ ...s.input, width: 260, margin: 0 }}
            placeholder="Search by name, ID or mobile..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Sr.', 'Employee ID', 'Name', 'Mobile', 'Contact', 'Email', 'Visible'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={7} style={s.empty}>No records found</td></tr>
                : filtered.map((p, i) => (
                  <tr key={p.id}
                    style={{ ...s.tr, ...(selected?.id === p.id ? s.trSelected : {}) }}
                    onClick={() => handleSelect(p)}>
                    <td style={s.td}>{i + 1}</td>
                    <td style={{ ...s.td, color: '#60a5fa' }}>{p.employeeId}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{p.name}</td>
                    <td style={s.td}>{p.mobile || '—'}</td>
                    <td style={s.td}>{p.contactNo || '—'}</td>
                    <td style={s.td}>{p.email || '—'}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: p.visible ? '#1a3a2a' : '#3a1a1a', color: p.visible ? '#4ade80' : '#f87171' }}>
                        {p.visible ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div style={s.tableFooter}>Showing {filtered.length} records</div>
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
  row:          { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  field:        { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 200 },
  label:        { fontSize: 11, color: '#64748b', letterSpacing: 1, marginBottom: 6 },
  input:        { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  inputDisabled:{ background: '#0d1a2d', color: '#94a3b8' },
  textarea:     { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', minHeight: 80, resize: 'vertical', fontFamily: 'inherit' },
  select:       { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', cursor: 'pointer' },
  lockIcon:     { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: 0.5 },
  searchIcon:   { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14 },
  btnRow:       { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  btnLeft:      { display: 'flex', gap: 8 },
  btnRight:     { display: 'flex', gap: 8 },
  btn:          { padding: '9px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnPrimary:   { background: '#6366f1', color: '#fff' },
  btnSecondary: { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' },
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
  badge:        { padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700 },
  empty:        { textAlign: 'center', padding: 40, color: '#475569' },
  tableFooter:  { fontSize: 12, color: '#475569', marginTop: 12 },
  toast:        { position: 'fixed', top: 20, right: 20, padding: '12px 24px', borderRadius: 8, color: '#fff', fontWeight: 600, zIndex: 9999, fontSize: 14 },
};