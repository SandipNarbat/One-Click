// src/pages/ProductMaster.jsx
import { useState, useEffect, useCallback } from 'react';
import { productAPI } from '../api/axios';
import MasterLayout from '../components/MasterLayout';
import '../styles/masterStyles.css';
import './ProductMaster.css';

const PRODUCT_TYPES = ['SINGLE', 'MULTIPLE'];
const GST_RATES     = [0, 5, 12, 18, 28];
const HSN_CODES     = [
  { code: '85171300', desc: 'Mobiles' },
  { code: '85235220', desc: 'Memory Cards' },
  { code: '84717090', desc: 'Pen Drives' },
  { code: '70200090', desc: 'Scratch Guards' },
  { code: '85183000', desc: 'Bluetooth Headsets' },
  { code: '85044030', desc: 'Chargers' },
  { code: '85044090', desc: 'Inverters' },
  { code: '85072000', desc: 'Batteries' },
];
const CATEGORIES = ['Electronics', 'Accessories', 'Power Backup', 'Solar', 'Other'];

const EMPTY_FORM = {
  productName: '', productType: '', hsnCode: '',
  productCategory: '', gstPercentage: '', organisation: ''
};

export default function ProductMaster() {
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState(null);
  const [search,   setSearch]   = useState('');

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).replace(/ /g, '/');

  const loadProducts = useCallback(async () => {
    try { const res = await productAPI.getAll(); setProducts(res.data); }
    catch (e) { showToast('error', e.message); }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSelect = (product) => {
    setSelected(product);
    setForm({
      productName:     product.productName     || '',
      productType:     product.productType     || '',
      hsnCode:         product.hsnCode         || '',
      productCategory: product.productCategory || '',
      gstPercentage:   product.gstPercentage != null ? String(product.gstPercentage) : '',
      organisation:    product.organisation    || '',
    });
  };

  const handleClear = () => { setForm(EMPTY_FORM); setSelected(null); };

  const handleAdd = async () => {
    if (!form.productName.trim()) return showToast('error', 'Product name is required');
    if (!form.productType)        return showToast('error', 'Product type is required');
    setLoading(true);
    try {
      await productAPI.create(form);
      showToast('success', 'Product added successfully');
      handleClear(); loadProducts();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!selected) return showToast('error', 'Select a product to update');
    setLoading(true);
    try {
      await productAPI.update(selected.id, form);
      showToast('success', 'Product updated');
      handleClear(); loadProducts();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selected) return showToast('error', 'Select a product to delete');
    if (!window.confirm(`Delete "${selected.productName}"?`)) return;
    setLoading(true);
    try {
      await productAPI.delete(selected.id);
      showToast('success', 'Product deleted');
      handleClear(); loadProducts();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const filtered = products.filter(p =>
    p.productName.toLowerCase().includes(search.toLowerCase()) ||
    p.prodCode.includes(search) ||
    (p.hsnCode || '').includes(search)
  );

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
            <h1 className="ms-page-title">Product Master</h1>
            <p className="ms-page-subtitle">Manage inventory items and categorization</p>
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
              <label className="ms-label">ORGANISATION</label>
              <select className="ms-select" name="organisation" value={form.organisation} onChange={handleChange}>
                <option value="">SHREE SONY NX</option>
                <option value="SHREE SONY NX">SHREE SONY NX</option>
              </select>
            </div>

            <div className="ms-field mb-14">
              <label className="ms-label">PROD CODE</label>
              <select className="ms-select" name="prodCode" value={selected?.prodCode || ''} onChange={() => {}}>
                <option value="">{selected ? selected.prodCode : 'Select Code...'}</option>
                {products.map(p => <option key={p.id} value={p.prodCode}>{p.prodCode}</option>)}
              </select>
            </div>

            <div className="ms-field mb-14">
              <label className="ms-label">PRODUCT NAME</label>
              <select className="ms-select" name="productName" value={form.productName} onChange={handleChange}>
                <option value="">Select or type product name...</option>
                {products.map(p => <option key={p.id} value={p.productName}>{p.productName}</option>)}
              </select>
            </div>

            <div className="ms-field mb-14">
              <label className="ms-label">PRODUCT TYPE</label>
              <select className="ms-select" name="productType" value={form.productType} onChange={handleChange}>
                <option value="">Select Type...</option>
                {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="ms-field mb-14">
              <label className="ms-label">HSN CODE</label>
              <select className="ms-select" name="hsnCode" value={form.hsnCode} onChange={handleChange}>
                <option value="">Select HSN...</option>
                {HSN_CODES.map(h => (
                  <option key={h.code} value={h.code}>{h.code} — {h.desc}</option>
                ))}
                <option value="0">0 — Not Applicable</option>
              </select>
            </div>

            <div className="ms-field mb-14">
              <label className="ms-label">PRODUCT CATEGORY</label>
              <select className="ms-select" name="productCategory" value={form.productCategory} onChange={handleChange}>
                <option value="">Select Category...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="ms-field m-0">
              <label className="ms-label">GST PERCENTAGE</label>
              <select className="ms-select" name="gstPercentage" value={form.gstPercentage} onChange={handleChange}>
                <option value="">Select %...</option>
                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
          </div>

          {/* RIGHT — Product Directory */}
          <div className="ms-right-panel">
            <div className="ms-table-header">
              <span className="ms-table-title">Product Directory</span>
              <input className="ms-input w-200 m-0"
                placeholder="Common Search..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="ms-table-wrap">
              <table className="ms-table">
                <thead>
                  <tr>
                    {['SR. NO.','PROD CODE','PRODUCT NAME','HSN CODE','TYPE','GST(%)'].map(h => (
                      <th key={h} className="ms-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="ms-empty">No products found</td></tr>
                  ) : filtered.map((p, i) => (
                    <tr key={p.id}
                      className={`ms-tr ${selected?.id === p.id ? 'ms-tr-selected' : ''}`}
                      onClick={() => handleSelect(p)}>
                      <td className="ms-td">{i + 1}</td>
                      <td className="ms-td pm-code-cell">{p.prodCode}</td>
                      <td className="ms-td pm-name-cell">{p.productName}</td>
                      <td className="ms-td">{p.hsnCode || '0'}</td>
                      <td className="ms-td">
                        <span className={`ms-badge ${p.productType === 'SINGLE' ? 'badge-single' : 'badge-multi'}`}>
                          {p.productType}
                        </span>
                      </td>
                      <td className="ms-td">{p.gstPercentage ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom buttons for table panel */}
            <div className="d-flex gap-8 mt-16 flex-wrap">
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
            <div className="d-flex gap-8 mt-8">
              <button className="ms-btn ms-btn-clear" onClick={handleClear}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                CLEAR
              </button>
              <button className="ms-btn ms-btn-save" onClick={handleSave} disabled={loading}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                SAVE
              </button>
              <button className="ms-btn ms-btn-back" onClick={handleClear}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                BACK
              </button>
            </div>
          </div>
        </div>
      </div>
    </MasterLayout>
  );

}
