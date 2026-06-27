// src/pages/PriceDrop.jsx
import { useState, useEffect, useCallback } from 'react';
import { priceDropAPI, productAPI } from '../api/axios';
import MasterLayout from '../components/MasterLayout';
import '../styles/masterStyles.css';
import './PriceDrop.css';

const EMPTY_FORM = { productId: '', model: '', brand: '', newDp: '', newSalePrice: '', remark: '', startLabel: '' };

export default function PriceDrop() {
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [items,    setItems]    = useState([]);
  const [products, setProducts] = useState([]);
  const [models,   setModels]   = useState([]);
  const [brands,   setBrands]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState(null);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).replace(/ /g, '/');

  const loadProducts = useCallback(async () => {
    try { const res = await productAPI.getAll(); setProducts(res.data); }
    catch (e) { showToast('error', e.message); }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const loadOptions = useCallback(async (productId) => {
    try {
      const params = productId ? { productId } : {};
      const [mRes, bRes] = await Promise.all([priceDropAPI.getModels(params), priceDropAPI.getBrands(params)]);
      setModels(mRes.data); setBrands(bRes.data);
    } catch {}
  }, []);

  const handleShow = async () => {
    try {
      const params = {};
      if (form.productId) params.productId = form.productId;
      if (form.model)     params.model     = form.model;
      if (form.brand)     params.brand     = form.brand;
      const res = await priceDropAPI.getItems(params);
      setItems(res.data); setSelected(null);
    } catch (e) { showToast('error', e.message); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (name === 'productId') loadOptions(value);
  };

  const handleClear = () => { setForm(EMPTY_FORM); setItems([]); setSelected(null); };

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  const handleSave = async () => {
    if (!form.newDp && !form.newSalePrice)
      return showToast('error', 'Enter at least New DP or New Sale Price');
    setLoading(true);
    try {
      const payload = {
        productId:    form.productId    || undefined,
        model:        form.model        || undefined,
        brand:        form.brand        || undefined,
        newDp:        form.newDp        || undefined,
        newSalePrice: form.newSalePrice || undefined,
        remark:       form.remark       || undefined,
        itemIds:      selected ? [selected.id] : undefined,
      };
      const res = await priceDropAPI.applyDrop(payload);
      showToast('success', res.message || 'Price updated successfully');
      handleShow();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

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
            <h1 className="ms-page-title">Price Adjustment</h1>
            <p className="ms-page-subtitle">Manage and update product pricing across all tiers.</p>
          </div>
          <div className="ms-entry-date-box">
            <span className="ms-entry-label">ENTRY DATE</span>
            <span className="ms-entry-value">{today}</span>
          </div>
        </div>

        <div className="ms-split-wrap">
          {/* LEFT — Filters + DP Change */}
          <div className="ms-left-panel">

            <div className="ms-field mb-14">
              <label className="ms-label">PROD. NAME</label>
              <div className="pd-select-row">
                <select className="ms-select pd-select-field"
                  name="productId" value={form.productId} onChange={handleChange}>
                  <option value="">Select Product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
                </select>
                <span className="pd-caret-span"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
              </div>
            </div>

            <div className="ms-row">
              <div className="ms-field">
                <label className="ms-label">MODEL</label>
                <div className="pd-select-row">
                  <select className="ms-select pd-select-field"
                    name="model" value={form.model} onChange={handleChange}>
                    <option value="">Model...</option>
                    {models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <span className="pd-caret-span-narrow"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
                </div>
              </div>
              <div className="ms-field">
                <label className="ms-label">BRAND</label>
                <div className="pd-select-row">
                  <select className="ms-select pd-select-field"
                    name="brand" value={form.brand} onChange={handleChange}>
                    <option value="">Brand...</option>
                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <span className="pd-caret-span-narrow"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
                </div>
              </div>
            </div>

            <button className="ms-btn ms-btn-show pd-show-btn"
              onClick={handleShow}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              SHOW
            </button>

            {/* DP Change */}
            <div className="pd-section-header">
              <span className="pd-section-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg></span> DP CHANGE
            </div>

            <div className="ms-row">
              <div className="ms-field">
                <label className="ms-label">NEW DP</label>
                <div className="ms-rupee-wrap">
                  <span className="ms-rupee-prefix">₹</span>
                  <input className="ms-input pd-rupee-input"
                    type="number" name="newDp" value={form.newDp}
                    onChange={handleChange} placeholder="0.00" step="0.01" />
                </div>
              </div>
              <div className="ms-field">
                <label className="ms-label">NEW SALE PRICE</label>
                <div className="ms-rupee-wrap">
                  <span className="ms-rupee-prefix">₹</span>
                  <input className="ms-input pd-rupee-input"
                    type="number" name="newSalePrice" value={form.newSalePrice}
                    onChange={handleChange} placeholder="0.00" step="0.01" />
                </div>
              </div>
            </div>

            <div className="ms-field mb-14">
              <label className="ms-label">REMARK</label>
              <textarea className="ms-textarea" name="remark" value={form.remark}
                onChange={handleChange} placeholder="Enter reason for price adjustment..." />
            </div>

            <div className="ms-field mb-14">
              <label className="ms-label">START LABEL</label>
              <input className="ms-input pd-label-input" name="startLabel" value={form.startLabel} onChange={handleChange} />
            </div>

            <div className="d-flex gap-8">
              <button className="ms-btn ms-btn-clear pd-btn-flex" onClick={handleClear}>CLEAR</button>
              <button className="ms-btn ms-btn-add pd-btn-flex" onClick={handleSave} disabled={loading}>SAVE</button>
            </div>
          </div>

          {/* RIGHT — Product Directory */}
          <div className="ms-right-panel">
            <div className="ms-table-header">
              <span className="ms-table-title pd-table-title-wrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                Product Directory
              </span>
              <span className="pd-selected-info">
                {selected ? `Selected: ${selected.itemId}` : 'Click row to select'}
              </span>
            </div>
            <div className="ms-table-wrap">
              <table className="ms-table">
                <thead>
                  <tr>
                    {['SR NO','ITEM ID','PRODUCT NAME','DP (₹)','QTY','MODEL','BRAND','COLOUR'].map(h => (
                      <th key={h} className="ms-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={8} className="ms-empty">Use filters and click SHOW to load items.</td></tr>
                  ) : items.map((item, i) => (
                    <tr key={item.id}
                      className={`ms-tr ${selected?.id === item.id ? 'ms-tr-selected' : ''}`}
                      onClick={() => setSelected(selected?.id === item.id ? null : item)}>
                      <td className="ms-td">{String(i + 1).padStart(2, '0')}</td>
                      <td className="ms-td pd-id-cell">{item.itemId}</td>
                      <td className="ms-td pd-name-cell">{item.product?.productName || '—'}</td>
                      <td className="ms-td pd-dp-cell">{item.dp?.toLocaleString('en-IN') || '—'}</td>
                      <td className={`ms-td pd-qty-cell ${item.quantity > 50 ? 'pd-qty-high' : 'pd-qty-low'}`}>{item.quantity}</td>
                      <td className="ms-td">{item.model || '—'}</td>
                      <td className="ms-td">{item.brand || '—'}</td>
                      <td className="ms-td">{item.colour || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pd-total-wrap">
              <span className="pd-total-label">
                Total Stock Quantity: <span className="pd-total-value">{totalQty}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="ms-action-bar">
          <div className="ms-action-left">
            <button className="ms-btn ms-btn-add"><span>+</span> ADD</button>
            <button className="ms-btn ms-btn-edit">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              EDIT
            </button>
            <button className="ms-btn ms-btn-delete">
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