// src/pages/SalesEntry.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { saleAPI, customerAPI, salesPersonAPI, productAPI } from '../api/axios';
import { readDraft, saveDraft, clearDraft } from '../hooks/useDraft';
import Saleslayout from '../components/Saleslayout';
import '../styles/masterStyles.css';
import './SalesEntry.css';

const EMPTY_FORM = {
  invoiceDate: new Date().toISOString().split('T')[0],
  saleType: 'Retail',
  paymentType: 'Cash',
  taxJurisdiction: 'INTRA', // INTRA = CGST+SGST, INTER = IGST — set once per invoice
  priceList: 'Default',
  customerId: '',
  customerName: 'Walk-in Customer',
  customerMobile: '',
  salesPersonId: '',
  referenceNo: '',
  cashTendered: '',
  changeAmount: '',
  upiNumber: '',
  upiType: '',
  bankName: '',
  chequeNo: '',
  chequeDate: '',
  chequeBankName: '',
  cashCollected: '',
  financeAmt: '',
  financeName: '',
  emiType: '',
  docNo: '',
  orderNo: '',
  dueDate: '',
  transport: '',
  vehicleNo: '',
  lrAwbNo: '',
  ewayBillNo: '',
  deliveryAddress: '',
  notes: '',
};

const DRAFT_KEY = 'sales-entry';

const newItem = () => ({
  productId: '',
  barcode: '',
  itemName: '',
  brand: '',
  model: '',
  color: '',
  hsnCode: '',
  unit: 'Nos',
  qty: '1',
  price: '',
  discountPercent: '0',
  discountAmount: '0',
  applyScheme: false,
  schemeDiscountPercent: '0',
  taxType: 'GST',
  gstPercent: '18',
  cgstPercent: '9',
  cgstAmount: '0',
  sgstPercent: '9',
  sgstAmount: '0',
  igstPercent: '0',
  igstAmount: '0',
  trackingType: 'NONE',
  trackingNumber: '',
  amount: '0',
  purchasePrice: '',
  purchasePriceInclTax: ''
});
// console.log(item.model);


export default function SalesEntry() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(() => { const d = readDraft(DRAFT_KEY); return d?.form ? { ...EMPTY_FORM, ...d.form } : EMPTY_FORM; });
  const [items, setItems] = useState(() => { const d = readDraft(DRAFT_KEY); return d?.items?.length ? d.items : []; });
  const [draftItem, setDraftItem] = useState(() => { const d = readDraft(DRAFT_KEY); return d?.draftItem ? { ...newItem(), ...d.draftItem } : newItem(); });
  const [editingIndex, setEditingIndex] = useState(null);
  const [hasDraft] = useState(() => { const d = readDraft(DRAFT_KEY); return !!(d?.form && Object.values(d.form).some(v => v !== '' && v !== null)); });
  const [customers, setCustomers] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [openId, setOpenId] = useState('');
  const [otherOpen, setOtherOpen] = useState(false);
  const [stockInfo, setStockInfo] = useState(null);
  const [imeiConfirmed, setImeiConfirmed] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const [scanSuggestions, setScanSuggestions] = useState([]);

  const scanRef = useRef(null);
  const itemNameRef = useRef(null);
  const qtyRef = useRef(null);
  const rateRef = useRef(null);
  const discRef = useRef(null);
  const gstRef = useRef(null);
  const imeiRef = useRef(null);
  const openIdRef = useRef(null);
  const customerNameRef = useRef(null);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).replace(/ /g, '/');

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadCustomers = useCallback(async () => {
    try { const res = await customerAPI.getAll();

       setCustomers(res.data || []); } catch { }
  }, []);
  const loadSalesPersons = useCallback(async () => {
    try { const res = await salesPersonAPI.getAll();
      console.log("Sales Persons API res: ",res.data);
       setSalesPersons(res.data || []); } catch { }
  }, []);
  const loadProducts = useCallback(async () => {
    try { const res = await productAPI.getAll(); 
      console.log("product api :",res.data)
      setProducts(res.data || []); } catch { }
  }, []);

  useEffect(() => {
    loadCustomers();
    loadSalesPersons();
    loadProducts();
  }, [loadCustomers, loadSalesPersons, loadProducts]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (hasDraft && !id) showToast('info', 'Draft restored — you have unsaved changes'); }, []);
  useEffect(() => {
    if (!selected) {
      const hasData = Object.keys(EMPTY_FORM).some(k => form[k] !== EMPTY_FORM[k])
        || items.length > 0
        || draftItem.itemName || draftItem.price;
      hasData ? saveDraft(DRAFT_KEY, { form, items, draftItem }) : clearDraft(DRAFT_KEY);
    }
  }, [form, items, draftItem, selected]); // eslint-disable-line

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // Splits a combined GST% into CGST+SGST (intra-state) or IGST
  // (inter-state) based on the invoice-level jurisdiction toggle, so each
  // grid row only needs ONE gst input instead of three.
  const splitGst = (updated, gstPct) => {
    const pct = Number(gstPct) || 0;
    if (form.taxJurisdiction === 'INTER') {
      updated.igstPercent = String(pct);
      updated.cgstPercent = '0';
      updated.sgstPercent = '0';
    } else {
      updated.igstPercent = '0';
      updated.cgstPercent = String(pct / 2);
      updated.sgstPercent = String(pct / 2);
    }
  };

  // Pure calculator — mirrors sale.service.js exactly. `amount` is the
  // tax-inclusive line total (qty × price − discount + GST).
  const computeItem = (item, field, value) => {
    const updated = { ...item, [field]: value };

    if (field === 'productId') {
      const p = products.find(pr => String(pr.id) === String(value));
      if (p) {
        updated.itemName = p.productName || updated.itemName;
        updated.hsnCode = p.hsnCode || updated.hsnCode;
        if (p.gstPercentage) updated.gstPercent = String(p.gstPercentage);
      }
    }
    if (field === 'itemName') {
      const p = products.find(pr => pr.productName === value);
      updated.productId = p ? String(p.id) : updated.productId;
      if (p) {
        updated.hsnCode = p.hsnCode || updated.hsnCode;
        if (p.gstPercentage) updated.gstPercent = String(p.gstPercentage);
      }
    }
    if (field === 'taxType' && value === 'Exempt') {
      updated.gstPercent = '0';
    }

    if (field === 'gstPercent') {
      splitGst(updated, value);
    } else {
      // Keep cgst/sgst/igst in sync with gstPercent + jurisdiction even
      // when a different field changed (qty, price, discount, etc.)
      splitGst(updated, updated.gstPercent);
    }

    const qty = Number(updated.qty) || 0;
    const price = Number(updated.price) || 0;
    const gross = qty * price;

    // "Apply Scheme" is a simplified stand-in — no real promo/rules engine
    // exists yet, so it's just an extra flat discount % that stacks with
    // the regular Disc%, folded into the same discountAmount sent to the
    // backend (no schema change needed for this simplification).
    const schemePct = updated.applyScheme ? (Number(updated.schemeDiscountPercent) || 0) : 0;

    if (field === 'discountPercent') {
      const pct = Number(value) || 0;
      updated.discountAmount = gross > 0 ? String(((gross * (pct + schemePct)) / 100).toFixed(2)) : '0';
    } else if (field === 'discountAmount') {
      updated.discountPercent = gross > 0 ? String((((Number(value) || 0) / gross) * 100).toFixed(2)) : '0';
    } else if (field === 'qty' || field === 'price' || field === 'schemeDiscountPercent' || field === 'applyScheme') {
      const pct = (Number(updated.discountPercent) || 0) + schemePct;
      updated.discountAmount = String(((gross * pct) / 100).toFixed(2));
    }

    const taxable = Math.max(0, gross - (Number(updated.discountAmount) || 0));
    const isExempt = updated.taxType === 'Exempt';
    updated.cgstAmount = isExempt ? '0' : String(((taxable * (Number(updated.cgstPercent) || 0)) / 100).toFixed(2));
    updated.sgstAmount = isExempt ? '0' : String(((taxable * (Number(updated.sgstPercent) || 0)) / 100).toFixed(2));
    updated.igstAmount = isExempt ? '0' : String(((taxable * (Number(updated.igstPercent) || 0)) / 100).toFixed(2));

    updated.amount = (
      taxable + Number(updated.cgstAmount) + Number(updated.sgstAmount) + Number(updated.igstAmount)
    ).toFixed(2);

    return updated;
  };

  const handleDraftChange = (field, value) => {
    setDraftItem(prev => computeItem(prev, field, value));
  };

  // Reverse calculator for the "Amount / Final Rate" cell — type the exact
  // total you want to charge (e.g. a round number like ₹20,000) and this
  // solves backward for the Selling Rate needed to hit that total after
  // discount + GST, then recomputes CGST/SGST/IGST from that rate. Mirrors
  // the "Final Rate" box in the reference software.
  const handleFinalAmountChange = (value) => {
    setDraftItem(prev => {
      const target = Number(value);
      if (value === '' || Number.isNaN(target)) {
        return { ...prev, amount: value };
      }

      const qty = Number(prev.qty) || 1;
      const schemePct = prev.applyScheme ? (Number(prev.schemeDiscountPercent) || 0) : 0;
      const discPct = (Number(prev.discountPercent) || 0) + schemePct;
      const gstPct = prev.taxType === 'Exempt' ? 0 : (Number(prev.gstPercent) || 0);

      const divisor = qty * (1 - discPct / 100) * (1 + gstPct / 100);
      if (divisor <= 0) {
        return { ...prev, amount: value };
      }

      const solvedPrice = target / divisor;
      let updated = computeItem({ ...prev, price: solvedPrice.toFixed(2) }, 'price', solvedPrice.toFixed(2));
      // Force an exact match to what was typed — computeItem's own
      // 2-decimal rounding of discount/GST amounts along the way can
      // otherwise leave Amount a paisa or two off the typed target.
      updated.amount = target.toFixed(2);
      return updated;
    });
  };

  // Flipping Intra/Inter state at the header re-splits GST for every row
  // already in the grid, not just the one currently being typed.
  useEffect(() => {
    setItems(prev => prev.map(it => computeItem(it, 'qty', it.qty)));
    setDraftItem(prev => computeItem(prev, 'qty', prev.qty));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.taxJurisdiction]);

  const fetchStockInfo = async (productId) => {
    if (!productId) { setStockInfo(null); return; }
    try {
      const res = await saleAPI.getStockInfo(productId);
      setStockInfo(res.data);
    } catch {
      setStockInfo(null);
    }
  };

  // Populates the entry row from a resolved match — whether that match
  // came from an exact barcode/IMEI lookup or a product-name search.
  const applyLookupResult = (found, scannedCode) => {
    let updated = { ...newItem(), barcode:found.barcode || '' };
    updated.productId = found.productId ? String(found.productId) : '';
    updated.itemName = found.itemName || '';
    updated.brand = found.brand || '';
    updated.model = found.model || '';
    updated.color = found.colour || '';
    updated.hsnCode = found.hsnCode || '';
    // FIX: `price` is the field every calculation (Amount, CGST, SGST) is
    // built from — it must be the SELLING rate, not the cost. Purchase
    // cost is reference-only and lives in the separate purchasePrice
    // fields below, which never feed into any tax/amount math.
    updated.price = String(found.suggestedPrice || '');
    updated.purchasePrice = String(found.lastPurchaseRate || '');
    updated.purchasePriceInclTax = String(found.lastPurchaseRateInclTax || '');
    updated.gstPercent = String(found.gstPercent || '18');
    if (found.trackingType && found.trackingType !== 'NONE') {
      updated.trackingType = found.trackingType;
      updated.trackingNumber = found.trackingNumber;
      updated.qty = '1';
      setImeiConfirmed(true);
    } else {
      // Barcode/name match found the PRODUCT, but not a specific
      // serialized unit — if this product turns out to need one, the
      // IMEI/Serial cell still needs its own scan + validation.
      setImeiConfirmed(false);
    }
    updated = computeItem(updated, 'qty', updated.qty);
    setDraftItem(updated);
    if (found.productId) fetchStockInfo(found.productId);

    setTimeout(() => {
      if (found.trackingType && found.trackingType !== 'NONE') {
        rateRef.current?.focus();
        rateRef.current?.select();
      } else {
        qtyRef.current?.focus();
        qtyRef.current?.select();
      }
    }, 0);
  };

  // Exact barcode/IMEI lookup against real purchase/stock data. Used by
  // both the omnibox and the grid's IMEI cell — `silent` suppresses the
  // error toast + manual-entry fallback for the omnibox, which instead
  // falls through to a product-name search when this returns false.
  const lookupByCode = async (code, { silent = false } = {}) => {
    const trimmed = code.trim();
    if (!trimmed) return false;
    try {
      const res = await saleAPI.lookup(trimmed);
      console.log("SALE API",res.data);
      applyLookupResult(res.data, trimmed);
      return true;
    } catch (err) {
      if (!silent) {
        showToast('error', err.message || `No item found for "${trimmed}"`);
        setDraftItem({ ...newItem(), barcode: trimmed });
        setStockInfo(null);
        setTimeout(() => itemNameRef.current?.focus(), 0);
      }
      return false;
    }
  };

  // Client-side product-name match, used as the omnibox's fallback when
  // the typed text isn't a recognized barcode/IMEI.
  const applyProductMatch = (p) => {
    applyLookupResult({
      productId: p.id,
      itemName: p.productName,
      hsnCode: p.hsnCode,
      gstPercent: p.gstPercentage,
      trackingType: 'NONE',
    }, '');
  };

  // Live "search as you type" suggestions from the loaded product master.
  useEffect(() => {
    const q = scanValue.trim().toLowerCase();
    if (q.length < 2) { setScanSuggestions([]); return; }
    setScanSuggestions(products.filter(p => p.productName?.toLowerCase().includes(q)).slice(0, 8));
  }, [scanValue, products]);

  // The one omnibox: scan a barcode, scan an IMEI/Serial, or type a
  // product name — whichever resolves first wins.
  const handleScanSubmit = async () => {
    const trimmed = scanValue.trim();
    if (!trimmed) return;

    const matchedByCode = await lookupByCode(trimmed, { silent: true });
    if (matchedByCode) {
      setScanValue('');
      setScanSuggestions([]);
      return;
    }

    if (scanSuggestions.length >= 1) {
      applyProductMatch(scanSuggestions[0]);
      setScanValue('');
      setScanSuggestions([]);
    } else {
      showToast('error', `No item found for "${trimmed}"`);
    }
  };

  const handleAddItem = () => {
    if (!draftItem.itemName.trim()) return showToast('error', 'Enter an item name');
    if (!draftItem.price) return showToast('error', 'Enter a price');
    if (draftItem.trackingType !== 'NONE' && !draftItem.trackingNumber.trim()) {
      return showToast('error', 'Scan or enter the IMEI / Serial No.');
    }
    if (draftItem.trackingType !== 'NONE' && !imeiConfirmed) {
      return showToast('error', 'Press Enter in the IMEI/Serial field to validate it first');
    }
    // Soft client-side stock guard — server still re-validates authoritatively.
    if (draftItem.trackingType === 'NONE' && stockInfo && Number(draftItem.qty) > stockInfo.availableQty) {
      return showToast('error', `Only ${stockInfo.availableQty} in stock`);
    }

    if (editingIndex !== null) {
      setItems(prev => prev.map((it, i) => (i === editingIndex ? draftItem : it)));
      setEditingIndex(null);
      showToast('success', 'Item updated');
    } else {
      setItems(prev => [...prev, draftItem]);
      showToast('success', 'Item added');
    }
    setDraftItem(newItem());
    setStockInfo(null);
    setImeiConfirmed(false);
    scanRef.current?.focus();
  };

  const editItem = (idx) => {
    setDraftItem(items[idx]);
    setEditingIndex(idx);
    if (items[idx].productId) fetchStockInfo(items[idx].productId);
    // This row was already saved once — if it has a tracking number, it
    // was already validated, so don't force a re-scan just to edit qty/price.
    setImeiConfirmed(items[idx].trackingType !== 'NONE' && !!items[idx].trackingNumber);
    itemNameRef.current?.focus();
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setDraftItem(newItem());
    setStockInfo(null);
    setImeiConfirmed(false);
  };

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
    if (editingIndex === idx) cancelEdit();
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Derived totals — mirrors sale.service.js math exactly ──────
  const subTotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const totalDiscount = items.reduce((s, it) => s + (Number(it.discountAmount) || 0), 0);
  const taxableAmount = subTotal - totalDiscount;
  const totalCgst = items.reduce((s, it) => s + (Number(it.cgstAmount) || 0), 0);
  const totalSgst = items.reduce((s, it) => s + (Number(it.sgstAmount) || 0), 0);
  const totalIgst = items.reduce((s, it) => s + (Number(it.igstAmount) || 0), 0);
  const netBeforeRound = taxableAmount + totalCgst + totalSgst + totalIgst;
  const grandTotal = Math.round(netBeforeRound);
  const roundOff = Number((grandTotal - netBeforeRound).toFixed(2));
  const totalQty = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);

  // Live margin preview for whatever's in the entry row right now.
  const marginAmount = stockInfo ? (Number(draftItem.price) || 0) - (stockInfo.lastPurchaseRate || 0) : null;
  const marginPercent = stockInfo && stockInfo.lastPurchaseRate > 0
    ? ((marginAmount / stockInfo.lastPurchaseRate) * 100).toFixed(1)
    : null;

  const handleSelect = (s) => {
    clearDraft(DRAFT_KEY);
    setSelected(s);
    setForm({
      invoiceDate: s.invoiceDate ? s.invoiceDate.split('T')[0] : '',
      saleType: s.saleType || 'Retail',
      paymentType: s.paymentType || 'Cash',
      taxJurisdiction: s.saleItems?.some(it => Number(it.igstPercent) > 0) ? 'INTER' : 'INTRA',
      priceList: s.priceList || 'Default',
      customerId: String(s.customerId || ''),
      customerName: s.customerName || 'Walk-in Customer',
      customerMobile: s.customerMobile || '',
      salesPersonId: String(s.salesPersonId || ''),
      referenceNo: s.referenceNo || '',
      cashTendered: s.cashTendered ?? '',
      changeAmount: s.changeAmount ?? '',
      upiNumber: s.upiNumber || '',
      upiType: s.upiType || '',
      bankName: s.bankName || '',
      chequeNo: s.chequeNo || '',
      chequeDate: s.chequeDate ? s.chequeDate.split('T')[0] : '',
      chequeBankName: s.chequeBankName || '',
      cashCollected: s.cashCollected ?? '',
      financeAmt: s.financeAmt ?? '',
      financeName: s.financeName || '',
      emiType: s.emiType || '',
      docNo: s.docNo || '',
      orderNo: s.orderNo || '',
      dueDate: s.dueDate ? s.dueDate.split('T')[0] : '',
      transport: s.transport || '',
      vehicleNo: s.vehicleNo || '',
      lrAwbNo: s.lrAwbNo || '',
      ewayBillNo: s.ewayBillNo || '',
      deliveryAddress: s.deliveryAddress || '',
      notes: s.notes || '',
    });
    if (s.saleItems?.length) {
      setItems(s.saleItems.map(it => ({
        ...newItem(),
        productId: String(it.productId || ''),
        barcode: it.barcode || '',
        itemName: it.itemName || '',
        brand: it.brand || '',
        model: it.model || '',
        color: it.colour || '',
        purchasePrice: it.purchasePrice ?? '',
        purchasePriceInclTax: it.purchasePriceInclTax ?? '',
        hsnCode: it.hsnCode || '',
        unit: it.unit || 'Nos',
        qty: String(it.qty || 1),
        price: String(it.price || ''),
        discountPercent: String(it.discountPercent || 0),
        discountAmount: String(it.discountAmount || 0),
        taxType: it.taxType || 'GST',
        gstPercent: String((Number(it.cgstPercent) || 0) + (Number(it.sgstPercent) || 0) + (Number(it.igstPercent) || 0)),
        cgstPercent: String(it.cgstPercent || 0),
        cgstAmount: String(it.cgstAmount || 0),
        sgstPercent: String(it.sgstPercent || 0),
        sgstAmount: String(it.sgstAmount || 0),
        igstPercent: String(it.igstPercent || 0),
        igstAmount: String(it.igstAmount || 0),
        trackingType: it.imeis?.[0]?.trackingType || 'NONE',
        trackingNumber: it.imeis?.[0]?.trackingNumber || '',
        amount: String(it.amount || 0),
      })));
    } else {
      setItems([]);
    }
    setDraftItem(newItem());
    setEditingIndex(null);
    setStockInfo(null);
    setImeiConfirmed(false);
  };

  const handleClear = () => {
    clearDraft(DRAFT_KEY);
    setForm(EMPTY_FORM);
    setItems([]);
    setDraftItem(newItem());
    setEditingIndex(null);
    setStockInfo(null);
    setImeiConfirmed(false);
    setSelected(null);
    setOpenId('');
    if (id) navigate('/sales/entry');
  };

  useEffect(() => {
    if (id) {
      (async () => {
        setLoading(true);
        try {
          const res = await saleAPI.getById(Number(id));
          if (res.data) handleSelect(res.data);
        } catch (e) { showToast('error', e.message); }
        finally { setLoading(false); }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const buildPayload = () => ({
    ...form,
    customerId: form.customerId ? Number(form.customerId) : undefined,
    salesPersonId: form.salesPersonId ? Number(form.salesPersonId) : undefined,
    dueDate: form.dueDate || undefined,
    chequeDate: form.chequeDate || undefined,
    totalQty,
    subTotal,
    discountAmount: totalDiscount,
    taxableAmount,
    cgstAmount: totalCgst,
    sgstAmount: totalSgst,
    igstAmount: totalIgst,
    roundOff,
    grandTotal,
    items: items.map(it => ({
      productId: it.productId ? Number(it.productId) : undefined,
      barcode: it.barcode,
      itemName: it.itemName,
      brand: it.brand,
      model: it.model,
      colour: it.color,
      purchasePrice: it.purchasePrice || null,
      purchasePriceInclTax: it.purchasePriceInclTax || null,
      hsnCode: it.hsnCode,
      unit: it.unit,
      qty: Number(it.qty),
      price: Number(it.price),
      discountPercent: Number(it.discountPercent),
      discountAmount: Number(it.discountAmount),
      taxType: it.taxType,
      cgstPercent: Number(it.cgstPercent),
      cgstAmount: Number(it.cgstAmount),
      sgstPercent: Number(it.sgstPercent),
      sgstAmount: Number(it.sgstAmount),
      igstPercent: Number(it.igstPercent),
      igstAmount: Number(it.igstAmount),
      amount: Number(it.amount),
      imeis: it.trackingType !== 'NONE' && it.trackingNumber
        ? [{ trackingType: it.trackingType, trackingNumber: it.trackingNumber }]
        : [],
    })),
  });

  const handleCreate = async (status = 'SAVED') => {
    if (!form.customerName.trim()) return showToast('error', 'Customer name is required');
    if (items.length === 0) return showToast('error', 'Add at least one item to the list');
    if (items.some(it => !it.itemName.trim() || !it.price))
      return showToast('error', 'Fill Item Name and Price for every item');

    setLoading(true);
    try {
      await saleAPI.create({ ...buildPayload(), status });
      showToast('success', status === 'HOLD' ? 'Sale saved as draft' : 'Sale created successfully');
      handleClear();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!selected) return showToast('error', 'Select a sale to update');
    if (items.length === 0) return showToast('error', 'Add at least one item to the list');
    if (items.some(it => !it.itemName.trim() || !it.price))
      return showToast('error', 'Fill Item Name and Price for every item');

    setLoading(true);
    try {
      await saleAPI.update(selected.id, buildPayload());
      showToast('success', 'Sale updated');
      navigate('/sales/all');
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selected) return showToast('error', 'Select a sale to delete');
    if (!window.confirm(`Delete invoice "${selected.invoiceNo}"? This releases any sold IMEIs/stock back to available.`)) return;
    setLoading(true);
    try {
      await saleAPI.delete(selected.id);
      showToast('success', 'Sale deleted');
      navigate('/sales/all');
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleOpenById = () => {
    if (!openId.trim()) return showToast('error', 'Enter a Sale ID');
    navigate(`/sales/entry/${openId.trim()}`);
  };

  // ── Keyboard shortcuts: F2 Save, F3 New, F4 Scan, F5 Party Search,
  // F8 Delete Item, F9 Print, F12 Configure ──────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        selected ? handleSave() : handleCreate('SAVED');
      } else if (e.key === 'F3') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'F4') {
        e.preventDefault();
        scanRef.current?.focus();
        scanRef.current?.select();
      } else if (e.key === 'F5') {
        e.preventDefault();
        customerNameRef.current?.focus();
        customerNameRef.current?.select();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (editingIndex !== null) {
          removeItem(editingIndex);
          showToast('info', 'Item removed');
        } else if (items.length > 0) {
          const last = items[items.length - 1];
          removeItem(items.length - 1);
          showToast('info', `Removed "${last.itemName}"`);
        } else {
          showToast('error', 'No item to delete');
        }
      } else if (e.key === 'F9') {
        e.preventDefault();
        window.print();
      } else if (e.key === 'F12') {
        e.preventDefault();
        showToast('info', 'Settings / Configure page not built yet');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, items, form, draftItem, editingIndex]);


  return (
    <Saleslayout>
      {toast && (
        <div className={`ms-toast ms-toast-${toast.type}`}>{toast.msg}</div>
      )}

      <div className="ms-page">

        {/* ── Page Header ───────────────────────── */}
        <div className="ms-page-header">
          <div>
            <h1 className="ms-page-title">Sales Entry</h1>
            <p className="se-page-subtitle">
              {selected ? `Editing ${selected.invoiceNo}` : 'Create a new sales invoice'}
              <span className="se-shortcut-hint">F2 Save · F3 New · F4 Scan · F5 Party · F8 Del Item · F9 Print · F12 Config</span>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="se-search-row">
              <input className="ms-input m-0 se-id-input"
                ref={openIdRef}
                placeholder="Open Sale by ID…"
                value={openId}
                onChange={e => setOpenId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleOpenById()} />
              <button className="ms-btn ms-btn-edit" onClick={handleOpenById} disabled={loading}>OPEN</button>
            </div>
            <Link to="/sales/all" className="ms-btn ms-btn-show">ALL SALES</Link>
          </div>
        </div>

        {/* ── Main layout: left content + sticky right totals ──── */}
        <div className="se-layout">
          <div className="se-layout-main">

            {/* ── Compact Invoice Header ─────────── */}
            <div className="ms-form-card se-header-compact">
              <div className="se-header-grid">
                <div className="se-hfield se-hfield-xs">
                  <label className="se-hlabel">INVOICE NO</label>
                  <input className="ms-input ms-input-disabled" value={selected ? selected.invoiceNo : 'AUTO'} readOnly />
                </div>
                <div className="se-hfield se-hfield-xm">
                  <label className="se-hlabel">DATE *</label>
                  <input className="ms-input" name="invoiceDate" type="date" value={form.invoiceDate} onChange={handleChange} />
                </div>
                <div className="se-hfield se-hfield-xs">
                  <label className="se-hlabel">TODAY</label>
                  <input className="ms-input ms-input-disabled" value={today} readOnly />
                </div>
                <div className="se-hfield se-hfield-sm">
                  <label className="se-hlabel">SALE TYPE</label>
                  <select className="ms-select" name="saleType" value={form.saleType} onChange={handleChange}>
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                  </select>
                </div>
                <div className="se-hfield se-hfield-sm">
                  <label className="se-hlabel">PRICE LIST</label>
                  <select className="ms-select" name="priceList" value={form.priceList} onChange={handleChange}>
                    <option value="Default">Default Price List</option>
                    {/* <option value="Wholesale">Wholesale Price List</option> */}
                    {/* <option value="MRP">MRP</option> */}
                  </select>
                </div>
                <div className="se-hfield se-hfield-sm">
                  <label className="se-hlabel">TAX</label>
                  <select className="ms-select" name="taxJurisdiction" value={form.taxJurisdiction} onChange={handleChange}>
                    <option value="INTRA">Intra (CGST+SGST)</option>
                    <option value="INTER">Inter (IGST)</option>
                  </select>
                </div>
                <div className="se-hfield se-hfield-sm">
                  <label className="se-hlabel">PAYMENT</label>
                  <select className="ms-select" name="paymentType" value={form.paymentType} onChange={handleChange}>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>

                <div className="se-hfield se-hfield-grow">
                  <label className="se-hlabel">CUSTOMER *</label>
                  <input className="ms-input" name="customerName" value={form.customerName}
                    ref={customerNameRef}
                    onChange={handleChange} placeholder="Walk-in Customer" list="cust-dl" />
                  <datalist id="cust-dl">
                    {customers.map(c => <option key={c.id} value={c.customerName} />)}
                  </datalist>
                </div>
                <div className="se-hfield se-hfield-sm">
                  <label className="se-hlabel">MOBILE</label>
                  <input className="ms-input" name="customerMobile" value={form.customerMobile}
                    onChange={handleChange} placeholder="98765 43210" />
                </div>
                <div className="se-hfield se-hfield-sm">
                  <label className="se-hlabel">REF NO</label>
                  <input className="ms-input" name="referenceNo" value={form.referenceNo} onChange={handleChange} />
                </div>
                <div className="se-hfield se-hfield-sm">
                  <label className="se-hlabel">SALES PERSON</label>
                  <select className="ms-select" name="salesPersonId" value={form.salesPersonId} onChange={handleChange}>
                    <option value="">Select</option>
                    {salesPersons.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Payment-mode detail fields — compact single row, only
                  the block matching the selected mode renders */}
              {form.paymentType === 'Cash' && (
                <div className="se-header-grid se-header-grid-sub">
                  <div className="se-hfield se-hfield-sm">
                    <label className="se-hlabel">CASH TENDERED</label>
                    <input className="ms-input" name="cashTendered" type="number" value={form.cashTendered} onChange={handleChange} />
                  </div>
                  <div className="se-hfield se-hfield-sm">
                    <label className="se-hlabel">CHANGE</label>
                    <input className="ms-input" name="changeAmount" type="number" value={form.changeAmount} onChange={handleChange} />
                  </div>
                </div>
              )}
              {form.paymentType === 'UPI' && (
                <div className="se-header-grid se-header-grid-sub">
                  <div className="se-hfield se-hfield-sm">
                    <label className="se-hlabel">UPI NUMBER</label>
                    <input className="ms-input" name="upiNumber" value={form.upiNumber} onChange={handleChange} />
                  </div>
                  <div className="se-hfield se-hfield-sm">
                    <label className="se-hlabel">UPI TYPE</label>
                    <select className="ms-select" name="upiType" value={form.upiType} onChange={handleChange}>
                      <option value="">Select</option>
                      <option value="GPAY">GPay</option>
                      <option value="PhonePe">PhonePe</option>
                      <option value="Paytm">Paytm</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="se-hfield se-hfield-sm">
                    <label className="se-hlabel">BANK NAME</label>
                    <input className="ms-input" name="bankName" value={form.bankName} onChange={handleChange} />
                  </div>
                </div>
              )}
              {form.paymentType === 'Cheque' && (
                <div className="se-header-grid se-header-grid-sub">
                  <div className="se-hfield se-hfield-sm">
                    <label className="se-hlabel">CHEQUE NO</label>
                    <input className="ms-input" name="chequeNo" value={form.chequeNo} onChange={handleChange} />
                  </div>
                  <div className="se-hfield se-hfield-sm">
                    <label className="se-hlabel">CHEQUE DATE</label>
                    <input className="ms-input" name="chequeDate" type="date" value={form.chequeDate} onChange={handleChange} />
                  </div>
                  <div className="se-hfield se-hfield-sm">
                    <label className="se-hlabel">CHEQUE BANK</label>
                    <input className="ms-input" name="chequeBankName" value={form.chequeBankName} onChange={handleChange} />
                  </div>
                </div>
              )}
              {form.paymentType === 'Finance' && (
                <div className="se-header-grid se-header-grid-sub">
                  <div className="se-hfield se-hfield-sm">
                    <label className="se-hlabel">CASH COLLECTED</label>
                    <input className="ms-input" name="cashCollected" type="number" value={form.cashCollected} onChange={handleChange} />
                  </div>
                  <div className="se-hfield se-hfield-sm">
                    <label className="se-hlabel">FINANCE AMT</label>
                    <input className="ms-input" name="financeAmt" type="number" value={form.financeAmt} onChange={handleChange} />
                  </div>
                  <div className="se-hfield se-hfield-sm">
                    <label className="se-hlabel">FINANCE NAME</label>
                    <input className="ms-input" name="financeName" value={form.financeName} onChange={handleChange} />
                  </div>
                  <div className="se-hfield se-hfield-xs">
                    <label className="se-hlabel">EMI TYPE</label>
                    <input className="ms-input" name="emiType" value={form.emiType} onChange={handleChange} />
                  </div>
                  <div className="se-hfield se-hfield-sm">
                    <label className="se-hlabel">DOC NO</label>
                    <input className="ms-input" name="docNo" value={form.docNo} onChange={handleChange} />
                  </div>
                </div>
              )}
            </div>

            {/* ── Unified editable invoice grid ─────── */}
            <div className="ms-table-card mt-16">
              <div className="ms-table-header">
                <span className="ms-table-title">
                  Invoice Items
                  <span className="se-items-meta">
                    {items.length} item{items.length !== 1 ? 's' : ''} &nbsp;·&nbsp; Qty: {totalQty}
                  </span>
                </span>
                {editingIndex !== null && (
                  <button className="ms-btn ms-btn-clear" onClick={cancelEdit}>CANCEL EDIT</button>
                )}
              </div>

              <div className="se-scan-bar-wrap">
                <div className="se-scan-bar">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input
                    ref={scanRef}
                    className="se-scan-input"
                    value={scanValue}
                    onChange={e => setScanValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleScanSubmit(); }
                      if (e.key === 'Escape') { setScanValue(''); setScanSuggestions([]); }
                    }}
                    placeholder="Scan Barcode / IMEI or Search Item Name (F4)" />
                </div>
                {scanSuggestions.length > 0 && (
                  <div className="se-scan-suggestions">
                    {scanSuggestions.map(p => (
                      <div key={p.id} className="se-scan-suggestion-row"
                        onClick={() => { applyProductMatch(p); setScanValue(''); setScanSuggestions([]); }}>
                        <span className="se-scan-sugg-name">{p.productName}</span>
                        {p.hsnCode && <span className="se-scan-sugg-meta">HSN {p.hsnCode}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="ms-table-wrap">
                <table className="ms-table se-grid">
                  <thead>
                    <tr>
                      {['Sr.', 'Barcode', 'Product Name', 'Model', 'Qty', 'Purchase Price (₹)', 'Selling Rate (₹)', 'Amount / Final Rate (₹)', 'Disc %', 'GST %', 'IMEI / Serial', 'Action'].map(h => (
                        <th key={h} className="ms-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="ms-tr se-grid-row-saved">
                        <td className="ms-td">{idx + 1}</td>
                        <td className="ms-td">{item.barcode || '—'}</td>
                        <td className="ms-td">
                          {item.itemName}
                          {item.brand && <span className="se-grid-sub"> — {item.brand}</span>}
                          {item.color && <span className="se-grid-sub"> · {item.color}</span>}
                        </td>
                        <td className="ms-td">{item.model || '—'}</td>
                        <td className="ms-td se-center">{item.qty}</td>
                        <td className="ms-td se-amount">
                          {fmt(item.purchasePrice)}
                          {item.purchasePriceInclTax > 0 && (
                            <div className="se-grid-sub">incl. tax {fmt(item.purchasePriceInclTax)}</div>
                          )}
                        </td>
                        <td className="ms-td se-amount">{fmt(item.price)}</td>
                        <td className="ms-td se-amount" style={{ fontWeight: 700 }}>{fmt(item.amount)}</td>
                        <td className="ms-td se-center">
                          {item.discountPercent}
                          {item.applyScheme && <div className="se-grid-sub">+{item.schemeDiscountPercent} scheme</div>}
                        </td>
                        <td className="ms-td se-center">
                          {(Number(item.cgstPercent) + Number(item.sgstPercent) + Number(item.igstPercent)) || 0}
                          <div className="se-grid-sub">
                            {Number(item.igstPercent) > 0
                              ? `IGST ${item.igstPercent}`
                              : `C${item.cgstPercent} + S${item.sgstPercent}`}
                          </div>
                        </td>
                        <td className="ms-td">
                          {item.trackingType !== 'NONE' && item.trackingNumber ? item.trackingNumber : '—'}
                        </td>
                        <td className="ms-td se-center">
                          <div className="se-row-actions">
                            <button title="Edit" onClick={() => editItem(idx)} className="se-icon-btn se-icon-edit">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            </button>
                            <button title="Delete" onClick={() => removeItem(idx)} className="se-icon-btn se-icon-delete">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* ── Entry row — always the last row, spreadsheet-style ── */}
                    <tr className="se-grid-row-entry">
                      <td className="ms-td se-center">{editingIndex !== null ? `#${editingIndex + 1}` : '+'}</td>
                      <td className="ms-td se-cell-readonly">{draftItem.barcode || '—'}</td>
                      <td className="ms-td">
                        <input className="ms-input m-0 se-cell-input"
                          ref={itemNameRef}
                          value={draftItem.itemName}
                          onChange={e => handleDraftChange('itemName', e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); qtyRef.current?.focus(); qtyRef.current?.select(); } }}
                          placeholder="Manual item name (fallback)…" list="item-dl" />
                        <datalist id="item-dl">
                          {products.map(p => <option key={p.id} value={p.productName} />)}
                        </datalist>
                      </td>
                      <td className="ms-td">
                        <input className="ms-input m-0 se-cell-input"
                          value={draftItem.model}
                          onChange={e => handleDraftChange('model', e.target.value)}
                          placeholder="Model" />
                      </td>
                      <td className="ms-td">
                        <input className="ms-input m-0 se-cell-input se-cell-center" type="number" min="1"
                          ref={qtyRef}
                          value={draftItem.qty}
                          disabled={draftItem.trackingType !== 'NONE'}
                          onChange={e => handleDraftChange('qty', e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); rateRef.current?.focus(); rateRef.current?.select(); } }} />
                      </td>

                      {/* Purchase Price — reference only, auto-filled from the
                          last purchase record. Never feeds into Amount/GST. */}
                      <td className="ms-td se-cell-readonly">
                        {draftItem.purchasePrice ? fmt(draftItem.purchasePrice) : '—'}
                        {draftItem.purchasePriceInclTax > 0 && (
                          <div className="se-grid-sub">incl. tax {fmt(draftItem.purchasePriceInclTax)}</div>
                        )}
                      </td>

                      {/* Selling Rate — the REAL price field. This is what
                          Amount, CGST, SGST are actually calculated from. */}
                      <td className="ms-td">
                        <input className="ms-input m-0 se-cell-input se-cell-right"
                          type="number"
                          ref={rateRef}
                          value={draftItem.price}
                          onChange={e => handleDraftChange('price', e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); discRef.current?.focus(); discRef.current?.select(); } }} />
                      </td>

                      {/* Amount / Final Rate — type the total you want to
                          charge and Selling Rate + CGST + SGST all
                          back-solve to match it exactly. */}
                      <td className="ms-td">
                        <input className="ms-input m-0 se-cell-input se-cell-right se-final-rate-input"
                          type="number"
                          value={draftItem.amount}
                          onChange={e => handleFinalAmountChange(e.target.value)}
                          title="Type the final price — Selling Rate and GST will adjust automatically" />
                      </td>
                      <td className="ms-td">
                        <input className="ms-input m-0 se-cell-input se-cell-center" type="number" min="0" max="100"
                          ref={discRef}
                          value={draftItem.discountPercent}
                          onChange={e => handleDraftChange('discountPercent', e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); gstRef.current?.focus(); gstRef.current?.select(); } }} />
                        <label className="se-scheme-toggle">
                          <input type="checkbox"
                            checked={draftItem.applyScheme}
                            onChange={e => handleDraftChange('applyScheme', e.target.checked)} />
                          Scheme
                          {draftItem.applyScheme && (
                            <input className="se-scheme-pct" type="number" min="0" max="100"
                              value={draftItem.schemeDiscountPercent}
                              onChange={e => handleDraftChange('schemeDiscountPercent', e.target.value)}
                              onClick={e => e.stopPropagation()} />
                          )}
                        </label>
                      </td>
                      <td className="ms-td">
                        <input className="ms-input m-0 se-cell-input se-cell-center" type="number" min="0"
                          ref={gstRef}
                          value={draftItem.gstPercent}
                          disabled={draftItem.taxType === 'Exempt'}
                          onChange={e => handleDraftChange('gstPercent', e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (draftItem.trackingType !== 'NONE') { imeiRef.current?.focus(); }
                              else { handleAddItem(); }
                            }
                          }} />
                        <div className="se-grid-sub">
                          {Number(draftItem.igstPercent) > 0
                            ? `IGST ${draftItem.igstPercent}`
                            : `C${draftItem.cgstPercent} + S${draftItem.sgstPercent}`}
                        </div>
                      </td>
                      <td className="ms-td">
                        <div className="se-scan-wrap">
                          <select className="ms-select m-0" value={draftItem.trackingType}
                            onChange={e => handleDraftChange('trackingType', e.target.value)}>
                            <option value="NONE">NONE</option>
                            <option value="IMEI">IMEI</option>
                            <option value="SERIAL">SERIAL</option>
                          </select>
                          <input className="ms-input m-0 se-cell-input"
                            ref={imeiRef}
                            value={draftItem.trackingNumber}
                            onChange={e => {
                              const val = e.target.value;
                              setImeiConfirmed(false);
                              if (val && draftItem.trackingType === 'NONE') {
                                // Typing here implies this item needs serial
                                // tracking after all — auto-switch off NONE
                                // instead of silently ignoring the keystroke.
                                setDraftItem(prev => computeItem({ ...prev, trackingType: 'IMEI' }, 'trackingNumber', val));
                              } else {
                                handleDraftChange('trackingNumber', val);
                              }
                            }}
                            onKeyDown={async e => {
                              if (e.key !== 'Enter') return;
                              e.preventDefault();
                              e.stopPropagation();
                              const val = e.target.value.trim();
                              if (draftItem.trackingType === 'NONE' || !val) return;

                              if (imeiConfirmed) {
                                // Already validated this exact unit — commit the row.
                                handleAddItem();
                              } else {
                                // Not yet validated (freshly typed/edited) —
                                // confirm it's a real, available unit before
                                // allowing the row to be added.
                                const ok = await lookupByCode(val);
                                if (ok) setImeiConfirmed(true);
                              }
                            }}
                            placeholder={draftItem.trackingType === 'NONE' ? 'Scan to auto-detect…' : 'Scan or enter…'}
                            list="imei-dl" />
                          <datalist id="imei-dl">
                            {(stockInfo?.availableImeis || []).map(i => (
                              <option key={i.trackingNumber} value={i.trackingNumber} />
                            ))}
                          </datalist>
                        </div>
                      </td>
                      <td className="ms-td se-center">
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button className="se-add-row-btn" onClick={handleAddItem} title="Add item (Enter)">
                            {editingIndex !== null ? '✓' : '+'}
                          </button>
                          <button className="se-cancel-row-btn" onClick={cancelEdit}
                            title="Clear this row — discard without adding to the list">
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ── Live stock / margin / IMEI strip ── */}
                    {stockInfo && (
                      <tr className="se-stock-strip">
                        <td colSpan={12}>
                          <span className="se-stock-chip">
                            📦 In Stock: <strong>{stockInfo.availableQty}</strong>
                          </span>
                          <span className="se-stock-chip">
                            Last Cost: <strong>₹{fmt(stockInfo.lastPurchaseRate)}</strong>
                          </span>
                          {marginAmount !== null && (
                            <span className={`se-stock-chip ${marginAmount < 0 ? 'se-stock-chip-warn' : ''}`}>
                              Margin: <strong>₹{fmt(marginAmount)} ({marginPercent}%)</strong>
                            </span>
                          )}
                          {stockInfo.availableImeis.length > 0 && (
                            <span className="se-stock-chip">
                              Available IMEIs: <strong>{stockInfo.availableImeis.length}</strong>
                            </span>
                          )}
                          {draftItem.trackingType === 'NONE' && stockInfo.availableQty <= 0 && (
                            <span className="se-stock-chip se-stock-chip-warn">⚠ Out of stock</span>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Other Details (collapsible) ───────── */}
            <div className="ms-form-card mt-16">
              <button className="se-collapse-toggle" onClick={() => setOtherOpen(o => !o)}>
                <span className="pm-section-label" style={{ margin: 0 }}>OTHER DETAILS (OPTIONAL)</span>
                <span>{otherOpen ? '▲' : '▼'}</span>
              </button>
              {otherOpen && (
                <div style={{ marginTop: 14 }}>
                  <div className="ms-row">
                    <div className="ms-field">
                      <label className="ms-label">ORDER NO</label>
                      <input className="ms-input" name="orderNo" value={form.orderNo} onChange={handleChange} />
                    </div>
                    <div className="ms-field">
                      <label className="ms-label">DUE DATE</label>
                      <input className="ms-input" name="dueDate" type="date" value={form.dueDate} onChange={handleChange} />
                    </div>
                    <div className="ms-field">
                      <label className="ms-label">TRANSPORT</label>
                      <input className="ms-input" name="transport" value={form.transport} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="ms-row">
                    <div className="ms-field">
                      <label className="ms-label">VEHICLE NO</label>
                      <input className="ms-input" name="vehicleNo" value={form.vehicleNo} onChange={handleChange} placeholder="e.g. MH12AB1234" />
                    </div>
                    <div className="ms-field">
                      <label className="ms-label">LR / AWB NO</label>
                      <input className="ms-input" name="lrAwbNo" value={form.lrAwbNo} onChange={handleChange} />
                    </div>
                    <div className="ms-field">
                      <label className="ms-label">E-WAY BILL NO</label>
                      <input className="ms-input" name="ewayBillNo" value={form.ewayBillNo} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="ms-row">
                    <div className="ms-field flex-2">
                      <label className="ms-label">DELIVERY ADDRESS</label>
                      <textarea className="ms-input" name="deliveryAddress" value={form.deliveryAddress} onChange={handleChange} rows={2} />
                    </div>
                    <div className="ms-field flex-2">
                      <label className="ms-label">NOTES</label>
                      <textarea className="ms-input" name="notes" value={form.notes} onChange={handleChange} rows={2} maxLength={200} />
                      <div className="se-char-count">{form.notes.length}/200</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Bottom action bar (secondary actions) ── */}
            <div className="ms-action-bar">
              <div className="ms-action-left">
                <button className="ms-btn ms-btn-delete" onClick={handleDelete} disabled={loading || !selected}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                  DELETE
                </button>
                <button className="ms-btn ms-btn-clear" onClick={handleClear}>CLEAR</button>
              </div>
              <div className="ms-action-right">
                <button className="ms-btn ms-btn-back" onClick={() => navigate('/sales/all')}>BACK</button>
              </div>
            </div>

          </div>

          {/* ── Sticky totals + primary actions panel ─────── */}
          <div className="se-summary-sidebar">
            <div className="se-summary-box">
              <div className="se-summary-row"><span>Total Items</span><span>{items.length}</span></div>
              <div className="se-summary-row"><span>Total Qty</span><span>{totalQty}</span></div>
              <div className="se-summary-row"><span>Sub Total</span><span>₹{fmt(subTotal)}</span></div>
              <div className="se-summary-row se-discount"><span>Discount</span><span>(-) ₹{fmt(totalDiscount)}</span></div>
              <div className="se-summary-rule" />
              <div className="se-summary-row"><span>Taxable Amount</span><span>₹{fmt(taxableAmount)}</span></div>
              <div className="se-summary-row"><span>CGST</span><span>₹{fmt(totalCgst)}</span></div>
              <div className="se-summary-row"><span>SGST</span><span>₹{fmt(totalSgst)}</span></div>
              <div className="se-summary-row"><span>IGST</span><span>₹{fmt(totalIgst)}</span></div>
              <div className="se-summary-row"><span>Round Off</span><span>{roundOff >= 0 ? '+' : ''}{fmt(roundOff)}</span></div>
              <div className="se-summary-rule-strong" />
              <div className="se-summary-total">
                <span>Grand Total (₹)</span><span className="se-total-value">₹{fmt(grandTotal)}</span>
              </div>
            </div>

            <button className="ms-btn ms-btn-add se-primary-btn" onClick={() => handleCreate('SAVED')} disabled={loading || !!selected}>
              <span>+</span> CREATE (F2)
            </button>
            <button className="ms-btn se-primary-btn se-draft-btn" onClick={() => handleCreate('HOLD')} disabled={loading || !!selected}>
              DRAFT
            </button>
            <button className="ms-btn ms-btn-save se-primary-btn" onClick={handleSave} disabled={loading || !selected}>
              SAVE (F2)
            </button>
            <button className="ms-btn se-primary-btn se-print-btn" onClick={() => window.print()}>
              PRINT (F9)
            </button>
          </div>
        </div>

      </div>
    </Saleslayout>
  );
}
