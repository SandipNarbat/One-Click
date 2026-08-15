// src/components/AddSupplierModal.jsx
//
// Plain from-scratch modal (fixed overlay + card) — no external
// library, matching the app's existing ms-*/pm-* class conventions.
// Used by Purchase Entry's "+ Add New Supplier" option so the user
// never has to leave the Purchase Entry screen (Feature 6).

import { useState } from 'react';
import { supplierAPI } from '../api/axios';

const EMPTY = {
  supplierName: '',
  mobile: '',
  email: '',
  address: '',
  state: '',
  gstRegistered: false,
  gstTin: '',
};

export default function AddSupplierModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleGstRegisteredChange = (value) => {
    setForm((f) => ({
      ...f,
      gstRegistered: value,
      // Clearing the GST number here too (not just visually hiding the
      // field) means there's no stale value left behind if they flip
      // back to "No" after typing something in.
      gstTin: value ? f.gstTin : '',
    }));
  };

  const handleSave = async () => {
    if (!form.supplierName.trim()) {
      setError('Supplier name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await supplierAPI.create({
        supplierName: form.supplierName.trim(),
        mobile: form.mobile || null,
        email: form.email || null,
        address: form.address || null,
        state: form.state || null,
        gstRegistered: form.gstRegistered,
        gstTin: form.gstRegistered ? (form.gstTin || null) : null,
      });
      onCreated(res.data);
    } catch (e) {
      setError(e.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pm-modal-overlay" onClick={onClose}>
      <div className="pm-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="pm-modal-header">
          <span className="pm-modal-title">Add New Supplier</span>
          <button className="pm-modal-close" onClick={onClose} title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && <div className="ms-toast ms-toast-error pm-modal-error">{error}</div>}

        <div className="pm-modal-body">
          <div className="ms-field mb-14">
            <label className="ms-label">SUPPLIER NAME *</label>
            <input className="ms-input" name="supplierName" value={form.supplierName}
              onChange={handleChange} placeholder="Supplier name..." autoFocus />
          </div>

          <div className="ms-row">
            <div className="ms-field">
              <label className="ms-label">MOBILE</label>
              <input className="ms-input" name="mobile" value={form.mobile}
                onChange={handleChange} placeholder="Mobile number..." />
            </div>
            <div className="ms-field">
              <label className="ms-label">EMAIL</label>
              <input className="ms-input" name="email" type="email" value={form.email}
                onChange={handleChange} placeholder="Email address..." />
            </div>
          </div>

          <div className="ms-field mb-14">
            <label className="ms-label">ADDRESS</label>
            <input className="ms-input" name="address" value={form.address}
              onChange={handleChange} placeholder="Address..." />
          </div>

          <div className="ms-field mb-14">
            <label className="ms-label">STATE</label>
            <input className="ms-input" name="state" value={form.state}
              onChange={handleChange} placeholder="State..." />
          </div>

          <div className="ms-field mb-14">
            <label className="ms-label">GST REGISTERED</label>
            <div className="pm-idtype-toggle">
              <button type="button"
                className={`pm-idtype-btn ${form.gstRegistered ? 'pm-idtype-active' : ''}`}
                onClick={() => handleGstRegisteredChange(true)}>
                Yes
              </button>
              <button type="button"
                className={`pm-idtype-btn ${!form.gstRegistered ? 'pm-idtype-active' : ''}`}
                onClick={() => handleGstRegisteredChange(false)}>
                No
              </button>
            </div>
          </div>

          {/* GST Number only shown when registered — per Feature 5 */}
          {form.gstRegistered && (
            <div className="ms-field mb-14">
              <label className="ms-label">GST NUMBER</label>
              <input className="ms-input" name="gstTin" value={form.gstTin}
                onChange={handleChange} placeholder="GSTIN..." />
            </div>
          )}
        </div>

        <div className="pm-modal-footer">
          <button className="ms-btn ms-btn-clear" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="ms-btn ms-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
