// src/pages/ItemMaster.jsx
import { useState, useEffect, useCallback } from 'react';
import { itemAPI, productAPI, supplierAPI } from '../api/axios';
import { readDraft, saveDraft, clearDraft } from '../hooks/useDraft';
import MasterLayout from '../components/MasterLayout';
import '../styles/masterStyles.css';
import './ItemMaster.css';
import './PrintReport.css';

const EMPTY_FORM = {
  productId: '', supplierId: '', model: '', brand: '',
  colour: '', imeiNo: '', dp: '', salePrice: '', tax: '', quantity: ''
};

const DRAFT_KEY = 'item-master';

export default function ItemMaster() {
  const [form,      setForm]      = useState(() => { const d = readDraft(DRAFT_KEY); return d ? { ...EMPTY_FORM, ...d } : EMPTY_FORM; });
  const [hasDraft]               = useState(() => !!readDraft(DRAFT_KEY));
  const [items,     setItems]     = useState([]);
  const [products,  setProducts]  = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [nextId,    setNextId]    = useState('ITM-0001');
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState(null);
  const [search,    setSearch]    = useState('');

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).replace(/ /g, '/');

  const loadItems     = useCallback(async () => { try { const res = await itemAPI.getAll(); setItems(res.data); } catch (e) { showToast('error', e.message); } }, []);
  const loadNextId    = useCallback(async () => { try { const res = await itemAPI.getNextId(); setNextId(res.data); } catch {} }, []);
  const loadProducts  = useCallback(async () => { try { const res = await productAPI.getAll(); setProducts(res.data); } catch {} }, []);
  const loadSuppliers = useCallback(async () => { try { const res = await supplierAPI.getAll(); setSuppliers(res.data); } catch {} }, []);

  useEffect(() => { loadItems(); loadNextId(); loadProducts(); loadSuppliers(); }, [loadItems, loadNextId, loadProducts, loadSuppliers]);

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

  const handleSelect = (item) => {
    clearDraft(DRAFT_KEY);
    setSelected(item);
    setForm({
      productId:  item.productId  ? String(item.productId)  : '',
      supplierId: item.supplierId ? String(item.supplierId) : '',
      model:      item.model      || '', brand:     item.brand     || '',
      colour:     item.colour     || '', imeiNo:    item.imeiNo    || '',
      dp:         item.dp != null         ? String(item.dp)        : '',
      salePrice:  item.salePrice != null  ? String(item.salePrice) : '',
      tax:        item.tax        || '',
      quantity:   item.quantity != null    ? String(item.quantity)  : '',
    });
  };

  const handleClear = () => { clearDraft(DRAFT_KEY); setForm(EMPTY_FORM); setSelected(null); };

  const handleAdd = async () => {
    if (!form.productId) return showToast('error', 'Product is required');
    setLoading(true);
    try {
      await itemAPI.create(form);
      showToast('success', 'Item added successfully');
      handleClear(); loadItems(); loadNextId();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!selected) return showToast('error', 'Select an item to update');
    setLoading(true);
    try {
      await itemAPI.update(selected.id, form);
      showToast('success', 'Item updated');
      handleClear(); loadItems();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selected) return showToast('error', 'Select an item to delete');
    if (!window.confirm(`Delete "${selected.itemId}"?`)) return;
    setLoading(true);
    try {
      await itemAPI.delete(selected.id);
      showToast('success', 'Item deleted');
      handleClear(); loadItems(); loadNextId();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const filtered = items.filter(it => {
    const q = search.toLowerCase();
    return (
      it.itemId.toLowerCase().includes(q) ||
      (it.model  || '').toLowerCase().includes(q) ||
      (it.brand  || '').toLowerCase().includes(q) ||
      (it.colour || '').toLowerCase().includes(q) ||
      (it.imeiNo || '').toLowerCase().includes(q) ||
      (it.product?.productName || '').toLowerCase().includes(q) ||
      (it.supplier?.supplierName || '').toLowerCase().includes(q)
    );
  });

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
            <h1 className="ms-page-title">Item Master</h1>
            <p className="ms-page-subtitle">Manage individual stock items with IMEI, pricing &amp; supplier info</p>
          </div>
          <div className="ms-entry-date-box">
            <span className="ms-entry-label">ENTRY DATE</span>
            <span className="ms-entry-value">{today}</span>
          </div>
        </div>

        <div className="ms-split-wrap">
          {/* LEFT — Form */}
          <div className="ms-left-panel">
            <div className="ms-field mb-14">
              <label className="ms-label">ITEM ID</label>
              <input className="ms-input ms-input-disabled"
                value={selected ? selected.itemId : nextId} readOnly />
            </div>

            <div className="ms-row">
              <div className="ms-field">
                <label className="ms-label">PRODUCT *</label>
                <select className="ms-select" name="productId" value={form.productId} onChange={handleChange}>
                  <option value="">Select Product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
                </select>
              </div>
              <div className="ms-field">
                <label className="ms-label">SUPPLIER</label>
                <select className="ms-select" name="supplierId" value={form.supplierId} onChange={handleChange}>
                  <option value="">Select Supplier...</option>
                  {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.supplierName}</option>)}
                </select>
              </div>
            </div>

            <div className="ms-row">
              <div className="ms-field">
                <label className="ms-label">MODEL</label>
                <input className="ms-input" name="model" value={form.model} onChange={handleChange} placeholder="e.g. Eco Volt Neo" />
              </div>
              <div className="ms-field">
                <label className="ms-label">BRAND</label>
                <input className="ms-input" name="brand" value={form.brand} onChange={handleChange} placeholder="e.g. Samsung" />
              </div>
            </div>

            <div className="ms-row">
              <div className="ms-field">
                <label className="ms-label">COLOUR</label>
                <input className="ms-input" name="colour" value={form.colour} onChange={handleChange} placeholder="e.g. Phantom Black" />
              </div>
              <div className="ms-field">
                <label className="ms-label">IMEI NO.</label>
                <input className="ms-input" name="imeiNo" value={form.imeiNo} onChange={handleChange} placeholder="15-digit IMEI" maxLength={15} />
              </div>
            </div>

            <div className="ms-section-divider">PRICING &amp; STOCK</div>
            <div className="ms-row">
              <div className="ms-field">
                <label className="ms-label">DEALER PRICE (DP)</label>
                <div className="ms-rupee-wrap">
                  <span className="ms-rupee-prefix">₹</span>
                  <input className="ms-input im-rupee-input"
                    name="dp" type="number" value={form.dp} onChange={handleChange} placeholder="0.00" />
                </div>
              </div>
              <div className="ms-field">
                <label className="ms-label">SALE PRICE</label>
                <div className="ms-rupee-wrap">
                  <span className="ms-rupee-prefix">₹</span>
                  <input className="ms-input im-rupee-input"
                    name="salePrice" type="number" value={form.salePrice} onChange={handleChange} placeholder="0.00" />
                </div>
              </div>
            </div>

            <div className="ms-row">
              <div className="ms-field">
                <label className="ms-label">TAX</label>
                <input className="ms-input" name="tax" value={form.tax} onChange={handleChange} placeholder="e.g. Standard (20%)" />
              </div>
              <div className="ms-field">
                <label className="ms-label">QUANTITY</label>
                <input className="ms-input" name="quantity" type="number" value={form.quantity} onChange={handleChange} placeholder="0" min="0" />
              </div>
            </div>

            {form.dp && form.salePrice && (
              <div className="im-margin-box">
                <span className="im-margin-label">MARGIN</span>
                <span className={`im-margin-value ${(parseFloat(form.salePrice) - parseFloat(form.dp)) >= 0 ? 'im-margin-positive' : 'im-margin-negative'}`}>
                  ₹{(parseFloat(form.salePrice) - parseFloat(form.dp)).toFixed(2)}
                  {' '}({((parseFloat(form.salePrice) - parseFloat(form.dp)) / parseFloat(form.dp) * 100).toFixed(1)}%)
                </span>
              </div>
            )}

            <div className="im-action-left">
              <button className="ms-btn ms-btn-add" onClick={handleAdd} disabled={loading}><span>+</span> ADD</button>
              <button className="ms-btn ms-btn-edit" onClick={handleSave} disabled={loading}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                EDIT
              </button>
              <button className="ms-btn ms-btn-delete" onClick={handleDelete} disabled={loading}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                DELETE
              </button>
            </div>
            <div className="im-action-row">
              <button className="ms-btn ms-btn-clear" onClick={handleClear}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                CLEAR
              </button>
              <button className="ms-btn ms-btn-print" onClick={() => window.print()}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                PRINT
              </button>
            </div>
          </div>

          {/* RIGHT — Items Directory */}
          <div className="ms-right-panel">
            <div className="ms-table-header">
              <span className="ms-table-title">Item Directory ({filtered.length})</span>
              <input className="ms-input im-search-input"
                placeholder="Search by ID, model, brand, IMEI..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="ms-table-wrap">
              <table className="ms-table">
                <thead>
                  <tr>
                    {['Sr.','Item ID','Product','Model','Brand','Colour','IMEI','DP (₹)','Sale (₹)','Qty'].map(h => (
                      <th key={h} className="ms-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} className="ms-empty">No items found</td></tr>
                  ) : filtered.map((it, i) => (
                    <tr key={it.id}
                      className={`ms-tr ${selected?.id === it.id ? 'ms-tr-selected' : ''}`}
                      onClick={() => handleSelect(it)}>
                      <td className="ms-td">{i + 1}</td>
                      <td className="ms-td im-id-cell">{it.itemId}</td>
                      <td className="ms-td im-name-cell">{it.product?.productName || '—'}</td>
                      <td className="ms-td">{it.model || '—'}</td>
                      <td className="ms-td">{it.brand || '—'}</td>
                      <td className="ms-td">{it.colour || '—'}</td>
                      <td className="ms-td im-imei-cell">{it.imeiNo || '—'}</td>
                      <td className="ms-td">{it.dp != null ? it.dp.toLocaleString('en-IN') : '—'}</td>
                      <td className="ms-td">{it.salePrice != null ? it.salePrice.toLocaleString('en-IN') : '—'}</td>
                      <td className="ms-td">
                        <span className={`ms-badge ${it.quantity > 0 ? 'badge-multi' : 'badge-single'}`} style={{ background: it.quantity > 0 ? '#1a3a2a' : '#3a1a1a', color: it.quantity > 0 ? '#4ade80' : '#f87171' }}>
                          {it.quantity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ms-table-footer">Showing {filtered.length} records</div>
          </div>
        </div>
      </div>

      {/* ── Print Report ── */}
      <div className="pr-print-only">
        <div className="pr-ph-row">
          <div>
            <div className="pr-ph-company">SMART STS</div>
            <div className="pr-ph-tagline">Smart Service &amp; Trading Solutions</div>
          </div>
          <div className="pr-ph-right">
            <div className="pr-ph-title">ITEM REPORT</div>
            <div className="pr-ph-meta">{filtered.length} records · Printed: {today}</div>
            {search && <div className="pr-ph-meta">Filter: <span className="pr-ph-filter">{search}</span></div>}
          </div>
        </div>
        <hr className="pr-ph-rule" />
        <div className="pr-ps-strip">
          <div className="pr-ps-cell">
            <span className="pr-ps-label">Total Items</span>
            <span className="pr-ps-value">{filtered.length}</span>
          </div>
          <div className="pr-ps-cell">
            <span className="pr-ps-label">In Stock</span>
            <span className="pr-ps-value pr-ps-green">{filtered.filter(it => it.quantity > 0).length}</span>
          </div>
          <div className="pr-ps-cell">
            <span className="pr-ps-label">Out of Stock</span>
            <span className="pr-ps-value pr-ps-red">{filtered.filter(it => it.quantity === 0).length}</span>
          </div>
          <div className="pr-ps-cell pr-ps-accent">
            <span className="pr-ps-label">Total DP Value</span>
            <span className="pr-ps-value pr-ps-money">₹{filtered.reduce((s, it) => s + ((it.dp || 0) * it.quantity), 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
        <table className="pr-pt">
          <thead>
            <tr>
              <th className="pr-pt-th pr-pt-sr">Sr.</th>
              <th className="pr-pt-th">Item ID</th>
              <th className="pr-pt-th">Product</th>
              <th className="pr-pt-th">Model</th>
              <th className="pr-pt-th">Brand</th>
              <th className="pr-pt-th">Colour</th>
              <th className="pr-pt-th">IMEI No.</th>
              <th className="pr-pt-th pr-pt-r">DP (₹)</th>
              <th className="pr-pt-th pr-pt-r">Sale (₹)</th>
              <th className="pr-pt-th pr-pt-c">Qty</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it, i) => (
              <tr key={it.id} className={i % 2 === 1 ? 'pr-pt-alt' : ''}>
                <td className="pr-pt-td pr-pt-sr">{i + 1}</td>
                <td className="pr-pt-td pr-pt-bold pr-pt-blue">{it.itemId}</td>
                <td className="pr-pt-td">{it.product?.productName || '—'}</td>
                <td className="pr-pt-td">{it.model || '—'}</td>
                <td className="pr-pt-td">{it.brand || '—'}</td>
                <td className="pr-pt-td">{it.colour || '—'}</td>
                <td className="pr-pt-td">{it.imeiNo || '—'}</td>
                <td className="pr-pt-td pr-pt-r">{it.dp != null ? it.dp.toLocaleString('en-IN') : '—'}</td>
                <td className="pr-pt-td pr-pt-r">{it.salePrice != null ? it.salePrice.toLocaleString('en-IN') : '—'}</td>
                <td className="pr-pt-td pr-pt-c">
                  <span className={it.quantity > 0 ? 'pr-pt-badge-green' : 'pr-pt-badge-red'}>{it.quantity}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pr-pf-row">
          <span>Generated by Smart STS · {today}, {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
          <div className="pr-pf-sig">Authorised Signatory</div>
        </div>
      </div>
    </MasterLayout>
  );
}

