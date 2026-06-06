// src/pages/ChangeMaster.jsx
import { useState, useEffect, useCallback } from 'react';
import { changeAPI, productAPI } from '../api/axios';

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
        changeAPI.getModels(),
        changeAPI.getBrands(),
        changeAPI.getColours(),
        productAPI.getAll(),
      ]);
      setModels(mRes.data);
      setBrands(bRes.data);
      setColours(cRes.data);
      setProducts(pRes.data);
    } catch {}
  }, []);

  useEffect(() => { loadDropdowns(); }, [loadDropdowns]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFilterChange = (e) => setFilter(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleShow = async () => {
    try {
      const params = {};
      if (filter.productName) params.productName = filter.productName;
      if (filter.model)       params.model       = filter.model;
      if (filter.brand)       params.brand       = filter.brand;
      if (filter.colour)      params.colour      = filter.colour;
      const res = await changeAPI.getItems(params);
      setItems(res.data);
      setSelected(null);
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
  const s = styles;

  return (
    <div style={s.page}>
      {toast && <div style={{ ...s.toast, background: toast.type === 'success' ? '#10b981' : '#ef4444' }}>{toast.msg}</div>}

      <div style={s.header}>
        <div>
          <h1 style={s.title}>Change Master</h1>
          <p style={s.subtitle}>Consolidated update utility for product pricing and details.</p>
        </div>
        <div style={s.entryDate}>
          <span style={s.entryLabel}>ENTRY DATE</span>
          <span style={s.entryValue}>{today}</span>
        </div>
      </div>

      <div style={s.splitWrap}>

        {/* LEFT — Tabs + Form */}
        <div style={{ ...s.card, width: 360, flexShrink: 0 }}>

          {/* Filter dropdowns */}
          <div style={{ ...s.field, marginBottom: 14 }}>
            <label style={s.label}>PRODUCT NAME</label>
            <select style={s.select} name="productName" value={filter.productName} onChange={handleFilterChange}>
              <option value="">Select Product</option>
              {products.map(p => <option key={p.id} value={p.productName}>{p.productName}</option>)}
            </select>
          </div>

          <div style={{ ...s.field, marginBottom: 14 }}>
            <label style={s.label}>MODEL</label>
            <select style={s.select} name="model" value={filter.model} onChange={handleFilterChange}>
              <option value="">Select Model</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div style={{ ...s.field, marginBottom: 14 }}>
            <label style={s.label}>BRAND</label>
            <select style={s.select} name="brand" value={filter.brand} onChange={handleFilterChange}>
              <option value="">Select Brand</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div style={{ ...s.field, marginBottom: 16 }}>
            <label style={s.label}>COLOUR</label>
            <select style={s.select} name="colour" value={filter.colour} onChange={handleFilterChange}>
              <option value="">Select Colour</option>
              {colours.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <button style={{ ...s.btn, ...s.btnShow, width: '100%', marginBottom: 20 }} onClick={handleShow}>
            🔍 SHOW
          </button>

          {/* Tabs */}
          <div style={s.tabBar}>
            {TABS.map((t, i) => (
              <button key={t} style={{ ...s.tabBtn, ...(tab === i ? s.tabActive : {}) }}
                onClick={() => setTab(i)}>
                {t}
              </button>
            ))}
          </div>

          {/* TAB 0: Sale Price Change */}
          {tab === 0 && (
            <div style={s.tabPanel}>
              <div style={{ ...s.sectionLabel }}>SALES PRICE CHANGE</div>
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>SALE PRICE</label>
                  <input style={s.input} type="number" value={priceForm.newSalePrice}
                    onChange={e => setPriceForm(f => ({ ...f, newSalePrice: e.target.value }))}
                    placeholder="0.00" step="0.01" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>TAX</label>
                  <select style={s.select} value={priceForm.tax}
                    onChange={e => setPriceForm(f => ({ ...f, tax: e.target.value }))}>
                    {TAX_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>NEW IMEI NO.</label>
                <input style={s.input} value={priceForm.newImeiNo}
                  onChange={e => setPriceForm(f => ({ ...f, newImeiNo: e.target.value }))}
                  placeholder="Enter new IMEI" />
              </div>
            </div>
          )}

          {/* TAB 1: Product Details */}
          {tab === 1 && (
            <div style={s.tabPanel}>
              <div style={s.sectionLabel}>PRODUCT DETAILS CHANGE</div>
              <div style={{ ...s.field, marginBottom: 12 }}>
                <label style={s.label}>MODEL</label>
                <select style={s.select} value={detForm.model}
                  onChange={e => setDetForm(f => ({ ...f, model: e.target.value }))}>
                  <option value="">Select Model</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ ...s.field, marginBottom: 12 }}>
                <label style={s.label}>BRAND</label>
                <select style={s.select} value={detForm.brand}
                  onChange={e => setDetForm(f => ({ ...f, brand: e.target.value }))}>
                  <option value="">Select Brand</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div style={{ ...s.field, marginBottom: 12 }}>
                <label style={s.label}>COLOUR</label>
                <select style={s.select} value={detForm.colour}
                  onChange={e => setDetForm(f => ({ ...f, colour: e.target.value }))}>
                  <option value="">Select Colour</option>
                  {colours.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>QUANTITY</label>
                <input style={s.input} type="number" value={detForm.quantity}
                  onChange={e => setDetForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder="0" min="0" />
              </div>
            </div>
          )}

          {/* TAB 2: IMEI Change */}
          {tab === 2 && (
            <div style={s.tabPanel}>
              <div style={s.sectionLabel}>IMEI CHANGE</div>
              <div style={s.field}>
                <label style={s.label}>CURRENT IMEI</label>
                <input style={{ ...s.input, ...s.inputDisabled }}
                  value={selected?.imeiNo || 'Select an item from table'} readOnly />
              </div>
              <div style={{ ...s.field, marginTop: 14 }}>
                <label style={s.label}>NEW IMEI NO.</label>
                <input style={s.input} value={imeiForm.newImeiNo}
                  onChange={e => setImeiForm({ newImeiNo: e.target.value })}
                  placeholder="Enter new IMEI number" />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button style={{ ...s.btn, ...s.btnSecondary, flex: 1 }} onClick={handleClear}>CLEAR</button>
            <button style={{ ...s.btn, ...s.btnPrimary, flex: 1 }} onClick={handleSave} disabled={loading}>SAVE</button>
          </div>
        </div>

        {/* RIGHT — Item Table */}
        <div style={{ ...s.card, flex: 1 }}>
          <div style={s.tableHeader}>
            <span style={s.tableTitle}>
              {selected ? `Selected: ${selected.itemId}` : 'Select an item from the list'}
            </span>
          </div>

          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['SR NO.', 'ITEM ID', 'PRODUCT NAME', 'SALE PRICE', 'QTY', 'MODEL', 'BRAND', 'IMEI NO', 'COLOUR'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={9} style={s.empty}>Use the filters and click SHOW to load items.</td></tr>
                ) : items.map((item, i) => (
                  <tr key={item.id}
                    style={{ ...s.tr, ...(selected?.id === item.id ? s.trSelected : {}) }}
                    onClick={() => handleSelectItem(item)}>
                    <td style={s.td}>{i + 1}</td>
                    <td style={{ ...s.td, color: '#60a5fa' }}>{item.itemId}</td>
                    <td style={{ ...s.td, fontWeight: 700 }}>{item.product?.productName || '—'}</td>
                    <td style={{ ...s.td, color: '#4ade80' }}>${item.salePrice?.toLocaleString() || '—'}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>{item.quantity}</td>
                    <td style={s.td}>{item.model || '—'}</td>
                    <td style={s.td}>{item.brand || '—'}</td>
                    <td style={{ ...s.td, fontSize: 11 }}>{item.imeiNo || '—'}</td>
                    <td style={s.td}>{item.colour || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <div style={s.tableFooter}>
              Start Label: <input style={{ ...s.input, width: 60, display: 'inline-block', padding: '4px 8px', marginLeft: 8 }} />
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
              Total Stock Quantity: <span style={{ color: '#60a5fa', fontSize: 16 }}>{totalQty}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom buttons */}
      <div style={{ ...s.card, padding: '16px 24px' }}>
        <div style={s.btnRow}>
          <div style={s.btnLeft}>
            <button style={{ ...s.btn, ...s.btnSecondary }}>MAIN MENU</button>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={handleClear}>CLEAR</button>
            <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleSave} disabled={loading}>SAVE</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page:        { padding: '24px', color: '#e2e8f0', fontFamily: "'Courier New', monospace" },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title:       { fontSize: 26, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  subtitle:    { fontSize: 13, color: '#64748b', margin: '4px 0 0' },
  entryDate:   { textAlign: 'right' },
  entryLabel:  { display: 'block', fontSize: 11, color: '#64748b', letterSpacing: 1 },
  entryValue:  { fontSize: 14, color: '#e2e8f0', fontWeight: 600 },
  splitWrap:   { display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 20 },
  card:        { background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid #334155' },
  tabBar:      { display: 'flex', borderBottom: '1px solid #334155', marginBottom: 0, gap: 0 },
  tabBtn:      { flex: 1, padding: '10px 8px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600, borderBottom: '2px solid transparent', transition: 'all 0.15s' },
  tabActive:   { color: '#60a5fa', borderBottom: '2px solid #60a5fa' },
  tabPanel:    { paddingTop: 16 },
  sectionLabel:{ fontSize: 11, color: '#64748b', letterSpacing: 2, marginBottom: 14, textTransform: 'uppercase' },
  row:         { display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  field:       { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 120 },
  label:       { fontSize: 11, color: '#64748b', letterSpacing: 1, marginBottom: 6 },
  input:       { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  inputDisabled:{ background: '#0d1a2d', color: '#94a3b8' },
  select:      { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', cursor: 'pointer' },
  btnShow:     { background: '#1e3a5f', color: '#60a5fa', border: '1px solid #1e4a8f', borderRadius: 6, padding: '10px', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btn:         { padding: '9px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnPrimary:  { background: '#6366f1', color: '#fff' },
  btnSecondary:{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' },
  btnDanger:   { background: 'transparent', color: '#f87171', border: '1px solid #f87171' },
  btnSuccess:  { background: '#0891b2', color: '#fff' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  tableTitle:  { fontSize: 14, fontWeight: 600, color: '#94a3b8' },
  tableWrap:   { overflowX: 'auto' },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th:          { padding: '9px 12px', textAlign: 'left', color: '#60a5fa', fontSize: 10, letterSpacing: 1, borderBottom: '1px solid #334155', textTransform: 'uppercase', whiteSpace: 'nowrap' },
  tr:          { borderBottom: '1px solid #1e293b', cursor: 'pointer' },
  trSelected:  { background: '#1e3a5f' },
  td:          { padding: '9px 12px', color: '#cbd5e1', whiteSpace: 'nowrap' },
  empty:       { textAlign: 'center', padding: 40, color: '#475569' },
  tableFooter: { fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center' },
  btnRow:      { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  btnLeft:     { display: 'flex', gap: 8 },
  btnRight:    { display: 'flex', gap: 8 },
  toast:       { position: 'fixed', top: 20, right: 20, padding: '12px 24px', borderRadius: 8, color: '#fff', fontWeight: 600, zIndex: 9999, fontSize: 14 },
};