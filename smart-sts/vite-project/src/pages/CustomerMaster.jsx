// src/pages/CustomerMaster.jsx
import { useState, useEffect, useCallback } from 'react';
import { customerAPI } from '../api/axios';
import MasterLayout from '../components/MasterLayout';
import '../styles/masterStyles.css';
import './CustomerMaster.css';

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
    try { const res = await customerAPI.getAll(); setCustomers(res.data); }
    catch (e) { showToast('error', e.message); }
  }, []);

  const loadNextId = useCallback(async () => {
    try { const res = await customerAPI.getNextId(); setNextId(res.data); } catch {}
  }, []);

  useEffect(() => { loadCustomers(); loadNextId(); }, [loadCustomers, loadNextId]);

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

  return (
    <MasterLayout>
      {toast && (
        <div className={`ms-toast ms-toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}
      <div className="ms-page">
        {/* Page header */}
        <div className="ms-page-header">
          <div>
            <h1 className="ms-page-title">Customer Master</h1>
            <p className="ms-page-subtitle">Manage customer master information</p>
          </div>
          <div className="ms-entry-date-box">
            <span className="ms-entry-label">ENTRY DATE</span>
            <span className="ms-entry-value">{today}</span>
          </div>
        </div>

        {/* Form card */}
        <div className="ms-form-card">
          {/* Row 1: ID + Name */}
          <div className="ms-row">
            <div className="ms-field">
              <label className="ms-label">CUSTOMER ID</label>
              <input className="ms-input ms-input-disabled"
                value={selected ? selected.customerId : nextId} readOnly />
            </div>
            <div className="ms-field flex-2">
              <label className="ms-label">CUSTOMER NAME</label>
              <input className="ms-input" name="customerName" value={form.customerName}
                onChange={handleChange} placeholder="Select or type customer name..."
                list="customer-list" />
              <datalist id="customer-list">
                {customers.map(c => <option key={c.id} value={c.customerName} />)}
              </datalist>
            </div>
          </div>

          {/* Row 2: Email + Contact + Mobile */}
          <div className="ms-row">
            <div className="ms-field">
              <label className="ms-label">EMAIL ADDRESS</label>
              <input className="ms-input" name="email" type="email" value={form.email}
                onChange={handleChange} placeholder="customer@domain.com" />
            </div>
            <div className="ms-field">
              <label className="ms-label">CONTACT NO.</label>
              <input className="ms-input" name="contactNo" value={form.contactNo}
                onChange={handleChange} placeholder="022-1234567" />
            </div>
            <div className="ms-field">
              <label className="ms-label">MOBILE NO.</label>
              <input className="ms-input" name="mobileNo" value={form.mobileNo}
                onChange={handleChange} placeholder="+91 9876543210" />
            </div>
          </div>

          {/* Full Address */}
          <div className="ms-field mb-16">
            <label className="ms-label">FULL ADDRESS</label>
            <textarea className="ms-textarea" name="address" value={form.address}
              onChange={handleChange} placeholder="Enter complete billing or shipping address..." />
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

        {/* Action Bar */}
        <div className="ms-action-bar">
          <div className="ms-action-left">
            <button className="ms-btn ms-btn-add" onClick={handleAdd} disabled={loading}>
              <span>+</span> ADD
            </button>
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
