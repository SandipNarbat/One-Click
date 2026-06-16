// src/pages/ItemMaster.jsx
import { useState, useEffect, useCallback } from 'react';
import { itemAPI, productAPI, supplierAPI } from '../api/axios';
import MasterLayout from '../components/MasterLayout';
import '../styles/masterStyles.css';
import './ItemMaster.css';

const EMPTY_FORM = {
  productId: '', supplierId: '', model: '', brand: '',
  colour: '', imeiNo: '', dp: '', salePrice: '', tax: '', quantity: ''
};

export default function ItemMaster() {
  const [form,      setForm]      = useState(EMPTY_FORM);
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

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSelect = (item) => {
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

  const handleClear = () => { setForm(EMPTY_FORM); setSelected(null); };

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
              <button className="ms-btn ms-btn-edit" onClick={handleSave} disabled={loading}>✎ UPDATE</button>
              <button className="ms-btn ms-btn-delete" onClick={handleDelete} disabled={loading}>🗑 DELETE</button>
            </div>
            <div className="im-action-row">
              <button className="ms-btn ms-btn-clear" onClick={handleClear}>⊘ CLEAR</button>
              <button className="ms-btn ms-btn-print" onClick={() => window.print()}>🖨 PRINT</button>
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
    </MasterLayout>
  );
}

