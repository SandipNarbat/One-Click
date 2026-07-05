// src/pages/SupplierPayment.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supplierPaymentAPI, supplierAPI } from '../api/axios';
import MasterLayout from '../components/MasterLayout';
import '../styles/masterStyles.css';
import './SupplierPayment.css';

const PAYMENT_TYPES = ['CASH', 'BANK', 'UPI', 'CHEQUE', 'NEFT', 'RTGS'];
const CREDIT_DAYS = 30; // assumed credit period for the Due Date column

export default function SupplierPayment() {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [alloc, setAlloc] = useState({});          // { [purchaseId]: amount(number) }
  const [allocMode, setAllocMode] = useState('AUTO');
  const [autoAmount, setAutoAmount] = useState('');
  const [searchInv, setSearchInv] = useState('');

  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState('CASH');
  const [refNo, setRefNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [transNo, setTransNo] = useState('');
  const [transDate, setTransDate] = useState('');
  const [narration, setNarration] = useState('');

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).replace(/ /g, '/');

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };
  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dmy = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const dueDate = (d) => { const dt = new Date(d); dt.setDate(dt.getDate() + CREDIT_DAYS); return dt; };

  const loadSuppliers = useCallback(async () => {
    try { const res = await supplierAPI.getAll(); setSuppliers(res.data || []); } catch (e) { showToast('error', e.message); }
  }, []);

  const loadPayments = useCallback(async () => {
    try { const res = await supplierPaymentAPI.list({ limit: 10 }); setPayments(res.records || []); } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { loadSuppliers(); loadPayments(); }, [loadSuppliers, loadPayments]);

  const resetPaymentForm = () => {
    setAlloc({}); setAutoAmount(''); setSearchInv('');
    setMode('CASH'); setRefNo(''); setBankName(''); setTransNo(''); setTransDate(''); setNarration('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
  };

  const loadSupplierData = async (sid) => {
    setLoading(true);
    try {
      const [sum, inv] = await Promise.all([
        supplierPaymentAPI.getOutstanding(Number(sid)),
        supplierPaymentAPI.getPending(Number(sid), 'OUTSTANDING_ONLY'),
      ]);
      setSummary(sum);
      setInvoices(inv || []);
      if (!inv || inv.length === 0) showToast('info', 'No outstanding invoices for this supplier');
    } catch (e) { showToast('error', e.message); setSummary(null); setInvoices([]); }
    finally { setLoading(false); }
  };

  const handleSupplierChange = (e) => {
    const sid = e.target.value;
    setSupplierId(sid);
    resetPaymentForm();
    setSummary(null); setInvoices([]);
    if (sid) loadSupplierData(sid);
  };

  // ── Derived metrics ──
  const totalAllocated = useMemo(
    () => Object.values(alloc).reduce((s, v) => s + (Number(v) || 0), 0),
    [alloc],
  );
  const oldestInvoice = useMemo(
    () => invoices.reduce((min, p) => (!min || new Date(p.purchaseDate) < new Date(min.purchaseDate) ? p : min), null),
    [invoices],
  );
  const latestInvoice = useMemo(
    () => invoices.reduce((max, p) => (!max || new Date(p.purchaseDate) > new Date(max.purchaseDate) ? p : max), null),
    [invoices],
  );
  const totalOverdue = useMemo(() => {
    const a = summary?.ageing;
    if (!a) return 0;
    return (a['31-60'] || 0) + (a['61-90'] || 0) + (a['90+'] || 0);
  }, [summary]);

  const filteredInvoices = useMemo(() => {
    const q = searchInv.trim().toLowerCase();
    return q ? invoices.filter((p) => String(p.invoiceNumber).toLowerCase().includes(q)) : invoices;
  }, [invoices, searchInv]);

  // ── Allocation handlers ──
  const switchMode = (m) => { setAllocMode(m); setAlloc({}); setAutoAmount(''); };

  const toggleInvoice = (row) => {
    setAlloc((prev) => {
      const next = { ...prev };
      if (next[row.id] != null) delete next[row.id];
      else next[row.id] = Number(row.balanceAmount) || 0;
      return next;
    });
  };

  const setInvoiceAmount = (row, val) => {
    let amt = Number(val) || 0;
    if (amt < 0) amt = 0;
    if (amt > row.balanceAmount) amt = row.balanceAmount;
    setAlloc((prev) => {
      const next = { ...prev };
      if (amt > 0) next[row.id] = amt; else delete next[row.id];
      return next;
    });
  };

  const handleAutoAllocate = async () => {
    const amount = Number(autoAmount) || 0;
    if (amount <= 0) return showToast('error', 'Enter a payment amount to auto-allocate');
    if (invoices.length === 0) return showToast('error', 'No outstanding invoices');
    setLoading(true);
    try {
      const result = await supplierPaymentAPI.autoAllocate({
        purchaseIds: invoices.map((p) => p.id),
        paymentAmount: amount,
      });
      const next = {};
      (result || []).forEach((a) => { if (Number(a.allocatedAmount) > 0) next[a.purchaseId] = Number(a.allocatedAmount); });
      setAlloc(next);
      const allocated = Object.values(next).reduce((s, v) => s + v, 0);
      showToast('success', `Allocated ₹${fmt(allocated)} across ${Object.keys(next).length} invoice(s)`);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleClear = () => {
    setSupplierId(''); setSummary(null); setInvoices([]);
    resetPaymentForm();
  };

  const handleSave = async () => {
    if (!supplierId) return showToast('error', 'Select a supplier');
    const items = Object.entries(alloc)
      .filter(([, v]) => Number(v) > 0)
      .map(([purchaseId, v]) => ({ purchaseId: Number(purchaseId), allocatedAmount: Number(v) }));
    if (items.length === 0) return showToast('error', 'Select at least one invoice to pay');
    if (mode !== 'CASH' && (!bankName.trim() || !transNo.trim() || !refNo.trim() || !transDate)) {
      return showToast('error', 'Bank name, transaction no, reference no and transaction date are required for non-cash');
    }

    setLoading(true);
    try {
      await supplierPaymentAPI.create({
        supplierId: Number(supplierId),
        paymentDate,
        remarks: narration.trim() || null,
        mode,
        bankName: mode === 'CASH' ? null : bankName.trim(),
        transNo: mode === 'CASH' ? null : transNo.trim(),
        refNo: mode === 'CASH' ? null : refNo.trim(),
        transDate: mode === 'CASH' ? null : transDate,
        totalAmount: totalAllocated,
        items,
      });
      showToast('success', `Payment of ₹${fmt(totalAllocated)} saved`);
      const sid = supplierId;
      resetPaymentForm();
      await Promise.all([loadSupplierData(sid), loadPayments()]);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const isSelected = (id) => alloc[id] != null;

  return (
    <MasterLayout>
      {toast && <div className={`ms-toast ms-toast-${toast.type}`}>{toast.msg}</div>}

      <div className="ms-page">
        <div className="ms-page-header">
          <div>
            <h1 className="ms-page-title">Supplier Payment</h1>
            <p className="ms-page-subtitle">Settle outstanding purchase invoices supplier-wise</p>
          </div>
          <div className="ms-entry-date-box">
            <span className="ms-entry-label">ENTRY DATE</span>
            <span className="ms-entry-value">{today}</span>
          </div>
        </div>

        {/* ── Supplier + payment mode ── */}
        <div className="ms-form-card">
          <div className="ms-row sp-top-row">
            <div className="ms-field flex-2">
              <label className="ms-label">Supplier *</label>
              <select className="ms-select" value={supplierId} onChange={handleSupplierChange}>
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.supplierId} — {s.supplierName}</option>
                ))}
              </select>
            </div>
            <div className="ms-field">
              <label className="ms-label">Payment Date *</label>
              <input className="ms-input" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div className="ms-field">
              <label className="ms-label">Allocation</label>
              <div className="sp-toggle">
                <button className={`sp-toggle-btn ${allocMode === 'AUTO' ? 'sp-toggle-on' : ''}`} onClick={() => switchMode('AUTO')}>Auto Select</button>
                <button className={`sp-toggle-btn ${allocMode === 'MANUAL' ? 'sp-toggle-on' : ''}`} onClick={() => switchMode('MANUAL')}>Manual Select</button>
              </div>
            </div>
            <div className="ms-field">
              <label className="ms-label">Reference / Cheque No.</label>
              <input className="ms-input" value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="Enter reference number" />
            </div>
            <div className="ms-field sp-outstanding-box">
              <span className="sp-ob-label">Total Outstanding</span>
              <span className="sp-ob-value">₹{fmt(summary?.totalOutstanding)}</span>
            </div>
          </div>
        </div>

        {/* ── Metric cards ── */}
        <div className="sp-cards">
          <div className="sp-card sp-card-purple">
            <span className="sp-card-label">Total Invoice</span>
            <span className="sp-card-value">{invoices.length}</span>
          </div>
          <div className="sp-card sp-card-red">
            <span className="sp-card-label">Total Outstanding</span>
            <span className="sp-card-value">₹{fmt(summary?.totalOutstanding)}</span>
          </div>
          <div className="sp-card sp-card-amber">
            <span className="sp-card-label">Oldest Invoice</span>
            <span className="sp-card-value sp-card-sm">{oldestInvoice ? dmy(oldestInvoice.purchaseDate) : '—'}</span>
          </div>
          <div className="sp-card sp-card-green">
            <span className="sp-card-label">Latest Invoice</span>
            <span className="sp-card-value sp-card-sm">{latestInvoice ? dmy(latestInvoice.purchaseDate) : '—'}</span>
          </div>
          <div className="sp-card sp-card-red">
            <span className="sp-card-label">Total Overdue</span>
            <span className="sp-card-value">₹{fmt(totalOverdue)}</span>
          </div>
        </div>

        {/* ── Outstanding invoices ── */}
        <div className="ms-table-card mt-16">
          <div className="ms-table-header">
            <span className="ms-table-title">
              Outstanding Invoices
              <span className="sp-count-pill">{filteredInvoices.length} found</span>
            </span>
            <div className="sp-inv-tools">
              {allocMode === 'AUTO' && (
                <div className="sp-auto-wrap">
                  <input className="ms-input m-0" type="number" min="0" value={autoAmount}
                    onChange={(e) => setAutoAmount(e.target.value)} placeholder="Amount to allocate" />
                  <button className="ms-btn ms-btn-add" onClick={handleAutoAllocate} disabled={loading || !supplierId}>
                    AUTO SELECT OLDEST
                  </button>
                </div>
              )}
              <input className="ms-input m-0 sp-search" value={searchInv}
                onChange={(e) => setSearchInv(e.target.value)} placeholder="Search Invoice No…" />
            </div>
          </div>

          <div className="ms-table-wrap">
            <table className="ms-table sp-table">
              <thead>
                <tr>
                  <th className="ms-th sp-c">✓</th>
                  <th className="ms-th">Sr.</th>
                  <th className="ms-th">Invoice No.</th>
                  <th className="ms-th">Invoice Date</th>
                  <th className="ms-th">Due Date</th>
                  <th className="ms-th sp-c">Days</th>
                  <th className="ms-th sp-r">Invoice Amt</th>
                  <th className="ms-th sp-r">Paid</th>
                  <th className="ms-th sp-r">Balance</th>
                  <th className="ms-th sp-r">Allocated</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan={10} className="ms-empty">
                    {supplierId ? 'No outstanding invoices' : 'Select a supplier to load outstanding invoices'}
                  </td></tr>
                ) : filteredInvoices.map((p, i) => {
                  const overdue = p.daysPending > CREDIT_DAYS;
                  const sel = isSelected(p.id);
                  return (
                    <tr key={p.id} className={`ms-tr ${sel ? 'ms-tr-selected' : ''}`}>
                      <td className="ms-td sp-c">
                        <input type="checkbox" checked={sel}
                          disabled={allocMode === 'AUTO'}
                          onChange={() => toggleInvoice(p)} />
                      </td>
                      <td className="ms-td">{i + 1}</td>
                      <td className="ms-td sp-bold sp-blue">{p.invoiceNumber}</td>
                      <td className="ms-td">{dmy(p.purchaseDate)}</td>
                      <td className="ms-td">{dmy(dueDate(p.purchaseDate))}</td>
                      <td className="ms-td sp-c">
                        <span className={overdue ? 'sp-days-over' : 'sp-days'}>{p.daysPending}d</span>
                      </td>
                      <td className="ms-td sp-r">₹{fmt(p.invoiceAmount)}</td>
                      <td className="ms-td sp-r">₹{fmt(p.paidAmount)}</td>
                      <td className="ms-td sp-r sp-bold">₹{fmt(p.balanceAmount)}</td>
                      <td className="ms-td sp-r">
                        {allocMode === 'MANUAL' ? (
                          <input className="ms-input m-0 sp-alloc-input" type="number" min="0" max={p.balanceAmount}
                            value={alloc[p.id] ?? ''} placeholder="0"
                            onChange={(e) => setInvoiceAmount(p, e.target.value)} />
                        ) : (
                          <span className={alloc[p.id] ? 'sp-alloc-val' : 'sp-muted'}>
                            {alloc[p.id] ? `₹${fmt(alloc[p.id])}` : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="ms-table-footer">
            {invoices.length > 0 && (
              <span>Selected {Object.keys(alloc).length} of {invoices.length} · Total allocated: <strong>₹{fmt(totalAllocated)}</strong></span>
            )}
          </div>
        </div>

        {/* ── Payment details ── */}
        <div className="ms-form-card mt-16">
          <div className="sp-section-label">PAYMENT DETAILS</div>
          <div className="ms-row">
            <div className="ms-field">
              <label className="ms-label">Payment Type *</label>
              <select className="ms-select" value={mode} onChange={(e) => setMode(e.target.value)}>
                {PAYMENT_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {mode === 'CASH' ? (
              <div className="ms-field">
                <label className="ms-label">Account</label>
                <input className="ms-input ms-input-disabled" value="Cash in Hand" readOnly />
              </div>
            ) : (
              <>
                <div className="ms-field">
                  <label className="ms-label">Bank Name *</label>
                  <input className="ms-input" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name" />
                </div>
                <div className="ms-field">
                  <label className="ms-label">Transaction No. *</label>
                  <input className="ms-input" value={transNo} onChange={(e) => setTransNo(e.target.value)} placeholder="Txn / UTR no." />
                </div>
                <div className="ms-field">
                  <label className="ms-label">Transaction Date *</label>
                  <input className="ms-input" type="date" value={transDate} onChange={(e) => setTransDate(e.target.value)} />
                </div>
              </>
            )}
            <div className="ms-field">
              <label className="ms-label">Payment Amount</label>
              <input className="ms-input ms-input-disabled sp-amount" value={fmt(totalAllocated)} readOnly />
            </div>
            <div className="ms-field flex-2">
              <label className="ms-label">Narration</label>
              <input className="ms-input" value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="Enter narration (optional)" />
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="ms-action-bar">
          <div className="ms-action-left">
            <button className="ms-btn ms-btn-clear" onClick={handleClear} disabled={loading}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              CLEAR
            </button>
          </div>
          <div className="ms-action-right">
            <button className="ms-btn ms-btn-save" onClick={handleSave} disabled={loading}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              SAVE PAYMENT
            </button>
          </div>
        </div>

        {/* ── Recent payments ── */}
        <div className="ms-table-card mt-16">
          <div className="ms-table-header">
            <span className="ms-table-title">Recent Payments ({payments.length})</span>
          </div>
          <div className="ms-table-wrap">
            <table className="ms-table">
              <thead>
                <tr>
                  {['Sr.', 'Voucher No.', 'Date', 'Supplier', 'Mode', 'Amount', 'Status'].map((h) => (
                    <th key={h} className="ms-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={7} className="ms-empty">No payments yet</td></tr>
                ) : payments.map((p, i) => (
                  <tr key={p.id} className="ms-tr">
                    <td className="ms-td">{i + 1}</td>
                    <td className="ms-td sp-bold sp-blue">{p.voucherNo}</td>
                    <td className="ms-td">{dmy(p.paymentDate)}</td>
                    <td className="ms-td">{p.supplier?.supplierName || '—'}</td>
                    <td className="ms-td">{p.mode}</td>
                    <td className="ms-td sp-r">₹{fmt(p.totalAmount)}</td>
                    <td className="ms-td">
                      <span className={`ms-badge ${p.status === 'CANCELLED' ? 'badge-single' : 'badge-multi'}`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ms-table-footer">Showing {payments.length} recent payment{payments.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
    </MasterLayout>
  );
}
