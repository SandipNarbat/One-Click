// src/pages/CustomerMaster.jsx
import { useState, useEffect, useCallback } from 'react';
import { customerAPI } from '../api/axios';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh','Puducherry'
];

const EMPTY_FORM = {
  customerName: '', email: '', contactNo: '',
  mobileNo: '', address: '', state: '',
  gstTin: '', aadharNo: '', panNo: ''
};

export default function CustomerMaster() {
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [customers, setCustomers] = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [nextId,    setNextId]    = useState('CUST-0001');
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState(null);
  const [search,    setSearch]    = useState('');

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).replace(/ /g, '/');

  const loadCustomers = useCallback(async () => {
    try {
      const res = await customerAPI.getAll();
      setCustomers(res.data);
    } catch (e) { showToast('error', e.message); }
  }, []);

  const loadNextId = useCallback(async () => {
    try {
      const res = await customerAPI.getNextId();
      setNextId(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    loadCustomers();
    loadNextId();
  }, [loadCustomers, loadNextId]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSelect = (customer) => {
    setSelected(customer);
    setForm({
      customerName: customer.customerName || '',
      email:        customer.email        || '',
      contactNo:    customer.contactNo    || '',
      mobileNo:     customer.mobileNo     || '',
      address:      customer.address      || '',
      state:        customer.state        || '',
      gstTin:       customer.gstTin       || '',
      aadharNo:     customer.aadharNo     || '',
      panNo:        customer.panNo        || '',
    });
  };

  const handleClear = () => { setForm(EMPTY_FORM); setSelected(null); };

  const handleAdd = async () => {
    if (!form.customerName.trim()) return showToast('error', 'Customer name is required');
    setLoading(true);
    try {
      await customerAPI.create(form);
      showToast('success', 'Customer added successfully');
      handleClear(); loadCustomers(); loadNextId();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!selected) return showToast('error', 'Select a customer to update');
    setLoading(true);
    try {
      await customerAPI.update(selected.id, form);
      showToast('success', 'Customer updated');
      handleClear(); loadCustomers();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selected) return showToast('error', 'Select a customer to delete');
    if (!window.confirm(`Delete "${selected.customerName}"?`)) return;
    setLoading(true);
    try {
      await customerAPI.delete(selected.id);
      showToast('success', 'Customer deleted');
      handleClear(); loadCustomers(); loadNextId();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const filtered = customers.filter(c =>
    c.customerName.toLowerCase().includes(search.toLowerCase()) ||
    c.customerId.toLowerCase().includes(search.toLowerCase()) ||
    (c.mobileNo || '').includes(search)
  );

  const s = styles;

  return (
    <div style={s.page}>
      {toast && (
        <div style={{ ...s.toast, background: toast.type === 'success' ? '#10b981' : '#ef4444' }}>
          {toast.msg}
        </div>
      )}

      <div style={s.header}>
        <div>
          <h1 style={s.title}>Customer Master</h1>
          <p style={s.subtitle}>Manage customer master information</p>
        </div>
        <div style={s.entryDate}>
          <span style={s.entryLabel}>ENTRY DATE</span>
          <span style={s.entryValue}>{today}</span>
        </div>
      </div>

      <div style={s.card}>
        {/* ID + Name */}
        <div style={s.row}>
          <div style={s.field}>
            <label style={s.label}>CUSTOMER ID</label>
            <input style={{ ...s.input, ...s.inputDisabled }}
              value={selected ? selected.customerId : nextId} readOnly />
          </div>
          <div style={{ ...s.field, flex: 2 }}>
            <label style={s.label}>CUSTOMER NAME</label>
            <input style={s.input} name="customerName" value={form.customerName}
              onChange={handleChange} placeholder="Select or type customer name..."
              list="customer-list" />
            <datalist id="customer-list">
              {customers.map(c => <option key={c.id} value={c.customerName} />)}
            </datalist>
          </div>
        </div>

        {/* Email */}
        <div style={{ ...s.field, marginBottom: 16 }}>
          <label style={s.label}>EMAIL ADDRESS</label>
          <input style={s.input} name="email" type="email" value={form.email}
            onChange={handleChange} placeholder="customer@domain.com" />
        </div>

        {/* Contact */}
        <div style={s.row}>
          <div style={s.field}>
            <label style={s.label}>CONTACT NO.</label>
            <input style={s.input} name="contactNo" value={form.contactNo}
              onChange={handleChange} placeholder="022-1234567" />
          </div>
          <div style={s.field}>
            <label style={s.label}>MOBILE NO.</label>
            <input style={s.input} name="mobileNo" value={form.mobileNo}
              onChange={handleChange} placeholder="+91 9876543210" />
          </div>
        </div>

        {/* Address */}
        <div style={{ ...s.field, marginBottom: 16 }}>
          <label style={s.label}>FULL ADDRESS</label>
          <textarea style={s.textarea} name="address" value={form.address}
            onChange={handleChange} placeholder="Enter complete billing or shipping address..." />
        </div>

        {/* State */}
        <div style={{ ...s.field, maxWidth: 320, marginBottom: 16 }}>
          <label style={s.label}>STATE</label>
          <select style={s.select} name="state" value={form.state} onChange={handleChange}>
            <option value="">Select State</option>
            {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>

        {/* Legal */}
        <div style={s.sectionLabel}>LEGAL &amp; TAX COMPLIANCE</div>
        <div style={s.row}>
          <div style={s.field}>
            <label style={s.label}>GST TIN</label>
            <input style={s.input} name="gstTin" value={form.gstTin}
              onChange={handleChange} placeholder="27AAAAA0000A1Z5" maxLength={15} />
          </div>
          <div style={s.field}>
            <label style={s.label}>AADHAR NO.</label>
            <input style={s.input} name="aadharNo" value={form.aadharNo}
              onChange={handleChange} placeholder="0000-0000-0000" maxLength={14} />
          </div>
          <div style={s.field}>
            <label style={s.label}>PAN NO.</label>
            <input style={s.input} name="panNo" value={form.panNo}
              onChange={handleChange} placeholder="ABCDE1234F" maxLength={10} />
          </div>
        </div>

        {/* Buttons */}
        <div style={s.btnRow}>
          <div style={s.btnLeft}>
            <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleAdd} disabled={loading}>+ ADD</button>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={handleSave} disabled={loading}>✎ UPDATE</button>
            <button style={{ ...s.btn, ...s.btnDanger }} onClick={handleDelete} disabled={loading}>🗑 DELETE</button>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={handleClear}>⊘ CLEAR</button>
          </div>
          <div style={s.btnRight}>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={() => window.print()}>🖨 PRINT</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={s.card}>
        <div style={s.tableHeader}>
          <span style={s.tableTitle}>All Customers ({filtered.length})</span>
          <input style={{ ...s.input, width: 260, margin: 0 }}
            placeholder="Search by name, ID or mobile..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Sr.','Customer ID','Name','Mobile','Contact','State','GST TIN'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={s.empty}>No customers found</td></tr>
              ) : filtered.map((c, i) => (
                <tr key={c.id}
                  style={{ ...s.tr, ...(selected?.id === c.id ? s.trSelected : {}) }}
                  onClick={() => handleSelect(c)}>
                  <td style={s.td}>{i + 1}</td>
                  <td style={{ ...s.td, color: '#60a5fa' }}>{c.customerId}</td>
                  <td style={{ ...s.td, fontWeight: 600 }}>{c.customerName}</td>
                  <td style={s.td}>{c.mobileNo || '—'}</td>
                  <td style={s.td}>{c.contactNo || '—'}</td>
                  <td style={s.td}>{c.state || '—'}</td>
                  <td style={s.td}>{c.gstTin || '—'}</td>
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
  sectionLabel: { fontSize: 11, color: '#64748b', letterSpacing: 2, marginBottom: 12, marginTop: 4, textTransform: 'uppercase' },
  btnRow:       { display: 'flex', justifyContent: 'space-between', marginTop: 20, flexWrap: 'wrap', gap: 8 },
  btnLeft:      { display: 'flex', gap: 8 },
  btnRight:     { display: 'flex', gap: 8 },
  btn:          { padding: '9px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, letterSpacing: 0.5 },
  btnPrimary:   { background: '#6366f1', color: '#fff' },
  btnSecondary: { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' },
  btnDanger:    { background: 'transparent', color: '#f87171', border: '1px solid #f87171' },
  btnSuccess:   { background: '#0891b2', color: '#fff' },
  tableHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  tableTitle:   { fontSize: 15, fontWeight: 600, color: '#e2e8f0' },
  tableWrap:    { overflowX: 'auto' },
  table:        { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:           { padding: '10px 14px', textAlign: 'left', color: '#60a5fa', fontSize: 11, letterSpacing: 1, borderBottom: '1px solid #334155', textTransform: 'uppercase' },
  tr:           { borderBottom: '1px solid #1e293b', cursor: 'pointer', transition: 'background 0.15s' },
  trSelected:   { background: '#1e3a5f' },
  td:           { padding: '10px 14px', color: '#cbd5e1' },
  empty:        { textAlign: 'center', padding: 40, color: '#475569' },
  tableFooter:  { fontSize: 12, color: '#475569', marginTop: 12 },
  toast:        { position: 'fixed', top: 20, right: 20, padding: '12px 24px', borderRadius: 8, color: '#fff', fontWeight: 600, zIndex: 9999, fontSize: 14 },
};
