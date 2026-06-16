// src/pages/ServiceCenterMaster.jsx
import { useState, useEffect, useCallback } from 'react';
import { serviceCenterAPI } from '../api/axios';
import MasterLayout from '../components/MasterLayout';
import '../styles/masterStyles.css';
import './ServiceCenterMaster.css';

const EMPTY_FORM = { productType: '', brandName: '', serviceCentreNo: '' };

export default function ServiceCenterMaster() {
  const [form,     setForm]     = useState(EMPTY_FORM);
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

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSelect = (c) => {
    setSelected(c);
    setForm({ productType: c.productType || '', brandName: c.brandName || '', serviceCentreNo: c.serviceCentreNo || '' });
  };

  const handleClear = () => { setForm(EMPTY_FORM); setSelected(null); };

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
            <button className="ms-btn ms-btn-edit" onClick={handleSave} disabled={loading}>✎ EDIT</button>
            <button className="ms-btn ms-btn-delete" onClick={handleDelete} disabled={loading}>🗑 DELETE</button>
            <button className="ms-btn ms-btn-clear" onClick={handleClear}>⊘ CLEAR</button>
          </div>
          <div className="ms-action-right">
            <button className="ms-btn ms-btn-save" onClick={handleSave} disabled={loading}>💾 SAVE</button>
            <button className="ms-btn ms-btn-print" onClick={() => window.print()}>🖨 PRINT</button>
            <button className="ms-btn ms-btn-back" onClick={handleClear}>← BACK</button>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
}