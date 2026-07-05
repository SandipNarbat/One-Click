// src/pages/PettyCashDeposit.jsx
import { useState, useEffect, useCallback } from 'react';
import { pettyCashAPI, salesPersonAPI, supplierAPI } from '../api/axios';
import { readDraft, saveDraft, clearDraft } from '../hooks/useDraft';
import PettyCashLayout from '../components/PettyCashLayout';
import '../styles/masterStyles.css';
import './PettyCash.css';
import './PrintReport.css';

// ── Amount → words (Indian system) ──────────
const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
  'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

function cvt(n) {
  if (n === 0) return '';
  if (n < 20)  return ONES[n] + ' ';
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '') + ' ';
  return ONES[Math.floor(n / 100)] + ' Hundred ' + cvt(n % 100);
}

function toWords(amount) {
  const n = Math.floor(Math.abs(Number(amount) || 0));
  if (n === 0) return '';
  let r = '';
  if (n >= 10000000)               r += cvt(Math.floor(n / 10000000))              + 'Crore ';
  if (n % 10000000 >= 100000)      r += cvt(Math.floor((n % 10000000) / 100000))   + 'Lakh ';
  if (n % 100000   >= 1000)        r += cvt(Math.floor((n % 100000) / 1000))       + 'Thousand ';
  if (n % 1000 > 0)                r += cvt(n % 1000);
  return r.trim() + ' Rupees Only';
}

const MODES = ['Cash','Cheque','NEFT','RTGS','UPI','IMPS','Demand Draft'];
const BANKS = [
  'State Bank of India','HDFC Bank','ICICI Bank','Axis Bank',
  'Punjab National Bank','Bank of Baroda','Kotak Mahindra Bank',
  'IndusInd Bank','Yes Bank','IDFC First Bank',
  'Union Bank of India','Canara Bank','Bank of India',
];

const todayISO = () => new Date().toISOString().split('T')[0];

const EMPTY = {
  depositDate: todayISO(), depositedFrom: '', particulars: '',
  amount: '', amountInWords: '', mode: '',
  transNo: '', transDate: '', bankName: '', passedBy: '',
};

const DRAFT_KEY = 'petty-cash-deposit';

export default function PettyCashDeposit() {
  const [form,      setForm]      = useState(() => { const d = readDraft(DRAFT_KEY); return d ? { ...EMPTY, ...d } : EMPTY; });
  const [hasDraft]               = useState(() => { const d = readDraft(DRAFT_KEY); return !!(d && (d.depositedFrom || d.particulars || d.amount)); });
  const [records,   setRecords]   = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [nextNo,    setNextNo]    = useState('PC-0001');
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState(null);
  const [search,    setSearch]    = useState('');
  const [persons,   setPersons]   = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const dateLabel = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).replace(/ /g, '/');

  const loadAll = useCallback(async () => {
    try { const r = await pettyCashAPI.getAll(); setRecords(r.data); }
    catch (e) { showToast('error', e.message); }
  }, []);

  const loadNextNo = useCallback(async () => {
    try { const r = await pettyCashAPI.getNextNo(); setNextNo(r.data); } catch {}
  }, []);

  const loadDropdowns = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.all([salesPersonAPI.getAll(), supplierAPI.getAll()]);
      setPersons(pRes.data); setSuppliers(sRes.data);
    } catch {}
  }, []);

  useEffect(() => { loadAll(); loadNextNo(); loadDropdowns(); }, [loadAll, loadNextNo, loadDropdowns]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (hasDraft) showToast('info', 'Draft restored — you have unsaved changes'); }, []);
  useEffect(() => {
    if (!selected) {
      const hasData = !!(form.depositedFrom || form.particulars || form.amount);
      hasData ? saveDraft(DRAFT_KEY, form) : clearDraft(DRAFT_KEY);
    }
  }, [form, selected]); // eslint-disable-line

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({
      ...f,
      [name]: value,
      ...(name === 'amount' ? { amountInWords: toWords(value) } : {}),
    }));
  };

  const handleSelect = (rec) => {
    clearDraft(DRAFT_KEY);
    setSelected(rec);
    setForm({
      depositDate:   rec.depositDate   ? rec.depositDate.slice(0, 10)  : todayISO(),
      depositedFrom: rec.depositedFrom || '',
      particulars:   rec.particulars   || '',
      amount:        rec.amount != null ? String(rec.amount) : '',
      amountInWords: rec.amountInWords  || '',
      mode:          rec.mode          || '',
      transNo:       rec.transNo       || '',
      transDate:     rec.transDate     ? rec.transDate.slice(0, 10) : '',
      bankName:      rec.bankName      || '',
      passedBy:      rec.passedBy      || '',
    });
  };

  const handleClear = () => { clearDraft(DRAFT_KEY); setForm(EMPTY); setSelected(null); };

  const handleNew = async () => {
    if (!form.depositDate || !form.amount)
      return showToast('error', 'Deposit date and amount are required');
    setLoading(true);
    try {
      await pettyCashAPI.create(form);
      showToast('success', 'Petty cash deposit created');
      handleClear(); loadAll(); loadNextNo();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleEdit = async () => {
    if (!selected) return showToast('error', 'Select a record to edit');
    if (selected.status === 'CONFIRMED') return showToast('error', 'Cannot edit a confirmed record');
    setLoading(true);
    try {
      await pettyCashAPI.update(selected.id, form);
      showToast('success', 'Record updated');
      handleClear(); loadAll();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selected) return showToast('error', 'Select a record to delete');
    if (selected.status === 'CONFIRMED') return showToast('error', 'Cannot delete a confirmed record');
    if (!window.confirm(`Delete record "${selected.voucherNo}"?`)) return;
    setLoading(true);
    try {
      await pettyCashAPI.delete(selected.id);
      showToast('success', 'Record deleted');
      handleClear(); loadAll(); loadNextNo();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    if (!selected) return showToast('error', 'Select a record to confirm');
    if (selected.status === 'CONFIRMED') return showToast('error', 'Already confirmed');
    if (!window.confirm(`Confirm record "${selected.voucherNo}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await pettyCashAPI.confirm(selected.id);
      showToast('success', 'Record confirmed');
      handleClear(); loadAll();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    return (
      (r.voucherNo      || '').toLowerCase().includes(q) ||
      (r.depositedFrom  || '').toLowerCase().includes(q) ||
      (r.particulars    || '').toLowerCase().includes(q)
    );
  });

  const isConfirmed = selected?.status === 'CONFIRMED';

  return (
    <PettyCashLayout>
      {toast && <div className={`ms-toast ms-toast-${toast.type}`}>{toast.msg}</div>}
      <div className="ms-page">

        {/* Header */}
        <div className="ms-page-header">
          <div>
            <h1 className="ms-page-title">Petty Cash Deposit</h1>
            <p className="ms-page-subtitle">Record and manage petty cash deposit entries</p>
          </div>
          <div className="ms-entry-date-box">
            <span className="ms-entry-label">ENTRY DATE</span>
            <span className="ms-entry-value">{dateLabel}</span>
          </div>
        </div>

        {/* Form */}
        <div className="ms-form-card">

          {/* Row 1: Voucher No + Date */}
          <div className="ms-row">
            <div className="ms-field">
              <label className="ms-label">PTY CASH VCH NO.</label>
              <input className="ms-input ms-input-disabled"
                value={selected ? selected.voucherNo : nextNo} readOnly />
            </div>
            <div className="ms-field">
              <label className="ms-label">DATE</label>
              <input className="ms-input" type="date" name="depositDate"
                value={form.depositDate} onChange={handleChange} />
            </div>
          </div>

          {/* Deposited From */}
          <div className="ms-field mb-16">
            <label className="ms-label">DEPOSITED FROM</label>
            <select className="ms-select" name="depositedFrom" value={form.depositedFrom} onChange={handleChange}>
              <option value="">Select Supplier / Source...</option>
              {suppliers.map(s => <option key={s.id} value={s.supplierName}>{s.supplierName}</option>)}
              <option value="Own Funds">Own Funds</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash Sale">Cash Sale</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Particulars */}
          <div className="ms-field mb-16">
            <label className="ms-label">PARTICULARS</label>
            <input className="ms-input" name="particulars" value={form.particulars}
              onChange={handleChange} placeholder="Enter particulars / description..."
              list="pc-particulars-list" />
            <datalist id="pc-particulars-list">
              {records.map(r => r.particulars).filter(Boolean)
                .filter((v, i, a) => a.indexOf(v) === i)
                .map(v => <option key={v} value={v} />)}
            </datalist>
          </div>

          {/* Amount + In Words */}
          <div className="ms-row">
            <div className="ms-field" style={{ maxWidth: 200 }}>
              <label className="ms-label">RUPEES RS.</label>
              <div className="pc-rupee-wrap">
                <span className="pc-rupee-prefix">₹</span>
                <input className="ms-input pc-rupee-input" type="number"
                  name="amount" value={form.amount} onChange={handleChange}
                  placeholder="0.00" step="0.01" min="0" />
              </div>
            </div>
            <div className="ms-field" style={{ flex: 2 }}>
              <label className="ms-label">RUPEES (IN WORDS) RS.</label>
              <input className="ms-input ms-input-disabled pc-words-input"
                value={form.amountInWords} readOnly
                placeholder="Auto-calculated from amount..." />
            </div>
          </div>

          <div className="ms-section-divider">TRANSACTION DETAILS</div>

          {/* Mode */}
          <div className="ms-field mb-16" style={{ maxWidth: 280 }}>
            <label className="ms-label">MODE</label>
            <select className="ms-select" name="mode" value={form.mode} onChange={handleChange}>
              <option value="">Select Payment Mode...</option>
              {MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Trans No + Trans Date */}
          <div className="ms-row">
            <div className="ms-field">
              <label className="ms-label">TRANS NO.</label>
              <input className="ms-input" name="transNo" value={form.transNo}
                onChange={handleChange} placeholder="Cheque / UTR / Reference no..." />
            </div>
            <div className="ms-field">
              <label className="ms-label">DATE</label>
              <input className="ms-input" type="date" name="transDate"
                value={form.transDate} onChange={handleChange} />
            </div>
          </div>

          {/* Bank + Passed By */}
          <div className="ms-row">
            <div className="ms-field">
              <label className="ms-label">BANK NAME</label>
              <select className="ms-select" name="bankName" value={form.bankName} onChange={handleChange}>
                <option value="">Select Bank...</option>
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="ms-field">
              <label className="ms-label">PASSED BY</label>
              <select className="ms-select" name="passedBy" value={form.passedBy} onChange={handleChange}>
                <option value="">Select Person...</option>
                {persons.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* All Records Table */}
        <div className="ms-table-card">
          <div className="ms-table-header">
            <span className="ms-table-title">All Deposits ({filtered.length})</span>
            <input className="ms-input m-0" style={{ width: 260 }}
              placeholder="Search by no, deposited from, particulars..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="ms-table-wrap">
            <table className="ms-table">
              <thead>
                <tr>
                  {['Sr.','Vch No','Date','Deposited From','Particulars','Amount (₹)','Mode','Status'].map(h => (
                    <th key={h} className="ms-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="ms-empty">No records found</td></tr>
                ) : filtered.map((rec, i) => (
                  <tr key={rec.id}
                    className={`ms-tr ${selected?.id === rec.id ? 'ms-tr-selected' : ''}`}
                    onClick={() => handleSelect(rec)}>
                    <td className="ms-td">{i + 1}</td>
                    <td className="ms-td pc-voucher-no">{rec.voucherNo}</td>
                    <td className="ms-td">{rec.depositDate ? new Date(rec.depositDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="ms-td">{rec.depositedFrom || '—'}</td>
                    <td className="ms-td">{rec.particulars   || '—'}</td>
                    <td className="ms-td pc-amount-cell">₹{(rec.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="ms-td">{rec.mode || '—'}</td>
                    <td className="ms-td">
                      <span className={rec.status === 'CONFIRMED' ? 'pc-badge-confirmed' : 'pc-badge-draft'}>
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ms-table-footer">Showing {filtered.length} records · Click a row to load into form</div>
        </div>

        {/* Action Bar */}
        <div className="ms-action-bar">
          <div className="ms-action-left">
            <button className="ms-btn ms-btn-add" onClick={handleNew} disabled={loading}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              NEW
            </button>
            <button className="ms-btn ms-btn-edit" onClick={handleEdit} disabled={loading || !selected || isConfirmed}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              EDIT
            </button>
            <button className="ms-btn ms-btn-delete" onClick={handleDelete} disabled={loading || !selected || isConfirmed}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              DELETE
            </button>
            <button className="ms-btn ms-btn-confirm" onClick={handleConfirm} disabled={loading || !selected || isConfirmed}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              CONFIRM
            </button>
          </div>
          <div className="ms-action-right">
            <button className="ms-btn ms-btn-print" onClick={() => window.print()}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              PRINT
            </button>
            <button className="ms-btn ms-btn-clear" onClick={handleClear}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              CLEAR
            </button>
            <button className="ms-btn ms-btn-back" onClick={handleClear}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              BACK
            </button>
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
            <div className="pr-ph-title">PETTY CASH DEPOSIT REPORT</div>
            {/* <div className="pr-ph-meta">{filtered.length} records · Printed: {today}</div> */}
            {search && <div className="pr-ph-meta">Filter: <span className="pr-ph-filter">{search}</span></div>}
          </div>
        </div>
        <hr className="pr-ph-rule" />
        <div className="pr-ps-strip">
          <div className="pr-ps-cell">
            <span className="pr-ps-label">Total Deposits</span>
            <span className="pr-ps-value">{filtered.length}</span>
          </div>
          <div className="pr-ps-cell">
            <span className="pr-ps-label">Confirmed</span>
            <span className="pr-ps-value pr-ps-green">{filtered.filter(r => r.status === 'CONFIRMED').length}</span>
          </div>
          <div className="pr-ps-cell">
            <span className="pr-ps-label">Draft</span>
            <span className="pr-ps-value pr-ps-red">{filtered.filter(r => r.status !== 'CONFIRMED').length}</span>
          </div>
          <div className="pr-ps-cell pr-ps-accent">
            <span className="pr-ps-label">Total Amount</span>
            <span className="pr-ps-value pr-ps-money">₹{filtered.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
        <table className="pr-pt">
          <thead>
            <tr>
              <th className="pr-pt-th pr-pt-sr">Sr.</th>
              <th className="pr-pt-th">Voucher No.</th>
              <th className="pr-pt-th">Date</th>
              <th className="pr-pt-th">Deposited From</th>
              <th className="pr-pt-th">Particulars</th>
              <th className="pr-pt-th pr-pt-r">Amount (₹)</th>
              <th className="pr-pt-th pr-pt-c">Mode</th>
              <th className="pr-pt-th pr-pt-c">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((rec, i) => (
              <tr key={rec.id} className={i % 2 === 1 ? 'pr-pt-alt' : ''}>
                <td className="pr-pt-td pr-pt-sr">{i + 1}</td>
                <td className="pr-pt-td pr-pt-bold pr-pt-blue">{rec.voucherNo}</td>
                <td className="pr-pt-td">{rec.depositDate ? new Date(rec.depositDate).toLocaleDateString('en-IN') : '—'}</td>
                <td className="pr-pt-td pr-pt-bold">{rec.depositedFrom || '—'}</td>
                <td className="pr-pt-td">{rec.particulars || '—'}</td>
                <td className="pr-pt-td pr-pt-r pr-pt-bold">₹{(rec.amount || 0).toLocaleString('en-IN')}</td>
                <td className="pr-pt-td pr-pt-c">{rec.mode || '—'}</td>
                <td className="pr-pt-td pr-pt-c">
                  <span className={rec.status === 'CONFIRMED' ? 'pr-pt-badge-green' : 'pr-pt-badge-yellow'}>{rec.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pr-pf-row">
          {/* <span>Generated by Smart STS · {today}, {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span> */}
          <div className="pr-pf-sig">Authorised Signatory</div>
        </div>
      </div>
    </PettyCashLayout>
  );
}
