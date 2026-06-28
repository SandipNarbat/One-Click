// src/pages/PurchaseMaster.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { purchaseAPI, supplierAPI, productAPI } from '../api/axios';
import { readDraft, saveDraft, clearDraft } from '../hooks/useDraft';
import MasterLayout from '../components/MasterLayout';
import '../styles/masterStyles.css';
import './PurchaseMaster.css';

const EMPTY_FORM = {
  type: '',
  invoiceNo: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  receivedDate: '',
  supplierId: '',
  otherCharges: '0',
  remarks: '',
};

const DRAFT_KEY = 'purchase-master';

const newItem = () => ({
  company: 'Single',
  barcode: '',
  productId: '',
  productName: '',
  hsnCode: '',
  brand: '',
  model: '',
  color: '',
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
  dpAmount: '0',
  salePrice: '0',
  salesGstPercent: '0',
  imeiNo: '',
  amount: '0',
});

export default function PurchaseMaster() {
  const [form,      setForm]      = useState(() => { const d = readDraft(DRAFT_KEY); return d?.form ? { ...EMPTY_FORM, ...d.form } : EMPTY_FORM; });
  const [items,     setItems]     = useState(() => { const d = readDraft(DRAFT_KEY); return d?.items?.length ? d.items : [newItem()]; });
  const [hasDraft]               = useState(() => { const d = readDraft(DRAFT_KEY); return !!(d?.form && Object.values(d.form).some(v => v !== '' && v !== null)); });
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products,  setProducts]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState(null);
  const [search,    setSearch]    = useState('');
  const [viewId,    setViewId]    = useState('');
  const barcodeRefs = useRef([]);
  const imeiRefs    = useRef([]);

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (hasDraft) showToast('info', 'Draft restored — you have unsaved changes'); }, []);
  useEffect(() => {
    if (!selected) {
      const hasData = Object.keys(EMPTY_FORM).some(k => form[k] !== EMPTY_FORM[k])
        || items.some(it => it.productName || it.purchaseRate);
      hasData ? saveDraft(DRAFT_KEY, { form, items }) : clearDraft(DRAFT_KEY);
    }
  }, [form, items, selected]); // eslint-disable-line

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleItemChange = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };

      // Recompute base amount from qty × rate
      const qty    = Number(updated.qty)         || 0;
      const rate   = Number(updated.purchaseRate) || 0;
      const amount = qty * rate;
      updated.amount = String(amount);

      // Discount bidirectional
      if (field === 'discountPercent') {
        const pct = Number(value) || 0;
        updated.discountAmount = amount > 0 ? String(((amount * pct) / 100).toFixed(2)) : '0';
      } else if (field === 'discountAmount') {
        const discAmt = Number(value) || 0;
        updated.discountPercent = amount > 0 ? String(((discAmt / amount) * 100).toFixed(2)) : '0';
      } else if (field === 'qty' || field === 'purchaseRate') {
        // Recalc discount rupee amount from current percent when qty/rate changes
        const pct = Number(updated.discountPercent) || 0;
        updated.discountAmount = String(((amount * pct) / 100).toFixed(2));
      }

      // Auto-compute CGST, SGST, IGST (read-only)
      const taxable = Math.max(0, amount - (Number(updated.discountAmount) || 0));
      updated.cgstAmount = String(((taxable * (Number(updated.cgstPercent)  || 0)) / 100).toFixed(2));
      updated.sgstAmount = String(((taxable * (Number(updated.sgstPercent)  || 0)) / 100).toFixed(2));
      updated.igstAmount = String(((taxable * (Number(updated.igstPercent)  || 0)) / 100).toFixed(2));

      return updated;
    }));
  };

  const addItem    = () => setItems(prev => [...prev, newItem()]);
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  // Derived totals — all auto-computed from items
  const grossAmount   = items.reduce((s, it) => s + (Number(it.amount)        || 0), 0);
  const totalDiscount = items.reduce((s, it) => s + (Number(it.discountAmount) || 0), 0);
  const totalCgst     = items.reduce((s, it) => s + (Number(it.cgstAmount)     || 0), 0);
  const totalSgst     = items.reduce((s, it) => s + (Number(it.sgstAmount)     || 0), 0);
  const totalIgst     = items.reduce((s, it) => s + (Number(it.igstAmount)     || 0), 0);
  const otherCharges  = Number(form.otherCharges) || 0;
  const netAmount     = grossAmount - totalDiscount + totalCgst + totalSgst + totalIgst + otherCharges;
  const totalQty      = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);

  const handleSelect = (p) => {
    clearDraft(DRAFT_KEY);
    setSelected(p);
    setForm({
      type:         p.type         || '',
      invoiceNo:    p.invoiceNo    || '',
      invoiceDate:  p.invoiceDate  ? p.invoiceDate.split('T')[0]  : '',
      receivedDate: p.receivedDate ? p.receivedDate.split('T')[0] : '',
      supplierId:   String(p.supplierId || ''),
      otherCharges: String(p.otherCharges || 0),
      remarks:      p.remarks || '',
    });
    if (p.purchaseItems?.length) {
      setItems(p.purchaseItems.map(it => ({
        ...newItem(),
        company:         it.company         || 'Single',
        barcode:         it.barcode         || '',
        productId:       String(it.productId || ''),
        productName:     it.productName      || '',
        hsnCode:         it.hsnCode          || '',
        brand:           it.brand            || '',
        model:           it.model            || '',
        color:           it.colour           || '',
        qty:             String(it.qty       || 1),
        purchaseRate:    String(it.purchaseRate    || ''),
        discountPercent: String(it.discountPercent || 0),
        discountAmount:  String(it.discountAmount  || 0),
        cgstPercent:     String(it.cgstPercent     || 0),
        cgstAmount:      String(it.cgstAmount      || 0),
        sgstPercent:     String(it.sgstPercent     || 0),
        sgstAmount:      String(it.sgstAmount      || 0),
        igstPercent:     String(it.igstPercent     || 0),
        igstAmount:      String(it.igstAmount      || 0),
        dpAmount:        String(it.dpAmount         || 0),
        salePrice:       String(it.salePrice        || 0),
        salesGstPercent: String(it.salesGstPercent  || 0),
        imeiNo:          it.imeis?.[0]?.imeiNo      || '',
        amount:          String(it.amount           || 0),
      })));
    } else {
      setItems([newItem()]);
    }
  };

  const handleClear = () => {
    clearDraft(DRAFT_KEY);
    setForm(EMPTY_FORM);
    setItems([newItem()]);
    setSelected(null);
    setViewId('');
  };

  const handleCreate = async () => {
    if (!form.invoiceNo.trim()) return showToast('error', 'Invoice No is required');
    if (!form.supplierId)       return showToast('error', 'Supplier is required');
    if (items.some(it => !it.productName.trim() || !it.purchaseRate))
      return showToast('error', 'Fill Product Name and Rate for every item');

    setLoading(true);
    try {
      await purchaseAPI.create({
        ...form,
        supplierId:     Number(form.supplierId),
        grossAmount,
        discountAmount: totalDiscount,
        cgstAmount:     totalCgst,
        sgstAmount:     totalSgst,
        igstAmount:     totalIgst,
        otherCharges,
        netAmount,
        totalItems:     items.length,
        totalQty,
        items: items.map(it => ({
          company:         it.company,
          barcode:         it.barcode,
          productId:       it.productId ? Number(it.productId) : undefined,
          productName:     it.productName,
          hsnCode:         it.hsnCode,
          brand:           it.brand,
          model:           it.model,
          colour:          it.color,
          qty:             Number(it.qty),
          purchaseRate:    Number(it.purchaseRate),
          discountPercent: Number(it.discountPercent),
          discountAmount:  Number(it.discountAmount),
          cgstPercent:     Number(it.cgstPercent),
          cgstAmount:      Number(it.cgstAmount),
          sgstPercent:     Number(it.sgstPercent),
          sgstAmount:      Number(it.sgstAmount),
          igstPercent:     Number(it.igstPercent),
          igstAmount:      Number(it.igstAmount),
          gstPercent:      Number(it.cgstPercent) + Number(it.sgstPercent),
          hsnCode:         it.hsnCode,
          dpAmount:        Number(it.dpAmount),
          salePrice:       Number(it.salePrice),
          salesGstPercent: Number(it.salesGstPercent),
          imeis:           it.imeiNo ? [it.imeiNo] : [],
          amount:          Number(it.amount),
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
    if (items.some(it => !it.productName.trim() || !it.purchaseRate))
      return showToast('error', 'Fill Product Name and Rate for every item');

    setLoading(true);
    try {
      await purchaseAPI.update(selected.id, {
        ...form,
        supplierId:     Number(form.supplierId),
        grossAmount,
        discountAmount: totalDiscount,
        cgstAmount:     totalCgst,
        sgstAmount:     totalSgst,
        igstAmount:     totalIgst,
        otherCharges,
        netAmount,
        totalItems:     items.length,
        totalQty,
        items: items.map(it => ({
          company:         it.company,
          barcode:         it.barcode,
          productId:       it.productId ? Number(it.productId) : undefined,
          productName:     it.productName,
          hsnCode:         it.hsnCode,
          brand:           it.brand,
          model:           it.model,
          colour:          it.color,
          qty:             Number(it.qty),
          purchaseRate:    Number(it.purchaseRate),
          discountPercent: Number(it.discountPercent),
          discountAmount:  Number(it.discountAmount),
          cgstPercent:     Number(it.cgstPercent),
          cgstAmount:      Number(it.cgstAmount),
          sgstPercent:     Number(it.sgstPercent),
          sgstAmount:      Number(it.sgstAmount),
          igstPercent:     Number(it.igstPercent),
          igstAmount:      Number(it.igstAmount),
          gstPercent:      Number(it.cgstPercent) + Number(it.sgstPercent),
          dpAmount:        Number(it.dpAmount),
          salePrice:       Number(it.salePrice),
          salesGstPercent: Number(it.salesGstPercent),
          imeis:           it.imeiNo ? [it.imeiNo] : [],
          amount:          Number(it.amount),
        })),
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

  const fmt = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
                  <option key={s.id} value={s.id}>{s.supplierId} — {s.supplierName}</option>
                ))}
              </select>
            </div>
            <div className="ms-field flex-2">
              <label className="ms-label">REMARKS</label>
              <input className="ms-input" name="remarks" value={form.remarks}
                onChange={handleChange} placeholder="Optional remarks..." />
            </div>
          </div>
        </div>

        {/* ── Purchase Items (card layout) ──────── */}
        <div className="ms-table-card mt-16">
          <div className="ms-table-header">
            <span className="ms-table-title">
              Purchase Items
              <span className="pm-items-meta">
                {items.length} item{items.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
                Qty: {totalQty} &nbsp;·&nbsp;
                Total: ₹{grossAmount.toLocaleString('en-IN')}
              </span>
            </span>
            <button className="ms-btn ms-btn-add pm-add-item-btn" onClick={addItem}>+ ADD ITEM</button>
          </div>

          <div className="pm-items-list">
            {items.map((item, idx) => (
              <div key={idx} className="pm-item-card">

                {/* Card header */}
                <div className="pm-item-card-header">
                  <span className="pm-item-card-title">Item #{idx + 1}</span>
                  <div className="pm-item-card-amount">
                    Amount: <strong>₹{Number(item.amount).toLocaleString('en-IN')}</strong>
                  </div>
                  {items.length > 1 && (
                    <button className="pm-remove-btn" onClick={() => removeItem(idx)} title="Remove item">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>

                {/* Row 1: Company + Barcode */}
                <div className="pm-item-row">
                  <div className="pm-item-field pm-field-xs">
                    <label className="pm-item-label">COMPANY</label>
                    <select className="ms-select m-0" value={item.company}
                      onChange={e => handleItemChange(idx, 'company', e.target.value)}>
                      <option value="Single">Single</option>
                    </select>
                  </div>
                  <div className="pm-item-field pm-field-grow">
                    <label className="pm-item-label">BARCODE</label>
                    <div className="pm-scan-wrap">
                      <input className="ms-input m-0"
                        ref={el => { barcodeRefs.current[idx] = el; }}
                        value={item.barcode}
                        onChange={e => handleItemChange(idx, 'barcode', e.target.value)}
                        placeholder="Scan or enter barcode..." />
                      <button className="pm-scan-btn" title="Click then scan"
                        onClick={() => barcodeRefs.current[idx]?.focus()}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
                          <line x1="3" y1="9" x2="21" y2="9"/>
                        </svg>
                        SCAN
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 2: Product + HSN + Color */}
                <div className="pm-item-row">
                  <div className="pm-item-field pm-field-grow">
                    <label className="pm-item-label">PRODUCT *</label>
                    <input className="ms-input m-0"
                      value={item.productName}
                      onChange={e => handleItemChange(idx, 'productName', e.target.value)}
                      placeholder="Search or enter product name..."
                      list={`pn-${idx}`} />
                    <datalist id={`pn-${idx}`}>
                      {products.map(p => <option key={p.id} value={p.productName} />)}
                    </datalist>
                  </div>
                  <div className="pm-item-field pm-field-sm">
                    <label className="pm-item-label">HSN CODE</label>
                    <input className="ms-input m-0"
                      value={item.hsnCode}
                      onChange={e => handleItemChange(idx, 'hsnCode', e.target.value)}
                      placeholder="e.g. 8517" />
                  </div>
                  <div className="pm-item-field pm-field-sm">
                    <label className="pm-item-label">COLOR</label>
                    <input className="ms-input m-0"
                      value={item.color}
                      onChange={e => handleItemChange(idx, 'color', e.target.value)}
                      placeholder="Color..." />
                  </div>
                </div>

                {/* Row 3: Brand + Model */}
                <div className="pm-item-row">
                  <div className="pm-item-field pm-field-md">
                    <label className="pm-item-label">BRAND</label>
                    <input className="ms-input m-0"
                      value={item.brand}
                      onChange={e => handleItemChange(idx, 'brand', e.target.value)}
                      placeholder="Brand..." />
                  </div>
                  <div className="pm-item-field pm-field-md">
                    <label className="pm-item-label">MODEL</label>
                    <input className="ms-input m-0"
                      value={item.model}
                      onChange={e => handleItemChange(idx, 'model', e.target.value)}
                      placeholder="Model / Storage..." />
                  </div>
                </div>

                {/* Row 4: Qty + Purchase Rate */}
                <div className="pm-item-row">
                  <div className="pm-item-field pm-field-xs">
                    <label className="pm-item-label">QTY</label>
                    <input className="ms-input m-0" type="number" min="1"
                      value={item.qty}
                      onChange={e => handleItemChange(idx, 'qty', e.target.value)} />
                  </div>
                  <div className="pm-item-field pm-field-md">
                    <label className="pm-item-label">PURCHASE RATE (INCL. TAX ₹)</label>
                    <input className="ms-input m-0 pm-rate-input" type="number"
                      value={item.purchaseRate}
                      onChange={e => handleItemChange(idx, 'purchaseRate', e.target.value)}
                      placeholder="0.00" />
                  </div>
                </div>

                {/* Row 5: Discount + CGST + SGST */}
                <div className="pm-item-row">
                  <div className="pm-item-field pm-field-xs">
                    <label className="pm-item-label">DISC %</label>
                    <input className="ms-input m-0" type="number" min="0" max="100"
                      value={item.discountPercent}
                      onChange={e => handleItemChange(idx, 'discountPercent', e.target.value)} />
                  </div>
                  <div className="pm-item-field pm-field-sm">
                    <label className="pm-item-label">DISC ₹</label>
                    <input className="ms-input m-0" type="number" min="0"
                      value={item.discountAmount}
                      onChange={e => handleItemChange(idx, 'discountAmount', e.target.value)} />
                  </div>
                  <div className="pm-item-field pm-field-xs">
                    <label className="pm-item-label">CGST %</label>
                    <input className="ms-input m-0" type="number" min="0"
                      value={item.cgstPercent}
                      onChange={e => handleItemChange(idx, 'cgstPercent', e.target.value)} />
                  </div>
                  <div className="pm-item-field pm-field-sm">
                    <label className="pm-item-label">CGST ₹ (AUTO)</label>
                    <input className="ms-input m-0 ms-input-disabled" type="text"
                      value={fmt(item.cgstAmount)} readOnly />
                  </div>
                  <div className="pm-item-field pm-field-xs">
                    <label className="pm-item-label">SGST %</label>
                    <input className="ms-input m-0" type="number" min="0"
                      value={item.sgstPercent}
                      onChange={e => handleItemChange(idx, 'sgstPercent', e.target.value)} />
                  </div>
                  <div className="pm-item-field pm-field-sm">
                    <label className="pm-item-label">SGST ₹ (AUTO)</label>
                    <input className="ms-input m-0 ms-input-disabled" type="text"
                      value={fmt(item.sgstAmount)} readOnly />
                  </div>
                </div>

                {/* Row 6: DP + Sale Price + Sales GST */}
                <div className="pm-item-row">
                  <div className="pm-item-field pm-field-md">
                    <label className="pm-item-label">DP AMOUNT ₹</label>
                    <input className="ms-input m-0" type="number"
                      value={item.dpAmount}
                      onChange={e => handleItemChange(idx, 'dpAmount', e.target.value)} />
                  </div>
                  <div className="pm-item-field pm-field-md">
                    <label className="pm-item-label">SALE PRICE (INCL. TAX ₹)</label>
                    <input className="ms-input m-0 pm-sale-input" type="number"
                      value={item.salePrice}
                      onChange={e => handleItemChange(idx, 'salePrice', e.target.value)} />
                  </div>
                  <div className="pm-item-field pm-field-xs">
                    <label className="pm-item-label">SALES GST %</label>
                    <input className="ms-input m-0" type="number"
                      value={item.salesGstPercent}
                      onChange={e => handleItemChange(idx, 'salesGstPercent', e.target.value)} />
                  </div>
                </div>

                {/* Row 7: IMEI / Serial No */}
                <div className="pm-item-row">
                  <div className="pm-item-field pm-field-grow">
                    <label className="pm-item-label">IMEI NO. / SERIAL NO.</label>
                    <div className="pm-scan-wrap">
                      <input className="ms-input m-0"
                        ref={el => { imeiRefs.current[idx] = el; }}
                        value={item.imeiNo}
                        onChange={e => handleItemChange(idx, 'imeiNo', e.target.value)}
                        placeholder="Scan or enter IMEI / Serial number..." />
                      <button className="pm-scan-btn" title="Click then scan IMEI"
                        onClick={() => imeiRefs.current[idx]?.focus()}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
                          <line x1="3" y1="9" x2="21" y2="9"/>
                        </svg>
                        SCAN
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* ── Amount Details (auto-computed) ────── */}
        <div className="ms-form-card mt-16">
          <div className="pm-section-label">AMOUNT DETAILS</div>
          <div className="pm-amount-grid">
            <div className="pm-amount-field">
              <label className="pm-amount-label">GROSS AMOUNT</label>
              <div className="pm-amount-value">₹{fmt(grossAmount)}</div>
            </div>
            <div className="pm-amount-field">
              <label className="pm-amount-label">TOTAL DISCOUNT</label>
              <div className="pm-amount-value pm-val-discount">−₹{fmt(totalDiscount)}</div>
            </div>
            <div className="pm-amount-field">
              <label className="pm-amount-label">CGST</label>
              <div className="pm-amount-value">₹{fmt(totalCgst)}</div>
            </div>
            <div className="pm-amount-field">
              <label className="pm-amount-label">SGST</label>
              <div className="pm-amount-value">₹{fmt(totalSgst)}</div>
            </div>
            <div className="pm-amount-field">
              <label className="pm-amount-label">IGST</label>
              <div className="pm-amount-value">₹{fmt(totalIgst)}</div>
            </div>
            <div className="pm-amount-field">
              <label className="pm-amount-label">OTHER CHARGES</label>
              <input className="ms-input m-0" name="otherCharges" type="number"
                value={form.otherCharges} onChange={handleChange} placeholder="0.00" />
            </div>
            <div className="pm-amount-field pm-net-field">
              <label className="pm-amount-label">NET AMOUNT</label>
              <div className="pm-amount-value pm-val-net">₹{fmt(netAmount)}</div>
            </div>
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
            <button className="ms-btn ms-btn-save"  onClick={handleSave} disabled={loading}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              SAVE
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

      {/* ── Print-only area ───────────────────── */}
      <div className="pm-print-only">

        {/* Company + Report header */}
        <div className="pm-ph-row">
          <div>
            <div className="pm-ph-company">SMART STS</div>
            <div className="pm-ph-tagline">Smart Service &amp; Trading Solutions</div>
          </div>
          <div className="pm-ph-right">
            <div className="pm-ph-title">PURCHASE REPORT</div>
            <div className="pm-ph-meta">
              {search ? <span className="pm-ph-filter">Filter: &quot;{search}&quot; &nbsp;·&nbsp; </span> : null}
              {purchases.length} record{purchases.length !== 1 ? 's' : ''} &nbsp;·&nbsp; Printed: {today}
            </div>
          </div>
        </div>
        <div className="pm-ph-rule" />

        {/* Summary strip */}
        <div className="pm-ps-strip">
          <div className="pm-ps-cell">
            <span className="pm-ps-label">TOTAL PURCHASES</span>
            <span className="pm-ps-value">{purchases.length}</span>
          </div>
          <div className="pm-ps-cell">
            <span className="pm-ps-label">TOTAL ITEMS</span>
            <span className="pm-ps-value">{purchases.reduce((s, p) => s + (p.purchaseItems?.length ?? 0), 0)}</span>
          </div>
          <div className="pm-ps-cell">
            <span className="pm-ps-label">TOTAL QTY</span>
            <span className="pm-ps-value">{purchases.reduce((s, p) => s + (p.totalQty ?? 0), 0)}</span>
          </div>
          <div className="pm-ps-cell">
            <span className="pm-ps-label">GROSS AMOUNT</span>
            <span className="pm-ps-value pm-ps-money">
              ₹{purchases.reduce((s, p) => s + Number(p.grossAmount || 0), 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="pm-ps-cell">
            <span className="pm-ps-label">TOTAL DISCOUNT</span>
            <span className="pm-ps-value pm-ps-discount">
              −₹{purchases.reduce((s, p) => s + Number(p.discountAmount || 0), 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="pm-ps-cell pm-ps-net">
            <span className="pm-ps-label">NET AMOUNT</span>
            <span className="pm-ps-value pm-ps-money">
              ₹{purchases.reduce((s, p) => s + Number(p.netAmount || 0), 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Data table */}
        <table className="pm-pt">
          <colgroup>
            <col className="col-sr" /><col className="col-purno" />
            <col className="col-type" /><col className="col-invno" />
            <col className="col-invdate" /><col className="col-supp" />
            <col className="col-items" /><col className="col-qty" />
            <col className="col-gross" /><col className="col-disc" />
            <col className="col-cgst" /><col className="col-sgst" />
            <col className="col-net" /><col className="col-status" />
          </colgroup>
          <thead>
            <tr>
              <th className="pm-pt-th pm-pt-sr">Sr.</th>
              <th className="pm-pt-th">Purchase No</th>
              <th className="pm-pt-th">Type</th>
              <th className="pm-pt-th">Invoice No</th>
              <th className="pm-pt-th">Invoice Date</th>
              <th className="pm-pt-th">Supplier</th>
              <th className="pm-pt-th pm-pt-c">Items</th>
              <th className="pm-pt-th pm-pt-c">Qty</th>
              <th className="pm-pt-th pm-pt-r">Gross Amt (₹)</th>
              <th className="pm-pt-th pm-pt-r">Discount (₹)</th>
              <th className="pm-pt-th pm-pt-r">CGST (₹)</th>
              <th className="pm-pt-th pm-pt-r">SGST (₹)</th>
              <th className="pm-pt-th pm-pt-r">Net Amt (₹)</th>
              <th className="pm-pt-th pm-pt-c">Status</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p, i) => (
              <tr key={p.id} className={i % 2 === 1 ? 'pm-pt-alt' : ''}>
                <td className="pm-pt-td pm-pt-sr">{i + 1}</td>
                <td className="pm-pt-td pm-pt-bold pm-pt-blue">{p.purchaseNo}</td>
                <td className="pm-pt-td">{p.type || '—'}</td>
                <td className="pm-pt-td">{p.invoiceNo}</td>
                <td className="pm-pt-td">
                  {p.invoiceDate ? new Date(p.invoiceDate).toLocaleDateString('en-GB') : '—'}
                </td>
                <td className="pm-pt-td">{p.supplier?.supplierName || '—'}</td>
                <td className="pm-pt-td pm-pt-c">{p.purchaseItems?.length ?? 0}</td>
                <td className="pm-pt-td pm-pt-c">{p.totalQty ?? 0}</td>
                <td className="pm-pt-td pm-pt-r">{Number(p.grossAmount || 0).toLocaleString('en-IN')}</td>
                <td className="pm-pt-td pm-pt-r pm-pt-disc">{Number(p.discountAmount || 0).toLocaleString('en-IN')}</td>
                <td className="pm-pt-td pm-pt-r">{Number(p.cgstAmount || 0).toLocaleString('en-IN')}</td>
                <td className="pm-pt-td pm-pt-r">{Number(p.sgstAmount || 0).toLocaleString('en-IN')}</td>
                <td className="pm-pt-td pm-pt-r pm-pt-bold">{Number(p.netAmount || 0).toLocaleString('en-IN')}</td>
                <td className="pm-pt-td pm-pt-c">
                  <span className="pm-pt-badge">{p.status || 'SAVED'}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="pm-pt-total">
              <td className="pm-pt-td" colSpan={6}>
                GRAND TOTAL &mdash; {purchases.length} Purchase{purchases.length !== 1 ? 's' : ''}
              </td>
              <td className="pm-pt-td pm-pt-c">
                {purchases.reduce((s, p) => s + (p.purchaseItems?.length ?? 0), 0)}
              </td>
              <td className="pm-pt-td pm-pt-c">
                {purchases.reduce((s, p) => s + (p.totalQty ?? 0), 0)}
              </td>
              <td className="pm-pt-td pm-pt-r">
                {purchases.reduce((s, p) => s + Number(p.grossAmount || 0), 0).toLocaleString('en-IN')}
              </td>
              <td className="pm-pt-td pm-pt-r pm-pt-disc">
                {purchases.reduce((s, p) => s + Number(p.discountAmount || 0), 0).toLocaleString('en-IN')}
              </td>
              <td className="pm-pt-td pm-pt-r">
                {purchases.reduce((s, p) => s + Number(p.cgstAmount || 0), 0).toLocaleString('en-IN')}
              </td>
              <td className="pm-pt-td pm-pt-r">
                {purchases.reduce((s, p) => s + Number(p.sgstAmount || 0), 0).toLocaleString('en-IN')}
              </td>
              <td className="pm-pt-td pm-pt-r">
                {purchases.reduce((s, p) => s + Number(p.netAmount || 0), 0).toLocaleString('en-IN')}
              </td>
              <td className="pm-pt-td" />
            </tr>
          </tfoot>
        </table>

        {/* Footer */}
        <div className="pm-pf-row">
          <span>Generated by Smart STS &nbsp;·&nbsp; {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          <span className="pm-pf-sig">Authorised Signatory</span>
        </div>

      </div>

    </MasterLayout>
  );
}
