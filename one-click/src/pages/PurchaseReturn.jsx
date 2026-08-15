// src/pages/PurchaseReturn.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { purchaseReturnAPI, supplierAPI } from '../api/axios';
import MasterLayout from '../components/MasterLayout';
import '../styles/masterStyles.css';
import './PurchaseReturn.css';
import './PrintReport.css';

const REASONS = ['Damaged', 'Defective', 'Wrong Item', 'Excess Stock', 'Expired', 'Other'];
const RETURN_MODES = ['Credit Note', 'Replacement', 'Cash Refund'];

// Flatten a purchase's returnable items into selectable rows.
// IMEI products → one row per available IMEI (qty fixed at 1).
// Qty products (accessories) → one row per line with an editable return qty.
const buildRows = (purchase) => {
  if (!purchase?.returnableItems) return [];
  const imeiRows = (purchase.returnableItems.imeiItems || []).map((im) => ({
    key: `i-${im.id}`,
    kind: 'imei',
    purchaseItemId: im.purchaseItemId ?? im.purchaseItem?.id,
    imeiId: im.id,
    imeiNo: im.imeiNo || '',
    barcode: im.purchaseItem?.barcode || '',
    productName: im.purchaseItem?.productName || '',
    brand: im.purchaseItem?.brand || '',
    model: im.purchaseItem?.model || '',
    hsnCode: im.purchaseItem?.hsnCode || '',
    purchaseRate: Number(im.purchaseItem?.purchaseRate || 0),
    discountPercent: Number(im.purchaseItem?.discountPercent || 0),
    cgstPercent: Number(im.purchaseItem?.cgstPercent || 0),
    sgstPercent: Number(im.purchaseItem?.sgstPercent || 0),
    igstPercent: Number(im.purchaseItem?.igstPercent || 0),
    returnableQty: 1,
    returnQty: 1,
    checked: false,
  }));
  const qtyRows = (purchase.returnableItems.qtyItems || []).map((it) => {
    const returnable = it.returnableQty ?? (Number(it.qty || 0) - Number(it.returnedQty || 0));
    return {
      key: `q-${it.id}`,
      kind: 'qty',
      purchaseItemId: it.id,
      imeiId: null,
      imeiNo: '',
      barcode: it.barcode || '',
      productName: it.productName || '',
      brand: it.brand || '',
      model: it.model || '',
      hsnCode: it.hsnCode || '',
      purchaseRate: Number(it.purchaseRate || 0),
      discountPercent: Number(it.discountPercent || 0),
      cgstPercent: Number(it.cgstPercent || 0),
      sgstPercent: Number(it.sgstPercent || 0),
      igstPercent: Number(it.igstPercent || 0),
      returnableQty: returnable,
      returnQty: returnable,
      checked: false,
    };
  });
  return [...imeiRows, ...qtyRows];
};

// Return credit math — mirrors purchaseReturn.service.js exactly: discount
// is subtracted from the gross amount first, and GST is calculated on that
// post-discount (taxable) amount, so on-screen totals equal the saved debit note.
const rowValues = (r) => {
  const gstPct = r.cgstPercent + r.sgstPercent + r.igstPercent;
  const qty = Number(r.returnQty) || 0;
  const grossAmount = r.purchaseRate * qty;
  const discountAmount = (grossAmount * (r.discountPercent || 0)) / 100;
  const taxable = grossAmount - discountAmount;
  const gstAmt = (taxable * gstPct) / 100;
  return { gstPct, grossAmount, discountAmount, taxable, gstAmt, total: taxable + gstAmt };
};

export default function PurchaseReturn() {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [supplierPurchases, setSupplierPurchases] = useState([]);
  const [purchaseId, setPurchaseId] = useState('');
  const [rows, setRows] = useState([]);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [remark, setRemark] = useState('');
  const [returnMode, setReturnMode] = useState('Credit Note');
  const [creditNoteNo, setCreditNoteNo] = useState('');
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const barcodeRef = useRef(null);
  const imeiRef = useRef(null);
  const [barcode, setBarcode] = useState('');
  const [imei, setImei] = useState('');

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).replace(/ /g, '/');

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };
  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const loadSuppliers = useCallback(async () => {
    try { const res = await supplierAPI.getAll(); setSuppliers(res.data || []); } catch (e) { showToast('error', e.message); }
  }, []);

  const loadReturns = useCallback(async () => {
    try { const res = await purchaseReturnAPI.getAll(); setReturns(res.data || []); } catch (e) { showToast('error', e.message); }
  }, []);

  useEffect(() => { loadSuppliers(); loadReturns(); }, [loadSuppliers, loadReturns]);

  const selectedSupplier = suppliers.find((s) => String(s.id) === String(supplierId));
  const selectedPurchase = supplierPurchases.find((p) => String(p.id) === String(purchaseId));

  const resetItems = () => { setPurchaseId(''); setRows([]); };

  const handleSupplierChange = async (e) => {
    const sid = e.target.value;
    setSupplierId(sid);
    resetItems();
    if (!sid) { setSupplierPurchases([]); return; }
    setLoading(true);
    try {
      const res = await purchaseReturnAPI.getSupplierItems(Number(sid));
      const list = res.data || [];
      setSupplierPurchases(list);
      if (list.length === 0) showToast('info', 'No returnable invoices for this supplier');
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleInvoiceChange = (e) => {
    const pid = e.target.value;
    setPurchaseId(pid);
    const purchase = supplierPurchases.find((p) => String(p.id) === String(pid));
    setRows(buildRows(purchase));
  };

  const toggleRow = (key) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, checked: !r.checked } : r)));

  const setRowQty = (key, val) =>
    setRows((prev) => prev.map((r) => {
      if (r.key !== key) return r;
      let q = Number(val) || 0;
      if (q < 0) q = 0;
      if (q > r.returnableQty) q = r.returnableQty;
      return { ...r, returnQty: q, checked: q > 0 ? r.checked : false };
    }));

  const checkAll = (on) => setRows((prev) => prev.map((r) => ({ ...r, checked: on })));

  // Scan accelerator — ticks the matching row inside the selected supplier's
  // invoices, auto-switching the invoice if the scanned item lives elsewhere.
  const handleScan = async (type) => {
    const value = (type === 'barcode' ? barcode : imei).trim();
    if (!value) return;
    if (!supplierId) return showToast('error', 'Select a supplier first, then scan');
    setLoading(true);
    try {
      const res = await purchaseReturnAPI.search(type, value);
      const d = res.data;
      if (!d) { showToast('error', 'No returnable record found'); return; }

      const scanPurchaseId = type === 'imei' ? d.purchaseItem?.purchaseId : d.purchaseId;
      const scanSupplierId = type === 'imei' ? d.purchaseItem?.purchase?.supplierId : d.purchase?.supplierId;
      const scanPurchaseItemId = type === 'imei' ? (d.purchaseItemId ?? d.purchaseItem?.id) : d.id;
      const scanImeiId = type === 'imei' ? d.id : null;

      if (String(scanSupplierId) !== String(supplierId)) {
        showToast('error', 'Scanned item belongs to a different supplier');
        return;
      }

      // Ensure the right invoice is loaded, computing rows locally so we can
      // tick within the same update (state set below is async).
      let workingRows = rows;
      if (String(scanPurchaseId) !== String(purchaseId)) {
        const purchase = supplierPurchases.find((p) => String(p.id) === String(scanPurchaseId));
        if (!purchase) { showToast('error', 'Scanned invoice has no returnable items'); return; }
        setPurchaseId(String(scanPurchaseId));
        workingRows = buildRows(purchase);
      }

      const matchKey = type === 'imei' ? `i-${scanImeiId}` : `q-${scanPurchaseItemId}`;
      const target = workingRows.find((r) => r.key === matchKey);
      if (!target) { showToast('error', 'Item already returned or not available'); return; }

      setRows(workingRows.map((r) => (r.key === matchKey ? { ...r, checked: true } : r)));
      showToast('success', `Added ${type === 'imei' ? d.imeiNo : (target.productName || 'item')}`);
    } catch (e) { showToast('error', e.message); }
    finally {
      setLoading(false);
      if (type === 'barcode') { setBarcode(''); barcodeRef.current?.focus(); }
      else { setImei(''); imeiRef.current?.focus(); }
    }
  };

  const checkedRows = rows.filter((r) => r.checked && Number(r.returnQty) > 0);
  const totals = checkedRows.reduce(
    (acc, r) => {
      const v = rowValues(r);
      acc.qty += Number(r.returnQty) || 0;
      acc.gross += v.grossAmount;
      acc.discount += v.discountAmount;
      acc.cgst += (v.taxable * r.cgstPercent) / 100;
      acc.sgst += (v.taxable * r.sgstPercent) / 100;
      acc.igst += (v.taxable * r.igstPercent) / 100;
      acc.net += v.total;
      return acc;
    },
    { qty: 0, gross: 0, discount: 0, cgst: 0, sgst: 0, igst: 0, net: 0 },
  );

  const handleClear = () => {
    setSupplierId(''); setSupplierPurchases([]); resetItems();
    setReason(''); setRemark(''); setReturnMode('Credit Note'); setCreditNoteNo('');
    setReturnDate(new Date().toISOString().split('T')[0]);
  };

  const buildPayload = () => {
    const items = [];
    const imeiGroups = new Map();
    for (const r of checkedRows) {
      if (r.kind === 'imei') {
        if (!imeiGroups.has(r.purchaseItemId)) {
          const grp = { purchaseItemId: r.purchaseItemId, imeiIds: [] };
          imeiGroups.set(r.purchaseItemId, grp);
          items.push(grp);
        }
        imeiGroups.get(r.purchaseItemId).imeiIds.push(r.imeiId);
      } else {
        items.push({ purchaseItemId: r.purchaseItemId, returnQty: Number(r.returnQty) });
      }
    }
    const notes = [remark.trim(), creditNoteNo.trim() && `Credit Note No: ${creditNoteNo.trim()}`]
      .filter(Boolean).join(' | ');
    return {
      purchaseId: Number(purchaseId),
      supplierId: Number(supplierId),
      returnType: returnMode,
      reason,
      notes: notes || null,
      items,
    };
  };

  const handleSave = async (print = false) => {
    if (!supplierId) return showToast('error', 'Select a supplier');
    if (!purchaseId) return showToast('error', 'Select a reference invoice');
    if (checkedRows.length === 0) return showToast('error', 'Select at least one item to return');
    if (!reason) return showToast('error', 'Select a reason for return');
    if (!returnMode) return showToast('error', 'Select a return mode');

    setLoading(true);
    try {
      const res = await purchaseReturnAPI.create(buildPayload());
      showToast('success', `Return saved — ${res.data?.dnNumber || 'done'}`);
      handleClear();
      await loadReturns();
      if (print) setTimeout(() => window.print(), 300);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  return (
    <MasterLayout>
      {toast && <div className={`ms-toast ms-toast-${toast.type}`}>{toast.msg}</div>}

      <div className="ms-page">
        {/* ── Header ── */}
        <div className="ms-page-header">
          <div>
            <h1 className="ms-page-title">Product Return</h1>
            <p className="ms-page-subtitle">Create and manage purchase return entries</p>
          </div>
          <div className="ms-entry-date-box">
            <span className="ms-entry-label">ENTRY DATE</span>
            <span className="ms-entry-value">{today}</span>
          </div>
        </div>

        {/* ── Return header form ── */}
        <div className="ms-form-card">
          <div className="pret-section-label">RETURN DETAILS</div>
          <div className="ms-row">
            <div className="ms-field pret-narrow">
              <label className="ms-label">Return No</label>
              <input className="ms-input ms-input-disabled" value="AUTO" readOnly />
            </div>
            <div className="ms-field pret-narrow">
              <label className="ms-label">Return Date *</label>
              <input className="ms-input" type="date" value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)} />
            </div>
            <div className="ms-field flex-2">
              <label className="ms-label">Supplier *</label>
              <select className="ms-select" value={supplierId} onChange={handleSupplierChange}>
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.supplierId} — {s.supplierName}</option>
                ))}
              </select>
            </div>
            <div className="ms-field pret-narrow">
              <label className="ms-label">Supplier Code</label>
              <input className="ms-input ms-input-disabled" value={selectedSupplier?.supplierId || '—'} readOnly />
            </div>
          </div>

          <div className="ms-row">
            <div className="ms-field flex-2">
              <label className="ms-label">Ref. Invoice *</label>
              <select className="ms-select" value={purchaseId} onChange={handleInvoiceChange} disabled={!supplierId}>
                <option value="">{supplierId ? 'Select returnable invoice' : 'Select a supplier first'}</option>
                {supplierPurchases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.invoiceNo} · {p.invoiceDate ? new Date(p.invoiceDate).toLocaleDateString('en-GB') : '—'} · {p.purchaseNo}
                  </option>
                ))}
              </select>
            </div>
            <div className="ms-field">
              <label className="ms-label">Ref. Invoice Date</label>
              <input className="ms-input ms-input-disabled"
                value={selectedPurchase?.invoiceDate ? new Date(selectedPurchase.invoiceDate).toLocaleDateString('en-GB') : '—'} readOnly />
            </div>
          </div>
        </div>

        {/* ── Return items ── */}
        <div className="ms-table-card mt-16">
          <div className="ms-table-header">
            <span className="ms-table-title">
              Return Items
              <span className="pret-items-meta">
                {checkedRows.length} selected &nbsp;·&nbsp; Qty: {totals.qty} &nbsp;·&nbsp; Credit: ₹{fmt(totals.net)}
              </span>
            </span>
            <div className="pret-scan-row">
              <div className="pret-scan-wrap">
                <input className="ms-input m-0" ref={barcodeRef} value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan('barcode')}
                  placeholder="Scan Barcode…" />
                <button className="ms-btn ms-btn-edit" onClick={() => handleScan('barcode')} disabled={loading}>SCAN</button>
              </div>
              <div className="pret-scan-wrap">
                <input className="ms-input m-0" ref={imeiRef} value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan('imei')}
                  placeholder="Scan IMEI…" />
                <button className="ms-btn ms-btn-edit" onClick={() => handleScan('imei')} disabled={loading}>SCAN IMEI</button>
              </div>
            </div>
          </div>

          <div className="ms-table-wrap">
            <table className="ms-table pret-table">
              <thead>
                <tr>
                  <th className="ms-th pret-c">
                    <input type="checkbox"
                      checked={rows.length > 0 && rows.every((r) => r.checked)}
                      onChange={(e) => checkAll(e.target.checked)} />
                  </th>
                  <th className="ms-th">Sr.</th>
                  <th className="ms-th">Barcode</th>
                  <th className="ms-th">IMEI / Serial</th>
                  <th className="ms-th">Product</th>
                  <th className="ms-th">HSN</th>
                  <th className="ms-th pret-c">Qty</th>
                  <th className="ms-th pret-r">Rate (₹)</th>
                  <th className="ms-th pret-r">Disc (₹)</th>
                  <th className="ms-th pret-r">Taxable (₹)</th>
                  <th className="ms-th pret-c">GST %</th>
                  <th className="ms-th pret-r">GST (₹)</th>
                  <th className="ms-th pret-r">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={13} className="ms-empty">
                    {purchaseId ? 'No returnable items on this invoice' : 'Select a supplier and reference invoice to load returnable items'}
                  </td></tr>
                ) : rows.map((r, i) => {
                  const v = rowValues(r);
                  return (
                    <tr key={r.key} className={`ms-tr ${r.checked ? 'ms-tr-selected' : ''}`}>
                      <td className="ms-td pret-c">
                        <input type="checkbox" checked={r.checked} onChange={() => toggleRow(r.key)} />
                      </td>
                      <td className="ms-td">{i + 1}</td>
                      <td className="ms-td">{r.barcode || '—'}</td>
                      <td className="ms-td">{r.imeiNo || (r.kind === 'imei' ? '—' : '(qty)')}</td>
                      <td className="ms-td">
                        {r.productName || '—'}
                        {(r.brand || r.model) && <span className="pret-sub"> · {[r.brand, r.model].filter(Boolean).join(' ')}</span>}
                      </td>
                      <td className="ms-td">{r.hsnCode || '—'}</td>
                      <td className="ms-td pret-c">
                        {r.kind === 'imei' ? 1 : (
                          <input className="ms-input m-0 pret-qty" type="number" min="0" max={r.returnableQty}
                            value={r.returnQty} onChange={(e) => setRowQty(r.key, e.target.value)} />
                        )}
                      </td>
                      <td className="ms-td pret-r">{fmt(r.purchaseRate)}</td>
                      <td className="ms-td pret-r">{v.discountAmount > 0 ? `−${fmt(v.discountAmount)}` : '—'}</td>
                      <td className="ms-td pret-r">{fmt(v.taxable)}</td>
                      <td className="ms-td pret-c">{v.gstPct}%</td>
                      <td className="ms-td pret-r">{fmt(v.gstAmt)}</td>
                      <td className="ms-td pret-r pret-bold">{fmt(v.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="ms-table-footer">
            {rows.length > 0 && `${rows.length} returnable line${rows.length !== 1 ? 's' : ''} · tick the rows to return`}
          </div>
        </div>

        {/* ── Reason + mode + totals ── */}
        <div className="pret-bottom-grid mt-16">
          <div className="ms-form-card">
            <div className="pret-section-label">REASON FOR RETURN</div>
            <div className="ms-row">
              <div className="ms-field">
                <label className="ms-label">Reason *</label>
                <select className="ms-select" value={reason} onChange={(e) => setReason(e.target.value)}>
                  <option value="">Select Reason</option>
                  {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="ms-field">
                <label className="ms-label">Remark (Optional)</label>
                <input className="ms-input" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Enter remarks…" />
              </div>
            </div>
            <div className="pret-section-label mt-16">RETURN MODE</div>
            <div className="ms-row">
              <div className="ms-field">
                <label className="ms-label">Mode *</label>
                <select className="ms-select" value={returnMode} onChange={(e) => setReturnMode(e.target.value)}>
                  {RETURN_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="ms-field">
                <label className="ms-label">Credit Note No.</label>
                <input className="ms-input" value={creditNoteNo} onChange={(e) => setCreditNoteNo(e.target.value)} placeholder="Enter Credit Note No." />
              </div>
            </div>
          </div>

          <div className="ms-form-card">
            <div className="pret-section-label">RETURN SUMMARY</div>
            <div className="pret-sum-row"><span>Gross Amount</span><span>₹{fmt(totals.gross)}</span></div>
            <div className="pret-sum-row"><span>Discount</span><span>−₹{fmt(totals.discount)}</span></div>
            <div className="pret-sum-row"><span>Taxable Amount</span><span>₹{fmt(totals.gross - totals.discount)}</span></div>
            <div className="pret-sum-row"><span>CGST</span><span>₹{fmt(totals.cgst)}</span></div>
            <div className="pret-sum-row"><span>SGST</span><span>₹{fmt(totals.sgst)}</span></div>
            <div className="pret-sum-row"><span>IGST</span><span>₹{fmt(totals.igst)}</span></div>
            <div className="pret-sum-row pret-sum-total"><span>Net Credit</span><span>₹{fmt(totals.net)}</span></div>
          </div>
        </div>

        {/* ── Action bar ── */}
        <div className="ms-action-bar">
          <div className="ms-action-left">
            <button className="ms-btn ms-btn-clear" onClick={handleClear} disabled={loading}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              CLEAR
            </button>
          </div>
          <div className="ms-action-right">
            <button className="ms-btn ms-btn-save" onClick={() => handleSave(false)} disabled={loading}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              SAVE
            </button>
            <button className="ms-btn ms-btn-add" onClick={() => handleSave(true)} disabled={loading}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              SAVE &amp; PRINT
            </button>
          </div>
        </div>

        {/* ── All returns ── */}
        <div className="ms-table-card mt-16">
          <div className="ms-table-header">
            <span className="ms-table-title">Purchase Returns ({returns.length})</span>
            <button className="ms-btn ms-btn-print" onClick={() => window.print()}>PRINT</button>
          </div>
          <div className="ms-table-wrap">
            <table className="ms-table">
              <thead>
                <tr>
                  {['Sr.', 'DN No', 'Date', 'Ref Invoice', 'Supplier', 'Type', 'Reason', 'Net Credit', 'Status'].map((h) => (
                    <th key={h} className="ms-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {returns.length === 0 ? (
                  <tr><td colSpan={9} className="ms-empty">No returns yet</td></tr>
                ) : returns.map((r, i) => (
                  <tr key={r.id} className="ms-tr">
                    <td className="ms-td">{i + 1}</td>
                    <td className="ms-td pret-bold pret-blue">{r.dnNumber}</td>
                    <td className="ms-td">{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB') : '—'}</td>
                    <td className="ms-td">{r.purchase?.invoiceNo || '—'}</td>
                    <td className="ms-td">{r.supplier?.supplierName || '—'}</td>
                    <td className="ms-td">{r.returnType || '—'}</td>
                    <td className="ms-td">{r.reason || '—'}</td>
                    <td className="ms-td pret-r">₹{fmt(r.netAmount)}</td>
                    <td className="ms-td"><span className="ms-badge badge-multi">{r.status || 'COMPLETED'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ms-table-footer">Showing {returns.length} record{returns.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* ── Print report (returns list) ── */}
      <div className="pr-print-only">
        <div className="pr-ph-row">
          <div>
            <div className="pr-ph-company">SMART STS</div>
            <div className="pr-ph-tagline">Smart Service &amp; Trading Solutions</div>
          </div>
          <div className="pr-ph-right">
            <div className="pr-ph-title">PURCHASE RETURN REPORT</div>
            <div className="pr-ph-meta">{returns.length} records · Printed: {today}</div>
          </div>
        </div>
        <hr className="pr-ph-rule" />
        <div className="pr-ps-strip">
          <div className="pr-ps-cell">
            <span className="pr-ps-label">Total Returns</span>
            <span className="pr-ps-value">{returns.length}</span>
          </div>
          <div className="pr-ps-cell pr-ps-accent">
            <span className="pr-ps-label">Total Credit</span>
            <span className="pr-ps-value pr-ps-money">₹{fmt(returns.reduce((s, r) => s + Number(r.netAmount || 0), 0))}</span>
          </div>
        </div>
        <table className="pr-pt">
          <thead>
            <tr>
              <th className="pr-pt-th pr-pt-sr">Sr.</th>
              <th className="pr-pt-th">DN No</th>
              <th className="pr-pt-th">Date</th>
              <th className="pr-pt-th">Ref Invoice</th>
              <th className="pr-pt-th">Supplier</th>
              <th className="pr-pt-th">Type</th>
              <th className="pr-pt-th pr-pt-r">Net Credit (₹)</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r, i) => (
              <tr key={r.id} className={i % 2 === 1 ? 'pr-pt-alt' : ''}>
                <td className="pr-pt-td pr-pt-sr">{i + 1}</td>
                <td className="pr-pt-td pr-pt-bold pr-pt-blue">{r.dnNumber}</td>
                <td className="pr-pt-td">{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB') : '—'}</td>
                <td className="pr-pt-td">{r.purchase?.invoiceNo || '—'}</td>
                <td className="pr-pt-td">{r.supplier?.supplierName || '—'}</td>
                <td className="pr-pt-td">{r.returnType || '—'}</td>
                <td className="pr-pt-td pr-pt-r pr-pt-bold">{fmt(r.netAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pr-pf-row">
          <span>Generated by Smart STS · {today}</span>
          <div className="pr-pf-sig">Authorised Signatory</div>
        </div>
      </div>
    </MasterLayout>
  );
}
