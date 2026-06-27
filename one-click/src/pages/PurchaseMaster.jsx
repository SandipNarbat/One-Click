// src/pages/PurchaseMaster.jsx
import { useState, useEffect, useCallback } from 'react';
import { purchaseAPI, supplierAPI, productAPI } from '../api/axios';
import MasterLayout from '../components/MasterLayout';
import '../styles/masterStyles.css';
import './PurchaseMaster.css';

const EMPTY_FORM = {
  type: '',
  invoiceNo: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  receivedDate: '',
  supplierId: '',
  grossAmount: '',
  discountAmount: '0',
  cgstAmount: '0',
  sgstAmount: '0',
  igstAmount: '0',
  otherCharges: '0',
  netAmount: '',
  remarks: '',
};

const newItem = () => ({
  productId: '',
  productName: '',
  brand: '',
  model: '',
  qty: '1',
  purchaseRate: '',
  discountPercent: '0',
  discountAmount: '0',
  cgstPercent: '0',
  cgstAmount: '0',
  sgstPercent: '0',
  sgstAmount: '0',
  igstPercent: '0',
  igstAmount: '0',
  gstPercent: '0',
  dpAmount: '0',
  salePrice: '0',
  amount: '',
});

export default function PurchaseMaster() {
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [items,     setItems]     = useState([newItem()]);
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products,  setProducts]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState(null);
  const [search,    setSearch]    = useState('');
  const [viewId,    setViewId]    = useState('');

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).replace(/ /g, '/');

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadPurchases = useCallback(async () => {
    try {
      const res = await purchaseAPI.getAll();
      setPurchases(res.data || []);
    } catch (e) { showToast('error', e.message); }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try { const res = await supplierAPI.getAll(); setSuppliers(res.data || []); } catch {}
  }, []);

  const loadProducts = useCallback(async () => {
    try { const res = await productAPI.getAll(); setProducts(res.data || []); } catch {}
  }, []);

  useEffect(() => {
    loadPurchases();
    loadSuppliers();
    loadProducts();
  }, [loadPurchases, loadSuppliers, loadProducts]);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleItemChange = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'qty' || field === 'purchaseRate') {
        const qty  = Number(field === 'qty'  ? value : updated.qty)  || 0;
        const rate = Number(field === 'purchaseRate' ? value : updated.purchaseRate) || 0;
        updated.amount = String(qty * rate);
      }
      return updated;
    }));
  };

  const addItem    = ()    => setItems(prev => [...prev, newItem()]);
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSelect = (p) => {
    setSelected(p);
    setForm({
      type:           p.type           || '',
      invoiceNo:      p.invoiceNo      || '',
      invoiceDate:    p.invoiceDate    ? p.invoiceDate.split('T')[0]    : '',
      receivedDate:   p.receivedDate   ? p.receivedDate.split('T')[0]  : '',
      supplierId:     String(p.supplierId  || ''),
      grossAmount:    String(p.grossAmount || ''),
      discountAmount: String(p.discountAmount || 0),
      cgstAmount:     String(p.cgstAmount    || 0),
      sgstAmount:     String(p.sgstAmount    || 0),
      igstAmount:     String(p.igstAmount    || 0),
      otherCharges:   String(p.otherCharges  || 0),
      netAmount:      String(p.netAmount || ''),
      remarks:        p.remarks || '',
    });
    if (p.purchaseItems?.length) {
      setItems(p.purchaseItems.map(it => ({
        productId:      String(it.productId      || ''),
        productName:    it.productName            || '',
        brand:          it.brand                  || '',
        model:          it.model                  || '',
        qty:            String(it.qty             || 1),
        purchaseRate:   String(it.purchaseRate    || ''),
        discountPercent:String(it.discountPercent || 0),
        discountAmount: String(it.discountAmount  || 0),
        cgstPercent:    String(it.cgstPercent     || 0),
        cgstAmount:     String(it.cgstAmount      || 0),
        sgstPercent:    String(it.sgstPercent     || 0),
        sgstAmount:     String(it.sgstAmount      || 0),
        igstPercent:    String(it.igstPercent     || 0),
        igstAmount:     String(it.igstAmount      || 0),
        gstPercent:     String(it.gstPercent      || 0),
        dpAmount:       String(it.dpAmount        || 0),
        salePrice:      String(it.salePrice       || 0),
        amount:         String(it.amount          || ''),
      })));
    } else {
      setItems([newItem()]);
    }
  };

  const handleClear = () => {
    setForm(EMPTY_FORM);
    setItems([newItem()]);
    setSelected(null);
    setViewId('');
  };

  const handleCreate = async () => {
    if (!form.invoiceNo.trim())  return showToast('error', 'Invoice No is required');
    if (!form.supplierId)        return showToast('error', 'Supplier is required');
    if (!form.grossAmount)       return showToast('error', 'Gross Amount is required');
    if (!form.netAmount)         return showToast('error', 'Net Amount is required');
    if (items.some(it => !it.productName.trim() || !it.purchaseRate || !it.amount))
      return showToast('error', 'Fill Product Name, Rate and Amount for every item');

    setLoading(true);
    try {
      await purchaseAPI.create({
        ...form,
        supplierId:     Number(form.supplierId),
        grossAmount:    Number(form.grossAmount),
        discountAmount: Number(form.discountAmount),
        cgstAmount:     Number(form.cgstAmount),
        sgstAmount:     Number(form.sgstAmount),
        igstAmount:     Number(form.igstAmount),
        otherCharges:   Number(form.otherCharges),
        netAmount:      Number(form.netAmount),
        totalItems:     items.length,
        totalQty:       items.reduce((s, it) => s + Number(it.qty || 0), 0),
        items: items.map(it => ({
          ...it,
          productId:      it.productId ? Number(it.productId) : undefined,
          qty:            Number(it.qty),
          purchaseRate:   Number(it.purchaseRate),
          discountPercent:Number(it.discountPercent),
          discountAmount: Number(it.discountAmount),
          cgstPercent:    Number(it.cgstPercent),
          cgstAmount:     Number(it.cgstAmount),
          sgstPercent:    Number(it.sgstPercent),
          sgstAmount:     Number(it.sgstAmount),
          igstPercent:    Number(it.igstPercent),
          igstAmount:     Number(it.igstAmount),
          gstPercent:     Number(it.gstPercent),
          dpAmount:       Number(it.dpAmount),
          salePrice:      Number(it.salePrice),
          amount:         Number(it.amount),
        })),
      });
      showToast('success', 'Purchase created successfully');
      handleClear();
      loadPurchases();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!selected) return showToast('error', 'Select a purchase to update');
    setLoading(true);
    try {
      await purchaseAPI.update(selected.id, {
        ...form,
        supplierId:  Number(form.supplierId),
        grossAmount: Number(form.grossAmount),
        netAmount:   Number(form.netAmount),
      });
      showToast('success', 'Purchase updated');
      handleClear();
      loadPurchases();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selected) return showToast('error', 'Select a purchase to delete');
    if (!window.confirm(`Delete purchase "${selected.purchaseNo}"?`)) return;
    setLoading(true);
    try {
      await purchaseAPI.delete(selected.id);
      showToast('success', 'Purchase deleted');
      handleClear();
      loadPurchases();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleSearch = async () => {
    if (!search.trim()) return loadPurchases();
    setLoading(true);
    try {
      const res = await purchaseAPI.search(search.trim());
      setPurchases(res.data || []);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleViewById = async () => {
    if (!viewId.trim()) return showToast('error', 'Enter a Purchase ID');
    setLoading(true);
    try {
      const res = await purchaseAPI.getById(Number(viewId));
      if (res.data) {
        handleSelect(res.data);
        showToast('success', `Loaded: ${res.data.purchaseNo}`);
      }
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const totalQty    = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  const totalAmount = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);

  return (
    <MasterLayout>
      {toast && (
        <div className={`ms-toast ms-toast-${toast.type}`}>{toast.msg}</div>
      )}

      <div className="ms-page">

        {/* ── Page Header ───────────────────────── */}
        <div className="ms-page-header">
          <div>
            <h1 className="ms-page-title">Purchase Entry</h1>
            <p className="ms-page-subtitle">Create and manage purchase entries — all API operations</p>
          </div>
          <div className="ms-entry-date-box">
            <span className="ms-entry-label">ENTRY DATE</span>
            <span className="ms-entry-value">{today}</span>
          </div>
        </div>

        {/* ── Purchase Header Form ──────────────── */}
        <div className="ms-form-card">
          <div className="pm-section-label">PURCHASE HEADER</div>

          <div className="ms-row">
            <div className="ms-field pm-field-narrow">
              <label className="ms-label">PURCHASE NO</label>
              <input className="ms-input ms-input-disabled"
                value={selected ? selected.purchaseNo : 'AUTO'} readOnly />
            </div>
            <div className="ms-field pm-field-narrow">
              <label className="ms-label">TYPE</label>
              <select className="ms-select" name="type" value={form.type} onChange={handleChange}>
                <option value="">Select</option>
                <option value="LOCAL">LOCAL</option>
                <option value="IMPORT">IMPORT</option>
                <option value="RETURN">RETURN</option>
              </select>
            </div>
            <div className="ms-field">
              <label className="ms-label">INVOICE NO *</label>
              <input className="ms-input" name="invoiceNo" value={form.invoiceNo}
                onChange={handleChange} placeholder="INV-0001" />
            </div>
            <div className="ms-field">
              <label className="ms-label">INVOICE DATE *</label>
              <input className="ms-input" name="invoiceDate" type="date"
                value={form.invoiceDate} onChange={handleChange} />
            </div>
            <div className="ms-field">
              <label className="ms-label">RECEIVED DATE</label>
              <input className="ms-input" name="receivedDate" type="date"
                value={form.receivedDate} onChange={handleChange} />
            </div>
          </div>

          <div className="ms-row">
            <div className="ms-field flex-2">
              <label className="ms-label">SUPPLIER *</label>
              <select className="ms-select" name="supplierId" value={form.supplierId} onChange={handleChange}>
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.supplierId} — {s.supplierName}
                  </option>
                ))}
              </select>
            </div>
            <div className="ms-field flex-2">
              <label className="ms-label">REMARKS</label>
              <input className="ms-input" name="remarks" value={form.remarks}
                onChange={handleChange} placeholder="Optional remarks..." />
            </div>
          </div>

          <div className="ms-section-divider">AMOUNT DETAILS</div>

          <div className="ms-row">
            <div className="ms-field">
              <label className="ms-label">GROSS AMOUNT *</label>
              <input className="ms-input" name="grossAmount" type="number"
                value={form.grossAmount} onChange={handleChange} placeholder="0.00" />
            </div>
            <div className="ms-field">
              <label className="ms-label">DISCOUNT</label>
              <input className="ms-input" name="discountAmount" type="number"
                value={form.discountAmount} onChange={handleChange} placeholder="0.00" />
            </div>
            <div className="ms-field">
              <label className="ms-label">CGST</label>
              <input className="ms-input" name="cgstAmount" type="number"
                value={form.cgstAmount} onChange={handleChange} placeholder="0.00" />
            </div>
            <div className="ms-field">
              <label className="ms-label">SGST</label>
              <input className="ms-input" name="sgstAmount" type="number"
                value={form.sgstAmount} onChange={handleChange} placeholder="0.00" />
            </div>
            <div className="ms-field">
              <label className="ms-label">IGST</label>
              <input className="ms-input" name="igstAmount" type="number"
                value={form.igstAmount} onChange={handleChange} placeholder="0.00" />
            </div>
            <div className="ms-field">
              <label className="ms-label">OTHER CHARGES</label>
              <input className="ms-input" name="otherCharges" type="number"
                value={form.otherCharges} onChange={handleChange} placeholder="0.00" />
            </div>
            <div className="ms-field">
              <label className="ms-label">NET AMOUNT *</label>
              <input className="ms-input pm-net-input" name="netAmount" type="number"
                value={form.netAmount} onChange={handleChange} placeholder="0.00" />
            </div>
          </div>
        </div>

        {/* ── Items Table ───────────────────────── */}
        <div className="ms-table-card mt-16">
          <div className="ms-table-header">
            <span className="ms-table-title">
              Purchase Items
              <span className="pm-items-meta">
                {items.length} item{items.length !== 1 ? 's' : ''} &nbsp;·&nbsp; Qty: {totalQty} &nbsp;·&nbsp; Total: ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            </span>
            <button className="ms-btn ms-btn-add pm-add-item-btn" onClick={addItem}>+ ADD ITEM</button>
          </div>

          <div className="ms-table-wrap">
            <table className="ms-table">
              <thead>
                <tr>
                  {['#', 'Product Name', 'Brand', 'Model', 'Qty', 'Rate (₹)', 'Disc %', 'GST %', 'DP (₹)', 'Sale Price (₹)', 'Amount (₹)', ''].map(h => (
                    <th key={h} className="ms-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="ms-tr">
                    <td className="ms-td pm-sr">{idx + 1}</td>
                    <td className="ms-td">
                      <input className="ms-input m-0 pm-item-input pm-wide"
                        value={item.productName}
                        onChange={e => handleItemChange(idx, 'productName', e.target.value)}
                        placeholder="Product name *"
                        list="product-names" />
                      <datalist id="product-names">
                        {products.map(p => <option key={p.id} value={p.productName} />)}
                      </datalist>
                    </td>
                    <td className="ms-td">
                      <input className="ms-input m-0 pm-item-input pm-med"
                        value={item.brand}
                        onChange={e => handleItemChange(idx, 'brand', e.target.value)}
                        placeholder="Brand" />
                    </td>
                    <td className="ms-td">
                      <input className="ms-input m-0 pm-item-input pm-med"
                        value={item.model}
                        onChange={e => handleItemChange(idx, 'model', e.target.value)}
                        placeholder="Model" />
                    </td>
                    <td className="ms-td">
                      <input className="ms-input m-0 pm-item-input pm-narrow" type="number" min="1"
                        value={item.qty}
                        onChange={e => handleItemChange(idx, 'qty', e.target.value)} />
                    </td>
                    <td className="ms-td">
                      <input className="ms-input m-0 pm-item-input pm-med" type="number"
                        value={item.purchaseRate}
                        onChange={e => handleItemChange(idx, 'purchaseRate', e.target.value)}
                        placeholder="Rate *" />
                    </td>
                    <td className="ms-td">
                      <input className="ms-input m-0 pm-item-input pm-narrow" type="number"
                        value={item.discountPercent}
                        onChange={e => handleItemChange(idx, 'discountPercent', e.target.value)} />
                    </td>
                    <td className="ms-td">
                      <input className="ms-input m-0 pm-item-input pm-narrow" type="number"
                        value={item.gstPercent}
                        onChange={e => handleItemChange(idx, 'gstPercent', e.target.value)} />
                    </td>
                    <td className="ms-td">
                      <input className="ms-input m-0 pm-item-input pm-med" type="number"
                        value={item.dpAmount}
                        onChange={e => handleItemChange(idx, 'dpAmount', e.target.value)} />
                    </td>
                    <td className="ms-td">
                      <input className="ms-input m-0 pm-item-input pm-med" type="number"
                        value={item.salePrice}
                        onChange={e => handleItemChange(idx, 'salePrice', e.target.value)} />
                    </td>
                    <td className="ms-td">
                      <input className="ms-input m-0 pm-item-input pm-med pm-amount-input" type="number"
                        value={item.amount}
                        onChange={e => handleItemChange(idx, 'amount', e.target.value)}
                        placeholder="Amount *" />
                    </td>
                    <td className="ms-td">
                      {items.length > 1 && (
                        <button className="pm-remove-btn" onClick={() => removeItem(idx)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── All Purchases Table ───────────────── */}
        <div className="ms-table-card mt-16">
          <div className="ms-table-header">
            <span className="ms-table-title">All Purchases ({purchases.length})</span>
            <div className="pm-search-row">
              <input className="ms-input m-0 pm-search-input"
                placeholder="Search by No / Invoice / Supplier…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()} />
              <button className="ms-btn ms-btn-show" onClick={handleSearch} disabled={loading}>SEARCH</button>
              <button className="ms-btn ms-btn-clear" onClick={() => { setSearch(''); loadPurchases(); }}>ALL</button>
              <span className="pm-divider">|</span>
              <input className="ms-input m-0 pm-id-input"
                placeholder="ID…"
                value={viewId}
                onChange={e => setViewId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleViewById()} />
              <button className="ms-btn ms-btn-edit" onClick={handleViewById} disabled={loading}>VIEW BY ID</button>
            </div>
          </div>

          <div className="ms-table-wrap">
            <table className="ms-table">
              <thead>
                <tr>
                  {['Sr.', 'Purchase No', 'Type', 'Invoice No', 'Invoice Date', 'Supplier', 'Items', 'Qty', 'Net Amount', 'Status'].map(h => (
                    <th key={h} className="ms-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr><td colSpan={10} className="ms-empty">No purchases found</td></tr>
                ) : purchases.map((p, i) => (
                  <tr key={p.id}
                    className={`ms-tr ${selected?.id === p.id ? 'ms-tr-selected' : ''}`}
                    onClick={() => handleSelect(p)}>
                    <td className="ms-td">{i + 1}</td>
                    <td className="ms-td pm-pur-no">{p.purchaseNo}</td>
                    <td className="ms-td">{p.type || '—'}</td>
                    <td className="ms-td">{p.invoiceNo}</td>
                    <td className="ms-td">
                      {p.invoiceDate ? new Date(p.invoiceDate).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="ms-td">{p.supplier?.supplierName || '—'}</td>
                    <td className="ms-td pm-center">{p.purchaseItems?.length ?? 0}</td>
                    <td className="ms-td pm-center">{p.totalQty ?? 0}</td>
                    <td className="ms-td pm-amount">₹{Number(p.netAmount).toLocaleString('en-IN')}</td>
                    <td className="ms-td">
                      <span className={`ms-badge pm-badge-${(p.status || 'SAVED').toLowerCase()}`}>
                        {p.status || 'SAVED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ms-table-footer">
            Showing {purchases.length} record{purchases.length !== 1 ? 's' : ''} · Click a row to select &amp; load into form
          </div>
        </div>

        {/* ── Action Bar ────────────────────────── */}
        <div className="ms-action-bar">
          <div className="ms-action-left">
            <button className="ms-btn ms-btn-add"    onClick={handleCreate} disabled={loading}><span>+</span> CREATE</button>
            <button className="ms-btn ms-btn-edit"   onClick={handleSave}   disabled={loading}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              EDIT
            </button>
            <button className="ms-btn ms-btn-delete" onClick={handleDelete} disabled={loading}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              DELETE
            </button>
            <button className="ms-btn ms-btn-clear"  onClick={handleClear}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              CLEAR
            </button>
          </div>
          <div className="ms-action-right">
            <button className="ms-btn ms-btn-save"  onClick={loadPurchases} disabled={loading}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              REFRESH
            </button>
            <button className="ms-btn ms-btn-print" onClick={() => window.print()}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              PRINT
            </button>
            <button className="ms-btn ms-btn-back"  onClick={handleClear}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              BACK
            </button>
          </div>
        </div>

      </div>
    </MasterLayout>
  );
}
