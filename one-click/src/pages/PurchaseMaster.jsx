// src/pages/Purchasemaster.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { purchaseAPI, supplierAPI, productAPI } from '../api/axios';
import { readDraft, saveDraft, clearDraft } from '../hooks/useDraft';
import PurchaseLayout from '../components/PurchaseLayout';
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
  productCategory: '',
  discountPercent: '0',
  discountAmount: '0',
  discountAmountsing: '0',
  cgstPercent: '0',
  cgstAmount: '0',
  sgstPercent: '0',
  sgstAmount: '0',
  purchaseRateInclTax: '0',
  profitAmount: '0',
  profitPercent: '0',
  cgstAmountsig: '0',
  sgstAmountsig: '0',
  igstAmountsig: '0',
  igstPercent: '0',
  igstAmount: '0',
  dpAmount: '0',
  salePrice: '0',
  salesGstPercent: '0',
  trackingType: "IMEI",
  trackingNumber: "",
  amount: '0',
});

export default function PurchaseMaster() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(() => { const d = readDraft(DRAFT_KEY); return d?.form ? { ...EMPTY_FORM, ...d.form } : EMPTY_FORM; });
  const [items, setItems] = useState(() => { const d = readDraft(DRAFT_KEY); return d?.items?.length ? d.items : []; });
  const [draftItem, setDraftItem] = useState(() => { const d = readDraft(DRAFT_KEY); return d?.draftItem ? { ...newItem(), ...d.draftItem } : newItem(); });
  const [editingIndex, setEditingIndex] = useState(null);
  const [hasDraft] = useState(() => { const d = readDraft(DRAFT_KEY); return !!(d?.form && Object.values(d.form).some(v => v !== '' && v !== null)); });
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [openId, setOpenId] = useState('');
  const barcodeRef = useRef(null);
  const productRef = useRef(null);
  const imeiRef = useRef(null);
  const itemFormRef = useRef(null);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).replace(/ /g, '/');

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadSuppliers = useCallback(async () => {
    try { const res = await supplierAPI.getAll(); setSuppliers(res.data || []); } catch { }
  }, []);

  const loadProducts = useCallback(async () => {
    try { const res = await productAPI.getAll(); setProducts(res.data || []); } catch { }
  }, []);

  useEffect(() => {
    loadSuppliers();
    loadProducts();
  }, [loadSuppliers, loadProducts]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (hasDraft && !id) showToast('info', 'Draft restored — you have unsaved changes'); }, []);
  useEffect(() => {
    if (!selected) {
      const hasData = Object.keys(EMPTY_FORM).some(k => form[k] !== EMPTY_FORM[k])
        || items.length > 0
        || draftItem.productName || draftItem.purchaseRate;
      hasData ? saveDraft(DRAFT_KEY, { form, items, draftItem }) : clearDraft(DRAFT_KEY);
    }
  }, [form, items, draftItem, selected]); // eslint-disable-line

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // Pure calculator: given an item object and the field that changed, returns
  // a fully recomputed item (amount, discounts, taxes, profit, etc).
  const computeItem = (item, field, value) => {
    const updated = { ...item, [field]: value };

    if (field === "productName") {
      const selectedProduct = products.find(p => p.productName === value);
      if (selectedProduct) {
        updated.hsnCode = selectedProduct.hsnCode || "";
        updated.productCategory = selectedProduct.productCategory || "";
        updated.productId = String(selectedProduct.id);
      } else {
        updated.productId = "";
      }
    }
    const qty = Number(updated.qty) || 0;
    const rate = Number(updated.purchaseRate) || 0;
    const amount = qty * rate;
    updated.amount = String(amount);

    if (field === 'discountPercent') {
      const pct = Number(value) || 0;
      updated.discountAmount = amount > 0 ? String(((amount * pct) / 100).toFixed(2)) : '0';
      updated.discountAmountsing = rate > 0 ? String(((rate * pct) / 100).toFixed(2)) : '0';

    } else if (field === 'discountAmount') {
      const discAmt = Number(value) || 0;
      updated.discountPercent = amount > 0 ? String(((discAmt / amount) * 100).toFixed(2)) : '0';
      updated.discountAmountsing = rate > 0 ? String(((rate * (Number(updated.discountPercent) || 0)) / 100).toFixed(2)) : '0';

    } else if (field === 'discountAmountsing') {
      const discAmtSing = Number(value) || 0;
      updated.discountPercent = rate > 0 ? String(((discAmtSing / rate) * 100).toFixed(2)) : '0';
      updated.discountAmount = amount > 0 ? String(((amount * (Number(updated.discountPercent) || 0)) / 100).toFixed(2)) : '0';

    } else if (field === 'qty' || field === 'purchaseRate') {
      const pct = Number(updated.discountPercent) || 0;
      updated.discountAmount = String(((amount * pct) / 100).toFixed(2));
    }
    const taxable = Math.max(0, amount - (Number(updated.discountAmount) || 0));
    updated.cgstAmount = String(((taxable * (Number(updated.cgstPercent) || 0)) / 100).toFixed(2));
    updated.sgstAmount = String(((taxable * (Number(updated.sgstPercent) || 0)) / 100).toFixed(2));
    updated.igstAmount = String(((taxable * (Number(updated.igstPercent) || 0)) / 100).toFixed(2));

    const singletaxable = Math.max(0, rate - (Number(updated.discountAmountsing) || 0));
    updated.cgstAmountsig = String(((singletaxable * (Number(updated.cgstPercent) || 0)) / 100).toFixed(2));
    updated.sgstAmountsig = String(((singletaxable * (Number(updated.sgstPercent) || 0)) / 100).toFixed(2));
    updated.igstAmountsig = String(((singletaxable * (Number(updated.igstPercent) || 0)) / 100).toFixed(2));

    const purchaseratewithtax =
      (Number(updated.purchaseRate) || 0)
      - (Number(updated.discountAmountsing) || 0)
      + (Number(updated.cgstAmountsig) || 0)
      + (Number(updated.sgstAmountsig) || 0)
      + (Number(updated.igstAmountsig) || 0);

    updated.purchaseRateInclTax = purchaseratewithtax.toFixed(2);
    updated.dpAmount = purchaseratewithtax.toFixed(2);

    const purchaseratewithtaxa = Number(updated.purchaseRateInclTax) || 0;
    const sellingprice = Number(updated.salePrice) || 0;

    updated.profitAmount = (sellingprice - purchaseratewithtaxa).toFixed(2);
    updated.profitPercent = purchaseratewithtaxa > 0
      ? (((sellingprice - purchaseratewithtaxa) / purchaseratewithtaxa) * 100).toFixed(2)
      : "0.00";

    updated.salesGstPercent = (Number(updated.cgstPercent || 0))
      + (Number(updated.sgstPercent || 0))
      + (Number(updated.igstPercent || 0));

    return updated;
  };

  const handleDraftChange = (field, value) => {
    setDraftItem(prev => computeItem(prev, field, value));
  };

  const handleAddItem = () => {
    if (!draftItem.productName.trim()) return showToast('error', 'Enter a product name');
    if (!draftItem.purchaseRate) return showToast('error', 'Enter a purchase rate');

    if (editingIndex !== null) {
      setItems(prev => prev.map((it, i) => (i === editingIndex ? draftItem : it)));
      setEditingIndex(null);
      showToast('success', 'Item updated in list');
    } else {
      setItems(prev => [...prev, draftItem]);
      showToast('success', 'Item added to list');
    }
    setDraftItem(newItem());
    productRef.current?.focus();
  };

  const editItem = (idx) => {
    setDraftItem(items[idx]);
    setEditingIndex(idx);
    itemFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    productRef.current?.focus();
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setDraftItem(newItem());
  };

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
    if (editingIndex === idx) cancelEdit();
  };

  // Derived totals — all auto-computed from items
  const grossAmount = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const totalDiscount = items.reduce((s, it) => s + (Number(it.discountAmount) || 0), 0);
  const totalCgst = items.reduce((s, it) => s + (Number(it.cgstAmount) || 0), 0);
  const totalSgst = items.reduce((s, it) => s + (Number(it.sgstAmount) || 0), 0);
  const totalIgst = items.reduce((s, it) => s + (Number(it.igstAmount) || 0), 0);
  const otherCharges = Number(form.otherCharges) || 0;
  const netAmount = grossAmount - totalDiscount + totalCgst + totalSgst + totalIgst + otherCharges;
  const totalQty = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);

  const handleSelect = (p) => {
    clearDraft(DRAFT_KEY);
    setSelected(p);
    setForm({
      type: p.type || '',
      invoiceNo: p.invoiceNo || '',
      invoiceDate: p.invoiceDate ? p.invoiceDate.split('T')[0] : '',
      receivedDate: p.receivedDate ? p.receivedDate.split('T')[0] : '',
      supplierId: String(p.supplierId || ''),
      otherCharges: String(p.otherCharges || 0),
      remarks: p.remarks || '',
    });
    if (p.purchaseItems?.length) {
      setItems(p.purchaseItems.map(it => {
        const base = {
          ...newItem(),
             company: it.company || 'Single',
          barcode: it.barcode || '',
          productId: String(it.productId || ''),
          productName: it.productName || '',
          hsnCode: it.hsnCode || '',
          productCategory: it.productCategory || '',
          brand: it.brand || '',
          model: it.model || '',
          color: it.colour || '',
          qty: String(it.qty || 1),
          purchaseRate: String(it.purchaseRate || ''),
          discountPercent: String(it.discountPercent || 0),
          discountAmount: String(it.discountAmount || 0),
          cgstPercent: String(it.cgstPercent || 0),
          cgstAmount: String(it.cgstAmount || 0),
          sgstPercent: String(it.sgstPercent || 0),
          sgstAmount: String(it.sgstAmount || 0),
          igstPercent: String(it.igstPercent || 0),
          igstAmount: String(it.igstAmount || 0),
          dpAmount: String(it.dpAmount || 0),
          salePrice: String(it.salePrice || 0),
          salesGstPercent: String(it.salesGstPercent || 0),
          // imeiNo: it.imeis?.[0]?.imeiNo || '',
          trackingType: it.imeis?.[0]?.trackingType || "IMEI",
          trackingNumber: it.imeis?.[0]?.trackingNumber || "",
          amount: String(it.amount || 0),
        };
        // Backend only stores percentages + totals, not our per-unit "sig"
        // fields — rebuild them via the same calculator used during entry.
        return computeItem(base, 'qty', base.qty);
      }));
    } else {
      setItems([]);
    }
    setDraftItem(newItem());
    setEditingIndex(null);
  };

  const handleClear = () => {
    clearDraft(DRAFT_KEY);
    setForm(EMPTY_FORM);
    setItems([]);
    setDraftItem(newItem());
    setEditingIndex(null);
    setSelected(null);
    setOpenId('');
    if (id) navigate('/purchase/entry');
  };

  // Loads a purchase straight from the URL — /purchase/entry/:id
  useEffect(() => {
    if (id) {
      (async () => {
        setLoading(true);
        try {
          const res = await purchaseAPI.getById(Number(id));
          if (res.data) handleSelect(res.data);
        } catch (e) { showToast('error', e.message); }
        finally { setLoading(false); }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCreate = async () => {
    if (!form.invoiceNo.trim()) return showToast('error', 'Invoice No is required');
    if (!form.supplierId) return showToast('error', 'Supplier is required');
    if (items.length === 0) return showToast('error', 'Add at least one item to the list');
    if (items.some(it => !it.productName.trim() || !it.purchaseRate))
      return showToast('error', 'Fill Product Name and Rate for every item');

    setLoading(true);
    try {
      await purchaseAPI.create({
        ...form,
        supplierId: Number(form.supplierId),
        grossAmount,
        discountAmount: totalDiscount,
        cgstAmount: totalCgst,
        sgstAmount: totalSgst,
        igstAmount: totalIgst,
        otherCharges,
        netAmount,
        totalItems: items.length,
        totalQty,
        items: items.map(it => ({
          company: it.company,
          barcode: it.barcode,
          productId: it.productId ? Number(it.productId) : undefined,
          productName: it.productName,
          hsnCode: it.hsnCode,
          brand: it.brand,
          model: it.model,
          colour: it.color,
          qty: Number(it.qty),
          purchaseRate: Number(it.purchaseRate),
          discountPercent: Number(it.discountPercent),
          discountAmount: Number(it.discountAmount),
          cgstPercent: Number(it.cgstPercent),
          cgstAmount: Number(it.cgstAmount),
          sgstPercent: Number(it.sgstPercent),
          sgstAmount: Number(it.sgstAmount),
          igstPercent: Number(it.igstPercent),
          igstAmount: Number(it.igstAmount),
          gstPercent: Number(it.cgstPercent) + Number(it.sgstPercent) + Number(it.igstPercent),
          dpAmount: Number(it.dpAmount),
          salePrice: Number(it.salePrice),
          salesGstPercent: Number(it.salesGstPercent),
          imeis: it.trackingNumber
            ? [{ trackingType: it.trackingType, trackingNumber: it.trackingNumber }]
            : [],
          amount: Number(it.amount),
        })),
      });
      showToast('success', 'Purchase created successfully');
      handleClear();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!selected) return showToast('error', 'Select a purchase to update');
    if (items.length === 0) return showToast('error', 'Add at least one item to the list');
    if (items.some(it => !it.productName.trim() || !it.purchaseRate))
      return showToast('error', 'Fill Product Name and Rate for every item');

    setLoading(true);
    try {
      await purchaseAPI.update(selected.id, {
        ...form,
        supplierId: Number(form.supplierId),
        grossAmount,
        discountAmount: totalDiscount,
        cgstAmount: totalCgst,
        sgstAmount: totalSgst,
        igstAmount: totalIgst,
        otherCharges,
        netAmount,
        totalItems: items.length,
        totalQty,
        items: items.map(it => ({
          company: it.company,
          barcode: it.barcode,
          productId: it.productId ? Number(it.productId) : undefined,
          productName: it.productName,
          hsnCode: it.hsnCode,
          brand: it.brand,
          model: it.model,
          colour: it.color,
          qty: Number(it.qty),
          purchaseRate: Number(it.purchaseRate),
          discountPercent: Number(it.discountPercent),
          discountAmount: Number(it.discountAmount),
          cgstPercent: Number(it.cgstPercent),
          cgstAmount: Number(it.cgstAmount),
          sgstPercent: Number(it.sgstPercent),
          sgstAmount: Number(it.sgstAmount),
          igstPercent: Number(it.igstPercent),
          igstAmount: Number(it.igstAmount),
          gstPercent: Number(it.cgstPercent) + Number(it.sgstPercent) + Number(it.igstPercent),
          dpAmount: Number(it.dpAmount),
          salePrice: Number(it.salePrice),
          salesGstPercent: Number(it.salesGstPercent),
          imeis: it.trackingNumber
            ? [{ trackingType: it.trackingType, trackingNumber: it.trackingNumber }]
            : [],
          amount: Number(it.amount),
        })),
      });
      showToast('success', 'Purchase updated');
      navigate('/purchase/all');
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
      navigate('/purchase/all');
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleOpenById = () => {
    if (!openId.trim()) return showToast('error', 'Enter a Purchase ID');
    navigate(`/purchase/entry/${openId.trim()}`);
  };

  const fmt = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const selectedSupplier = suppliers.find((s) => String(s.id) === String(form.supplierId));
  return (
    <PurchaseLayout>
      {toast && (
        <div className={`ms-toast ms-toast-${toast.type}`}>{toast.msg}</div>
      )}

      <div className="ms-page">

        {/* ── Page Header ───────────────────────── */}
        <div className="ms-page-header">
          <div>
            <h1 className="ms-page-title">Purchase Entry</h1>
            <p className="ms-page-subtitle">
              {selected ? `Editing ${selected.purchaseNo}` : 'Create a new purchase entry'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="pm-search-row">
              <input className="ms-input m-0 pm-id-input"
                placeholder="Pur..Id"
                value={openId}
                onChange={e => setOpenId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleOpenById()} />
              <button className="ms-btn ms-btn-edit" onClick={handleOpenById} disabled={loading}>OPEN</button>
            </div>
            <Link to="/purchase/all" className="ms-btn ms-btn-show">ALL PURCHASES</Link>
            <div className="ms-entry-date-box">
              <span className="ms-entry-label">ENTRY DATE</span>
              <span className="ms-entry-value">{today}</span>
            </div>
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
                <option value="NEW">NEW</option>
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
              <label className="ms-label">GST</label>
              <input className="ms-input" value={selectedSupplier?.gstTin || "----"} readOnly />
            </div>
          </div>
        </div>

        {/* ── Purchase Items (single reusable entry form) ── */}
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
            <div style={{ display: 'flex', gap: 8 }}>
              {editingIndex !== null && (
                <button className="ms-btn ms-btn-clear" onClick={cancelEdit}>CANCEL EDIT</button>
              )}
              <button className="ms-btn ms-btn-add pm-add-item-btn" onClick={handleAddItem}>
                {editingIndex !== null ? '✓ UPDATE ITEM' : '+ ADD ITEM'}
              </button>
            </div>
          </div>

          <div className="pm-items-list" ref={itemFormRef}>
            <div className="pm-item-card">

              {/* Card header */}
              <div className="pm-item-card-header">
                <span className="pm-item-card-title">
                  {editingIndex !== null ? `Editing Item #${editingIndex + 1}` : 'New Item'}
                </span>
                <div className="pm-item-card-amount">
                  Amount: <strong>₹{Number(draftItem.amount).toLocaleString('en-IN')}</strong>
                </div>
              </div>

              {/* Row 1: Company + Barcode */}
              <div className="pm-item-row">
                <div className="pm-item-field pm-field-xs">
                  <label className="pm-item-label">COMPANY</label>
                  <select className="ms-select m-0" value={draftItem.company}
                    onChange={e => handleDraftChange('company', e.target.value)}>
                    <option value="Single">Single</option>
                    <option value="Multiple">Multiple</option>
                  </select>
                </div>
                <div className="pm-item-field pm-field-grow">
                  <label className="pm-item-label">COMPANY BARCODE</label>
                  <div className="pm-scan-wrap">
                    <input className="ms-input m-0"
                      ref={barcodeRef}
                      value={draftItem.barcode}
                      onChange={e => handleDraftChange('barcode', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          console.log("Barcode:", e.target.value);

                          // move curser to product filed
                          productRef.current?.focus();
                        }
                      }}
                      placeholder="Scan or enter barcode..." />

                    <button className="pm-scan-btn" title="Click then scan"
                      onClick={() => {
                        barcodeRef.current?.focus();
                        barcodeRef.current?.select();
                      }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                      </svg>
                      SCAN
                    </button>
                  </div>
                </div>

                <div className="pm-item-field pm-field-grow">
                  <label className="pm-item-label">PRODUCT *</label>
                  <input className="ms-input m-0"
                    ref={productRef}
                    value={draftItem.productName}
                    onChange={e => handleDraftChange('productName', e.target.value)}
                    placeholder="Search or enter product name..."
                    list="pn-draft" />
                  <datalist id="pn-draft">
                    {products.map(p => <option key={p.id} value={p.productName} />)}
                  </datalist>
                </div>

                <div className="pm-item-field pm-field-sm">
                  <label className="pm-item-label">HSN CODE</label>
                  <input className="ms-input m-0"
                    value={draftItem.hsnCode}
                    onChange={e => handleDraftChange('hsnCode', e.target.value)}
                    placeholder="e.g. 8517" />
                </div>

                <div className="pm-item-field pm-field-grow">
                  <label className="pm-item-label">PRODUCT CATEGORY</label>
                  <input className="ms-input m-0"
                    value={draftItem.productCategory}
                    onChange={e => handleDraftChange('productCategory', e.target.value)}
                    placeholder="Product Category"
                  />
                </div>
              </div>


              {/* Row 3: Brand + Model + color + QTY*/}
              <div className="pm-item-row">
                <div className="pm-item-field pm-field-md">
                  <label className="pm-item-label">BRAND</label>
                  <input className="ms-input m-0"
                    value={draftItem.brand}
                    onChange={e => handleDraftChange('brand', e.target.value)}
                    placeholder="Brand..." />
                </div>
                <div className="pm-item-field pm-field-md">
                  <label className="pm-item-label">MODEL</label>
                  <input className="ms-input m-0"
                    value={draftItem.model}
                    onChange={e => handleDraftChange('model', e.target.value)}
                    placeholder="Model / Storage..." />
                </div>
                <div className="pm-item-field pm-field-sm">
                  <label className="pm-item-label">COLOR</label>
                  <input className="ms-input m-0"
                    value={draftItem.color}
                    onChange={e => handleDraftChange('color', e.target.value)}
                    placeholder="Color..." />
                </div>
                <div className="pm-item-field pm-field-xs">
                  <label className="pm-item-label">QTY</label>
                  <input className="ms-input m-0" type="number" min="1"
                    value={draftItem.qty}
                    onChange={e => handleDraftChange('qty', e.target.value)} />
                </div>
              </div>

              {/* Row 4: Qty + Purchase Rate + DIC + CGST + SGST + IGST*/}
              <div className="pm-item-row">

                <div className="pm-item-field pm-field-md">
                  <label className="pm-item-label">PURCHASE RATE (NOT INCL. TAX ₹)</label>
                  <input className="ms-input m-0 pm-rate-input" type="number"
                    value={draftItem.purchaseRate}
                    onChange={e => handleDraftChange('purchaseRate', e.target.value)}
                    placeholder="0.00" />
                </div>
                <div className="pm-item-field pm-field-xs">
                  <label className="pm-item-label">DISC %</label>
                  <input className="ms-input m-0" type="number" min="0" max="100"
                    value={draftItem.discountPercent}
                    onChange={e => handleDraftChange('discountPercent', e.target.value)} />
                </div>
                <div className="pm-item-field pm-field-sm">
                  <label className="pm-item-label">DISC AMOUNT ₹</label>
                  <input className="ms-input m-0" type="number" min="0"
                    value={draftItem.discountAmountsing}
                    onChange={e => handleDraftChange('discountAmountsing', e.target.value)} />
                </div>

                <div className="pm-item-field pm-field-xs">
                  <label className="pm-item-label">CGST %</label>
                  <input className="ms-input m-0" type="number" min="0"
                    value={draftItem.cgstPercent}
                    onChange={e => handleDraftChange('cgstPercent', e.target.value)} />
                </div>
                <div className="pm-item-field pm-field-sm">
                  <label className="pm-item-label">CGST AMOUNT ₹ </label>
                  <input className="ms-input m-0 ms-input-disabled" type="text"
                    value={fmt(draftItem.cgstAmountsig)} readOnly />
                </div>
                <div className="pm-item-field pm-field-xs">
                  <label className="pm-item-label">SGST %</label>
                  <input className="ms-input m-0" type="number" min="0"
                    value={draftItem.sgstPercent}
                    onChange={e => handleDraftChange('sgstPercent', e.target.value)} />
                </div>
                <div className="pm-item-field pm-field-sm">
                  <label className="pm-item-label">SGST AMOUNT ₹ </label>
                  <input className="ms-input m-0 ms-input-disabled" type="text"
                    value={fmt(draftItem.sgstAmountsig)} readOnly />
                </div>
                <div className="pm-item-field pm-field-xs">
                  <label className="pm-item-label">IGST %</label>
                  <input className="ms-input m-0" type="number" min="0"
                    value={draftItem.igstPercent}
                    onChange={e => handleDraftChange('igstPercent', e.target.value)} />
                </div>
                <div className="pm-item-field pm-field-sm">
                  <label className="pm-item-label">IGST AMOUNT ₹</label>
                  <input className="ms-input m-0 ms-input-disabled" type="text"
                    value={fmt(draftItem.igstAmountsig)} readOnly />
                </div>


              </div>

              {/* Row 5: Discount + CGST + SGST */}
              <div className="pm-item-row">
              </div>
              {/* Row 6: PURCHASERATEWITH TAX + DP + Sale Price + Sales GST + saleprfit percent */}
              <div className="pm-item-row">
                <div className="pm-item-field pm-field-md">
                  <label className="pm-item-label">PURCHASE RATE (INCL. TAX ₹)</label>
                  <div className="pm-amount-value pm-val-net">{fmt(draftItem.purchaseRateInclTax)} </div>

                </div>
                <div className="pm-item-field pm-field-md">
                  <label className="pm-item-label">DP AMOUNT ₹</label>
                  <div className="pm-amount-value pm-val-net">{fmt(draftItem.purchaseRateInclTax)} </div>
                </div>
                <div className="pm-item-field pm-field-md">
                  <label className="pm-item-label">SALE PRICE (INCL. TAX ₹)</label>
                  <input className="ms-input m-0 pm-sale-input" type="number"
                    value={draftItem.salePrice}
                    onChange={e => handleDraftChange('salePrice', e.target.value)} />
                </div>
                <div className="pm-item-field pm-field-xs">
                  <label className="pm-item-label">SALES GST %</label>
                  <div className="ms-input m-0">{fmt(draftItem.salesGstPercent) || 0.00}%
                  </div>
                </div>

                <div className="pm-item-field pm-field-sm">
                  <label className="pm-item-label">PROFIT %</label>
                  <div className="ms-input m-0">{fmt(draftItem.profitPercent) || "0.00"}%
                  </div>
                </div>

                <div className="pm-item-field pm-field-md">
                  <label className="pm-item-label">PROFIT AMOUNT ₹</label>
                  <div className="ms-input m-0">{fmt(draftItem.profitAmount) || 0.0}
                  </div>
                </div>

              </div>

              {/* Row 7: IMEI / Serial No */}
              <div className="pm-item-row">
                <div className="pm-item-field pm-field-grow">
                  <label className="pm-item-label">SELECT TYPE</label>
                  <div className="pm-scan-wrap">
                    <select
                      className="ms-select"
                      value={draftItem.trackingType}
                      onChange={(e) => handleDraftChange("trackingType", e.target.value)}
                    >
                      <option value="IMEI">IMEI</option>
                      <option value="SERIAL">SERIAL NUMBER</option>
                      <option value="NONE">NONE</option>
                    </select>

                    <input className="ms-input m-0"
                      ref={imeiRef}
                      value={draftItem.trackingNumber}
                      onChange={e => handleDraftChange('trackingNumber', e.target.value)}
                      placeholder={
                        draftItem.trackingType === "IMEI"
                          ? "Scan or enter IMEI..."
                          : draftItem.trackingType === "SERIAL"
                            ? "Scan or enter Serial Number..."
                            : "No Tracking Required"
                      }
                      disabled={draftItem.trackingType === "NONE"} />

                    <button className="pm-scan-btn" title="Click then Scan"
                      onClick={() => imeiRef.current?.focus()}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                      </svg>
                      SCAN
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* ── Item List (compact summary table) ─── */}
        <div className="ms-table-card mt-16">
          <div className="ms-table-header">
            <span className="ms-table-title">Item List ({items.length})</span>
          </div>
          <div className="ms-table-wrap">
            <table className="ms-table">
              <thead>
                <tr>
                  {['Sr.', 'IMEI / SerialNo', 'Product Name', 'Model', 'Brand', 'Colour', 'Qty',
                    'Purchase Rate', 'Discount (%)', 'Discount (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)',
                    'Sale Price', 'GST %', 'Amount (₹)', 'Action'].map(h => (
                      <th key={h} className="ms-th">{h}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={17} className="ms-empty">No items added</td></tr>
                ) : items.map((item, idx) => (
                  <tr key={idx} className="ms-tr">
                    <td className="ms-td">{idx + 1}</td>
                    <td className="ms-td">
                      {item.trackingType !== 'NONE' && item.trackingNumber
                        ? item.trackingNumber
                        : (item.barcode || '—')}
                    </td>
                    <td className="ms-td">{item.productName || '—'}</td>
                    <td className="ms-td">{item.model || '—'}</td>
                    <td className="ms-td">{item.brand || '—'}</td>
                    <td className="ms-td">{item.color || '—'}</td>
                    <td className="ms-td pm-center">{item.qty || 0}</td>
                    <td className="ms-td pm-amount">{fmt(item.purchaseRate || 0)}</td>
                    <td className="ms-td pm-center">{item.discountPercent || 0}</td>
                    <td className="ms-td pm-amount">{fmt(item.discountAmountsing || 0)}</td>
                    <td className="ms-td pm-amount">{fmt(item.cgstAmountsig || 0)}</td>
                    <td className="ms-td pm-amount">{fmt(item.sgstAmountsig || 0)}</td>
                    <td className="ms-td pm-amount">{fmt(item.igstAmountsig || 0)}</td>
                    <td className="ms-td pm-amount">{fmt(item.salePrice || 0)}</td>
                    <td className="ms-td pm-center">{item.salesGstPercent || 0}%</td>
                    <td className="ms-td pm-amount" style={{ fontWeight: 700 }}>{fmt(item.amount || 0)}</td>
                    <td className="ms-td pm-center">
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          title="Edit item"
                          onClick={() => editItem(idx)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 26, height: 26, padding: 0, borderRadius: 6,
                            border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca',
                            cursor: 'pointer',
                          }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button
                          title="Delete item"
                          disabled={items.length <= 1}
                          onClick={() => removeItem(idx)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 26, height: 26, padding: 0, borderRadius: 6,
                            border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626',
                            cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                            opacity: items.length <= 1 ? 0.5 : 1,
                          }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


        {/* ── Amount Details (auto-computed) ────── */}
        <div className="ms-form- mt-16">
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

        {/* ── Action Bar ────────────────────────── */}
        <div className="ms-action-bar">
          <div className="ms-action-left">
            <button className="ms-btn ms-btn-add" onClick={handleCreate} disabled={loading || !!selected}><span>+</span> CREATE</button>
            <button className="ms-btn ms-btn-delete" onClick={handleDelete} disabled={loading || !selected}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
              DELETE
            </button>
            <button className="ms-btn ms-btn-clear" onClick={handleClear}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              CLEAR
            </button>
          </div>
          <div className="ms-action-right">
            <button className="ms-btn ms-btn-save" onClick={handleSave} disabled={loading || !selected}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
              SAVE
            </button>
            <button className="ms-btn ms-btn-back" onClick={() => navigate('/purchase/all')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
              BACK
            </button>
          </div>
        </div>

      </div>
    </PurchaseLayout>
  );
}
