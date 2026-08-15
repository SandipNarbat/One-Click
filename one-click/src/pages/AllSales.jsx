// src/pages/AllSales.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { saleAPI, customerAPI } from '../api/axios';
import Saleslayout from '../components/Saleslayout';
import '../styles/masterStyles.css';
import './AllSales.css';

const TABS = [
  { key: 'invoiceNo', label: 'Invoice / Reference No' },
  { key: 'mobile', label: 'Mobile No' },
  { key: 'date', label: 'Invoice Date' },
  { key: 'customer', label: 'Customer Name' },
  { key: 'imei', label: 'IMEI / Serial No.' },
  { key: 'finance', label: 'Finance' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'model', label: 'Model' },
];

const TabIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2.59 12.58a2 2 0 0 1 0-2.83l7.17-7.17A2 2 0 0 1 11.17 2H18a2 2 0 0 1 2 2v6.83a2 2 0 0 1-.59 1.41z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>
);

export default function AllSales() {
  const navigate = useNavigate();

  const [allSales, setAllSales] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [activeTab, setActiveTab] = useState('invoiceNo');
  const [searchText, setSearchText] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [openId, setOpenId] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).replace(/ /g, '/');

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await saleAPI.getAll();
      setAllSales(res.data || []);
      setSales(res.data || []);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  }, []);

  const loadCustomers = useCallback(async () => {
    try { const res = await customerAPI.getAll(); setCustomers(res.data || []); } catch { }
  }, []);

  useEffect(() => { loadSales(); loadCustomers(); }, [loadSales, loadCustomers]);

  const resetTabInputs = () => {
    setSearchText('');
    setFromDate('');
    setToDate('');
    setCustomerId('');
    setHasSearched(false);
    setSales(allSales);
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    resetTabInputs();
  };

  const runSearch = () => {
    let results = allSales;

    if (activeTab === 'invoiceNo') {
      if (!searchText.trim()) return showToast('error', 'Enter an Invoice No or Reference No');
      const q = searchText.trim().toLowerCase();
      results = allSales.filter(s =>
        s.invoiceNo?.toLowerCase().includes(q) || s.referenceNo?.toLowerCase().includes(q)
      );

    } else if (activeTab === 'date') {
      if (!fromDate || !toDate) return showToast('error', 'Select both From and To dates');
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      results = allSales.filter(s => {
        if (!s.invoiceDate) return false;
        const d = new Date(s.invoiceDate);
        return d >= from && d <= to;
      });

    } else if (activeTab === 'customer') {
      if (!customerId) return showToast('error', 'Select a customer');
      results = allSales.filter(s => String(s.customerId) === String(customerId));

    } else if (activeTab === 'imei') {
      if (!searchText.trim()) return showToast('error', 'Enter an IMEI / Serial No.');
      const q = searchText.trim().toLowerCase();
      results = allSales.filter(s =>
        s.saleItems?.some(it => it.imeis?.some(im => im.trackingNumber?.toLowerCase().includes(q)))
      );

    } else if (activeTab === 'mobile') {
      if (!searchText.trim()) return showToast('error', 'Enter a mobile number');
      const q = searchText.trim().toLowerCase();
      results = allSales.filter(s => s.customerMobile?.toLowerCase().includes(q));

    } else if (activeTab === 'barcode') {
      if (!searchText.trim()) return showToast('error', 'Enter a barcode');
      const q = searchText.trim().toLowerCase();
      results = allSales.filter(s =>
        s.saleItems?.some(it => it.barcode?.toLowerCase().includes(q))
      );

    } else if (activeTab === 'model') {
      if (!searchText.trim()) return showToast('error', 'Enter a model');
      const q = searchText.trim().toLowerCase();
      results = allSales.filter(s =>
        s.saleItems?.some(it => it.model?.toLowerCase().includes(q))
      );

    } else if (activeTab === 'finance') {
      // With no text entered, show every Finance-mode sale. With text,
      // narrow further by finance company name or document number.
      results = allSales.filter(s => s.paymentType === 'Finance');
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        results = results.filter(s =>
          s.financeName?.toLowerCase().includes(q) || s.docNo?.toLowerCase().includes(q)
        );
      }
    }

    setHasSearched(true);
    setSales(results);
  };

  const clearSearch = () => {
    resetTabInputs();
  };

  const handleOpenById = () => {
    if (!openId.trim()) return showToast('error', 'Enter a Sale ID');
    navigate(`/sales/entry/${openId.trim()}`);
  };

  const resultsLabel = useMemo(() => {
    if (!hasSearched) return `${sales.length} Record${sales.length !== 1 ? 's' : ''}`;
    return `${sales.length} Record${sales.length !== 1 ? 's' : ''} Found`;
  }, [sales.length, hasSearched]);

  return (
    <Saleslayout>
      {toast && (
        <div className={`ms-toast ms-toast-${toast.type}`}>{toast.msg}</div>
      )}

      <div className="ms-page">

        {/* ── Page Header ───────────────────────── */}
        <div className="ms-page-header">
          <div>
            <h1 className="ms-page-title">Sales Search</h1>
            <p className="ms-page-subtitle">Search sales invoices using multiple options</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="se-search-row">
              <input className="ms-input m-0 se-id-input"
                placeholder="Open Sale by ID…"
                value={openId}
                onChange={e => setOpenId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleOpenById()} />
              <button className="ms-btn ms-btn-edit" onClick={handleOpenById} disabled={loading}>OPEN</button>
            </div>
            <Link to="/sales/entry" className="ms-btn ms-btn-add">
              <span>+</span> NEW SALE
            </Link>
            <button className="ms-btn ms-btn-print" onClick={() => window.print()}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
              EXPORT
            </button>
          </div>
        </div>

        {/* ── Search Panel ──────────────────────── */}
        <div className="ms-form-card">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {TABS.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 10,
                    border: active ? '1.5px solid #a855f7' : '1px solid #e2e2ea',
                    background: active ? '#f6effe' : '#fff',
                    color: active ? '#7e22ce' : '#374151',
                    fontWeight: active ? 700 : 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}>
                  <TabIcon />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid #eef0f4', paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>

              {activeTab === 'invoiceNo' && (
                <div className="ms-field" style={{ minWidth: 320, flex: 1 }}>
                  <label className="ms-label">Invoice No / Reference No</label>
                  <input className="ms-input"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runSearch()}
                    placeholder="e.g. INV-0012 or REF-0045" />
                </div>
              )}

              {activeTab === 'date' && (
                <>
                  <div className="ms-field">
                    <label className="ms-label">From Date</label>
                    <input className="ms-input" type="date" value={fromDate}
                      onChange={e => setFromDate(e.target.value)} />
                  </div>
                  <div className="ms-field">
                    <label className="ms-label">To Date</label>
                    <input className="ms-input" type="date" value={toDate}
                      onChange={e => setToDate(e.target.value)} />
                  </div>
                </>
              )}

              {activeTab === 'customer' && (
                <div className="ms-field" style={{ minWidth: 320, flex: 1 }}>
                  <label className="ms-label">Customer Name</label>
                  <select className="ms-select" value={customerId}
                    onChange={e => setCustomerId(e.target.value)}>
                    <option value="">Select Customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.customerId} — {c.customerName}</option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'imei' && (
                <div className="ms-field" style={{ minWidth: 320, flex: 1 }}>
                  <label className="ms-label">IMEI / Serial No.</label>
                  <input className="ms-input"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runSearch()}
                    placeholder="Scan or enter IMEI / Serial No…" />
                </div>
              )}

              {activeTab === 'mobile' && (
                <div className="ms-field" style={{ minWidth: 320, flex: 1 }}>
                  <label className="ms-label">Mobile No</label>
                  <input className="ms-input"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runSearch()}
                    placeholder="e.g. 9876543210" />
                </div>
              )}

              {activeTab === 'barcode' && (
                <div className="ms-field" style={{ minWidth: 320, flex: 1 }}>
                  <label className="ms-label">Barcode</label>
                  <input className="ms-input"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runSearch()}
                    placeholder="Scan or enter barcode…" />
                </div>
              )}

              {activeTab === 'model' && (
                <div className="ms-field" style={{ minWidth: 320, flex: 1 }}>
                  <label className="ms-label">Model</label>
                  <input className="ms-input"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runSearch()}
                    placeholder="e.g. Galaxy A17 5G" />
                </div>
              )}

              {activeTab === 'finance' && (
                <div className="ms-field" style={{ minWidth: 320, flex: 1 }}>
                  <label className="ms-label">Finance Company / Doc No (optional)</label>
                  <input className="ms-input"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runSearch()}
                    placeholder="Leave blank to show all Finance sales" />
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="ms-btn ms-btn-show" onClick={runSearch} disabled={loading}>SEARCH</button>
                <button className="ms-btn ms-btn-clear" onClick={clearSearch}>CLEAR</button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Search Results ────────────────────── */}
        <div className="ms-table-card mt-16">
          <div className="ms-table-header">
            <span className="ms-table-title">
              Search Results
              <span className="ms-badge" style={{ marginLeft: 10 }}>{resultsLabel}</span>
            </span>
          </div>

          <div className="ms-table-wrap">
            <table className="ms-table">
              <thead>
                <tr>
                  {['Sr.', 'Invoice No', 'Type', 'Invoice Date', 'Customer', 'Contact', 'Mode', 'Items', 'Qty', 'Grand Total', 'Status'].map(h => (
                    <th key={h} className="ms-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr><td colSpan={11} className="ms-empty">No sales found</td></tr>
                ) : sales.map((s, i) => (
                  <tr key={s.id}
                    className="ms-tr"
                    onClick={() => navigate(`/sales/entry/${s.id}`)}>
                    <td className="ms-td">{i + 1}</td>
                    <td className="ms-td se-inv-no">{s.invoiceNo}</td>
                    <td className="ms-td">{s.saleType || '—'}</td>
                    <td className="ms-td">
                      {s.invoiceDate ? new Date(s.invoiceDate).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="ms-td">{s.customerName || s.customer?.customerName || '—'}</td>
                    <td className="ms-td">{s.customerMobile || '—'}</td>
                    <td className="ms-td">{s.paymentType || '—'}</td>
                    <td className="ms-td se-center">{s.saleItems?.length ?? 0}</td>
                    <td className="ms-td se-center">{s.totalQty ?? 0}</td>
                    <td className="ms-td se-amount">₹{Number(s.grandTotal).toLocaleString('en-IN')}</td>
                    <td className="ms-td">
                      <span className={`se-badge-${(s.status || 'SAVED').toLowerCase()}`}>
                        {s.status || 'SAVED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ms-table-footer">
            Total Records : {sales.length} · Click a row to open it in Sales Entry
          </div>
        </div>

      </div>

      {/* ── Print-only area ───────────────────── */}
      <div className="se-print-only">

        <div className="se-ph-row">
          <div>
            <div className="se-ph-company">SMART STS</div>
            <div className="se-ph-tagline">Smart Service &amp; Trading Solutions</div>
          </div>
          <div className="se-ph-right">
            <div className="se-ph-title">SALES REPORT</div>
            <div className="se-ph-meta">
              {hasSearched ? <span className="se-ph-filter">Filtered results &nbsp;·&nbsp; </span> : null}
              {sales.length} record{sales.length !== 1 ? 's' : ''} &nbsp;·&nbsp; Printed: {today}
            </div>
          </div>
        </div>
        <div className="se-ph-rule" />

        <div className="se-ps-strip">
          <div className="se-ps-cell">
            <span className="se-ps-label">TOTAL SALES</span>
            <span className="se-ps-value">{sales.length}</span>
          </div>
          <div className="se-ps-cell">
            <span className="se-ps-label">TOTAL ITEMS</span>
            <span className="se-ps-value">{sales.reduce((s, x) => s + (x.saleItems?.length ?? 0), 0)}</span>
          </div>
          <div className="se-ps-cell">
            <span className="se-ps-label">TOTAL QTY</span>
            <span className="se-ps-value">{sales.reduce((s, x) => s + (x.totalQty ?? 0), 0)}</span>
          </div>
          <div className="se-ps-cell">
            <span className="se-ps-label">SUB TOTAL</span>
            <span className="se-ps-value se-ps-money">
              ₹{sales.reduce((s, x) => s + Number(x.subTotal || 0), 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="se-ps-cell">
            <span className="se-ps-label">TOTAL DISCOUNT</span>
            <span className="se-ps-value se-ps-discount">
              −₹{sales.reduce((s, x) => s + Number(x.discountAmount || 0), 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="se-ps-cell se-ps-net">
            <span className="se-ps-label">GRAND TOTAL</span>
            <span className="se-ps-value se-ps-money">
              ₹{sales.reduce((s, x) => s + Number(x.grandTotal || 0), 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <table className="se-pt">
          <colgroup>
            <col className="col-sr" /><col className="col-invno" />
            <col className="col-type" /><col className="col-invdate" />
            <col className="col-cust" /><col className="col-pay" />
            <col className="col-items" /><col className="col-qty" />
            <col className="col-sub" /><col className="col-disc" />
            <col className="col-cgst" /><col className="col-sgst" />
            <col className="col-net" /><col className="col-status" />
          </colgroup>
          <thead>
            <tr>
              <th className="se-pt-th se-pt-sr">Sr.</th>
              <th className="se-pt-th">Invoice No</th>
              <th className="se-pt-th">Type</th>
              <th className="se-pt-th">Invoice Date</th>
              <th className="se-pt-th">Customer</th>
              <th className="se-pt-th">Payment</th>
              <th className="se-pt-th se-pt-c">Items</th>
              <th className="se-pt-th se-pt-c">Qty</th>
              <th className="se-pt-th se-pt-r">Sub Total (₹)</th>
              <th className="se-pt-th se-pt-r">Discount (₹)</th>
              <th className="se-pt-th se-pt-r">CGST (₹)</th>
              <th className="se-pt-th se-pt-r">SGST (₹)</th>
              <th className="se-pt-th se-pt-r">Grand Total (₹)</th>
              <th className="se-pt-th se-pt-c">Status</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s, i) => (
              <tr key={s.id} className={i % 2 === 1 ? 'se-pt-alt' : ''}>
                <td className="se-pt-td se-pt-sr">{i + 1}</td>
                <td className="se-pt-td se-pt-bold se-pt-purple">{s.invoiceNo}</td>
                <td className="se-pt-td">{s.saleType || '—'}</td>
                <td className="se-pt-td">
                  {s.invoiceDate ? new Date(s.invoiceDate).toLocaleDateString('en-GB') : '—'}
                </td>
                <td className="se-pt-td">{s.customerName || '—'}</td>
                <td className="se-pt-td">{s.paymentType || '—'}</td>
                <td className="se-pt-td se-pt-c">{s.saleItems?.length ?? 0}</td>
                <td className="se-pt-td se-pt-c">{s.totalQty ?? 0}</td>
                <td className="se-pt-td se-pt-r">{Number(s.subTotal || 0).toLocaleString('en-IN')}</td>
                <td className="se-pt-td se-pt-r se-pt-disc">{Number(s.discountAmount || 0).toLocaleString('en-IN')}</td>
                <td className="se-pt-td se-pt-r">{Number(s.cgstAmount || 0).toLocaleString('en-IN')}</td>
                <td className="se-pt-td se-pt-r">{Number(s.sgstAmount || 0).toLocaleString('en-IN')}</td>
                <td className="se-pt-td se-pt-r se-pt-bold">{Number(s.grandTotal || 0).toLocaleString('en-IN')}</td>
                <td className="se-pt-td se-pt-c">
                  <span className="se-pt-badge">{s.status || 'SAVED'}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="se-pt-total">
              <td className="se-pt-td" colSpan={6}>
                GRAND TOTAL &mdash; {sales.length} Sale{sales.length !== 1 ? 's' : ''}
              </td>
              <td className="se-pt-td se-pt-c">{sales.reduce((s, x) => s + (x.saleItems?.length ?? 0), 0)}</td>
              <td className="se-pt-td se-pt-c">{sales.reduce((s, x) => s + (x.totalQty ?? 0), 0)}</td>
              <td className="se-pt-td se-pt-r">{sales.reduce((s, x) => s + Number(x.subTotal || 0), 0).toLocaleString('en-IN')}</td>
              <td className="se-pt-td se-pt-r se-pt-disc">{sales.reduce((s, x) => s + Number(x.discountAmount || 0), 0).toLocaleString('en-IN')}</td>
              <td className="se-pt-td se-pt-r">{sales.reduce((s, x) => s + Number(x.cgstAmount || 0), 0).toLocaleString('en-IN')}</td>
              <td className="se-pt-td se-pt-r">{sales.reduce((s, x) => s + Number(x.sgstAmount || 0), 0).toLocaleString('en-IN')}</td>
              <td className="se-pt-td se-pt-r">{sales.reduce((s, x) => s + Number(x.grandTotal || 0), 0).toLocaleString('en-IN')}</td>
              <td className="se-pt-td" />
            </tr>
          </tfoot>
        </table>

        <div className="se-pf-row">
          <span>Generated by Smart STS &nbsp;·&nbsp; {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          <span className="se-pf-sig">Authorised Signatory</span>
        </div>

      </div>

    </Saleslayout>
  );
}
