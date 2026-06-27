// src/pages/ChangeMaster.jsx
import { useState, useEffect, useCallback } from 'react';
import { changeAPI, productAPI } from '../api/axios';
import MasterLayout from '../components/MasterLayout';
import '../styles/masterStyles.css';
import './ChangeMaster.css';

const TABS = ['Sale Price Change', 'Product Details', 'IMEI Change'];
const EMPTY_FILTER = { productName: '', model: '', brand: '', colour: '' };
const EMPTY_PRICE  = { newSalePrice: '', tax: 'Standard (20%)', newImeiNo: '' };
const EMPTY_DETAIL = { model: '', brand: '', colour: '', quantity: '' };
const EMPTY_IMEI   = { newImeiNo: '' };
const TAX_OPTIONS  = ['Standard (20%)', 'GST 5%', 'GST 12%', 'GST 18%', 'GST 28%', 'Exempt (0%)'];

export default function ChangeMaster() {
  const [tab,      setTab]      = useState(0);
  const [filter,   setFilter]   = useState(EMPTY_FILTER);
  const [items,    setItems]    = useState([]);
  const [selected, setSelected] = useState(null);
  const [priceForm,setPriceForm]= useState(EMPTY_PRICE);
  const [detForm,  setDetForm]  = useState(EMPTY_DETAIL);
  const [imeiForm, setImeiForm] = useState(EMPTY_IMEI);
  const [models,   setModels]   = useState([]);
  const [brands,   setBrands]   = useState([]);
  const [colours,  setColours]  = useState([]);
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState(null);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).replace(/ /g, '/');

  const loadDropdowns = useCallback(async () => {
    try {
      const [mRes, bRes, cRes, pRes] = await Promise.all([
        changeAPI.getModels(), changeAPI.getBrands(),
        changeAPI.getColours(), productAPI.getAll(),
      ]);
      setModels(mRes.data); setBrands(bRes.data); setColours(cRes.data); setProducts(pRes.data);
    } catch {}
  }, []);

  useEffect(() => { loadDropdowns(); }, [loadDropdowns]);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };
  const handleFilterChange = (e) => setFilter(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleShow = async () => {
    try {
      const params = {};
      if (filter.productName) params.productName = filter.productName;
      if (filter.model)       params.model       = filter.model;
      if (filter.brand)       params.brand       = filter.brand;
      if (filter.colour)      params.colour      = filter.colour;
      const res = await changeAPI.getItems(params);
      setItems(res.data); setSelected(null);
    } catch (e) { showToast('error', e.message); }
  };

  const handleSelectItem = (item) => {
    setSelected(item);
    setPriceForm({ newSalePrice: item.salePrice || '', tax: item.tax || 'Standard (20%)', newImeiNo: '' });
    setDetForm({ model: item.model || '', brand: item.brand || '', colour: item.colour || '', quantity: item.quantity || '' });
    setImeiForm({ newImeiNo: '' });
  };

  const handleClear = () => {
    setFilter(EMPTY_FILTER); setItems([]); setSelected(null);
    setPriceForm(EMPTY_PRICE); setDetForm(EMPTY_DETAIL); setImeiForm(EMPTY_IMEI);
  };

  const handleSave = async () => {
    if (!selected) return showToast('error', 'Select an item first');
    setLoading(true);
    try {
      if (tab === 0) {
        if (!priceForm.newSalePrice) return showToast('error', 'New sale price is required');
        await changeAPI.changeSalePrice(selected.id, priceForm);
        showToast('success', 'Sale price updated');
      } else if (tab === 1) {
        await changeAPI.changeProductDetails(selected.id, detForm);
        showToast('success', 'Product details updated');
      } else {
        if (!imeiForm.newImeiNo) return showToast('error', 'New IMEI is required');
        await changeAPI.changeImei(selected.id, imeiForm);
        showToast('success', 'IMEI updated');
      }
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
            <h1 className="ms-page-title">Change Master</h1>
            <p className="ms-page-subtitle">Consolidated update utility for product pricing and details.</p>
          </div>
          <div className="ms-entry-date-box">
            <span className="ms-entry-label">ENTRY DATE</span>
            <span className="ms-entry-value">{today}</span>
          </div>
        </div>

        <div className="ms-split-wrap">
          {/* LEFT — Filter + Tabs */}
          <div className="ms-left-panel">
            {/* Filter dropdowns */}
            <div className="ms-field mb-16">
              <label className="ms-label">PRODUCT NAME</label>
              <select className="ms-select" name="productName" value={filter.productName} onChange={handleFilterChange}>
                <option value="">Select Product</option>
                {products.map(p => <option key={p.id} value={p.productName}>{p.productName}</option>)}
              </select>
            </div>
            <div className="ms-field mb-16">
              <label className="ms-label">MODEL</label>
              <select className="ms-select" name="model" value={filter.model} onChange={handleFilterChange}>
                <option value="">Select Model</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="ms-field mb-16">
              <label className="ms-label">BRAND</label>
              <select className="ms-select" name="brand" value={filter.brand} onChange={handleFilterChange}>
                <option value="">Select Brand</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="ms-field mb-16">
              <label className="ms-label">COLOUR</label>
              <select className="ms-select" name="colour" value={filter.colour} onChange={handleFilterChange}>
                <option value="">Select Colour</option>
                {colours.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button className="ms-btn ms-btn-show pd-show-btn"
              onClick={handleShow}>🔍 SHOW</button>

            {/* Tabs */}
            <div className="ch-tab-container">
              {TABS.map((t, i) => (
                <button key={t}
                  className={`ch-tab-btn ${tab === i ? 'active' : ''}`}
                  onClick={() => setTab(i)}>{t}
                </button>
              ))}
            </div>

            {/* TAB 0: Sale Price Change */}
            {tab === 0 && (
              <div style={{ paddingTop: 14 }}>
                <div className="ch-tab-header">SALES PRICE CHANGE</div>
                <div className="ms-row">
                  <div className="ms-field">
                    <label className="ms-label">SALE PRICE</label>
                    <input className="ms-input" type="number" value={priceForm.newSalePrice}
                      onChange={e => setPriceForm(f => ({ ...f, newSalePrice: e.target.value }))}
                      placeholder="0.00" step="0.01" />
                  </div>
                  <div className="ms-field">
                    <label className="ms-label">TAX</label>
                    <select className="ms-select" value={priceForm.tax}
                      onChange={e => setPriceForm(f => ({ ...f, tax: e.target.value }))}>
                      {TAX_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="ms-field">
                  <label className="ms-label">NEW IMEI NO.</label>
                  <input className="ms-input" value={priceForm.newImeiNo}
                    onChange={e => setPriceForm(f => ({ ...f, newImeiNo: e.target.value }))}
                    placeholder="Enter new IMEI" />
                </div>
              </div>
            )}

            {/* TAB 1: Product Details */}
            {tab === 1 && (
              <div style={{ paddingTop: 14 }}>
                <div className="ch-tab-header">PRODUCT DETAILS CHANGE</div>
                {[['MODEL', 'model', models], ['BRAND', 'brand', brands], ['COLOUR', 'colour', colours]].map(([lbl, key, opts]) => (
                  <div key={key} className="ms-field mb-16">
                    <label className="ms-label">{lbl}</label>
                    <select className="ms-select" value={detForm[key]}
                      onChange={e => setDetForm(f => ({ ...f, [key]: e.target.value }))}>
                      <option value="">Select {lbl.charAt(0) + lbl.slice(1).toLowerCase()}</option>
                      {opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div className="ms-field">
                  <label className="ms-label">QUANTITY</label>
                  <input className="ms-input" type="number" value={detForm.quantity}
                    onChange={e => setDetForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="0" min="0" />
                </div>
              </div>
            )}

            {/* TAB 2: IMEI */}
            {tab === 2 && (
              <div style={{ paddingTop: 14 }}>
                <div className="ch-tab-header">IMEI CHANGE</div>
                <div className="ms-field mb-16">
                  <label className="ms-label">CURRENT IMEI</label>
                  <input className="ms-input ms-input-disabled"
                    value={selected?.imeiNo || 'Select an item from table'} readOnly />
                </div>
                <div className="ms-field">
                  <label className="ms-label">NEW IMEI NO.</label>
                  <input className="ms-input" value={imeiForm.newImeiNo}
                    onChange={e => setImeiForm({ newImeiNo: e.target.value })}
                    placeholder="Enter new IMEI number" />
                </div>
              </div>
            )}

            <div className="d-flex gap-8 mt-16">
              <button className="ms-btn ms-btn-back pd-btn-flex" onClick={handleClear}>MAIN MENU</button>
              <button className="ms-btn ms-btn-clear pd-btn-flex" onClick={handleClear}>CLEAR</button>
              <button className="ms-btn ms-btn-add pd-btn-flex" onClick={handleSave} disabled={loading}>SAVE</button>
            </div>
          </div>

          {/* RIGHT — Item Table */}
          <div className="ms-right-panel">
            <div className="ms-table-header">
              <span className="ms-table-title">
                {selected ? `Selected: ${selected.itemId}` : 'Select an item from the list'}
              </span>
            </div>
            <div className="ms-table-wrap">
              <table className="ms-table">
                <thead>
                  <tr>
                    {['SR NO.','ITEM ID','PRODUCT NAME','SALE PRICE','QTY','MODEL','BRAND','IMEI NO','COLOUR'].map(h => (
                      <th key={h} className="ms-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={9} className="ms-empty">Use the filters and click SHOW to load items.</td></tr>
                  ) : items.map((item, i) => (
                    <tr key={item.id}
                      className={`ms-tr ${selected?.id === item.id ? 'ms-tr-selected' : ''}`}
                      onClick={() => handleSelectItem(item)}>
                      <td className="ms-td">{i + 1}</td>
                      <td className="ms-td ch-id-cell">{item.itemId}</td>
                      <td className="ms-td ch-name-cell">{item.product?.productName || '—'}</td>
                      <td className="ms-td ch-price-cell">${item.salePrice?.toLocaleString() || '—'}</td>
                      <td className="ms-td ch-center-cell">{item.quantity}</td>
                      <td className="ms-td">{item.model || '—'}</td>
                      <td className="ms-td">{item.brand || '—'}</td>
                      <td className="ms-td ch-imei-cell">{item.imeiNo || '—'}</td>
                      <td className="ms-td">{item.colour || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ch-footer-row">
              <div className="ch-start-label-box">
                Start Label:
                <input className="ms-input ch-start-label-input" />
              </div>
              <div className="ch-total-qty-box">
                Total Stock Quantity: <span className="ch-total-qty-value">{totalQty}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
}