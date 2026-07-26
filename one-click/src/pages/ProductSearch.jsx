// src/pages/AllProduct.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { purchaseAPI, supplierAPI } from '../api/axios';
import PurchaseLayout from '../components/PurchaseLayout';
import '../styles/masterStyles.css';
import './PurchaseMaster.css';

const TABS = [
  { key: 'purchaseNo', label: 'Purchase / Invoice No' },
  { key: 'date', label: 'Received Date' },
  { key: 'supplier', label: 'Supplier Name' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'imei', label: 'IMEI / Serial No.' },
];

const TabIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2.59 12.58a2 2 0 0 1 0-2.83l7.17-7.17A2 2 0 0 1 11.17 2H18a2 2 0 0 1 2 2v6.83a2 2 0 0 1-.59 1.41z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>
);

export default function AllProduct() {
  const navigate = useNavigate();

  const [allPurchases, setAllPurchases] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [activeTab, setActiveTab] = useState('purchaseNo');
  const [searchText, setSearchText] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [openId, setOpenId] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).replace(/ /g, '/');

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await purchaseAPI.getAll();
      setAllPurchases(res.data || []);
      // setPurchases(res.data || []);
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try { const res = await supplierAPI.getAll(); setSuppliers(res.data || []); } catch { }
  }, []);

  useEffect(() => { loadPurchases(); loadSuppliers(); }, [loadPurchases, loadSuppliers]);

  const resetTabInputs = () => {
    setSearchText('');
    setFromDate('');
    setToDate('');
    setSupplierId('');
    setHasSearched(false);
    // setPurchases(allPurchases);
    setPurchases([]);
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    resetTabInputs();
  };

  const runSearch = () => {
    let results = allPurchases;

    if (activeTab === 'purchaseNo') {
      if (!searchText.trim()) return showToast('error', 'Enter a Purchase No or Invoice No');
      const q = searchText.trim().toLowerCase();
      results = allPurchases.filter(p =>
        p.purchaseNo?.toLowerCase().includes(q) || p.invoiceNo?.toLowerCase().includes(q)
      );

    } else if (activeTab === 'date') {
      if (!fromDate || !toDate) return showToast('error', 'Select both From and To dates');
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      results = allPurchases.filter(p => {
        if (!p.invoiceDate) return false;
        const d = new Date(p.invoiceDate);
        return d >= from && d <= to;
      });

    } else if (activeTab === 'supplier') {
      if (!supplierId) return showToast('error', 'Select a supplier');
      results = allPurchases.filter(p => String(p.supplierId) === String(supplierId));

    } else if (activeTab === 'barcode') {
      if (!searchText.trim()) return showToast('error', 'Enter a barcode');
      const q = searchText.trim().toLowerCase();
      results = allPurchases.filter(p =>
        p.purchaseItems?.some(it => it.barcode?.toLowerCase().includes(q))
      );

    } else if (activeTab === 'imei') {
      if (!searchText.trim()) return showToast('error', 'Enter an IMEI / Serial No.');
      const q = searchText.trim().toLowerCase();
      results = allPurchases.filter(p =>
        p.purchaseItems?.some(it => it.imeis?.some(im => im.trackingNumber?.toLowerCase().includes(q)))
      );
    }

    setHasSearched(true);
    setPurchases(results);
  };

  const clearSearch = () => {
    resetTabInputs();
  };

  const handleOpenById = () => {
    if (!openId.trim()) return showToast('error', 'Enter a Purchase ID');
    navigate(`/purchase/entry/${openId.trim()}`);
  };

  const resultsLabel = useMemo(() => {
    if (!hasSearched) return `${purchases.length} Record${purchases.length !== 1 ? 's' : ''}`;
    return `${purchases.length} Record${purchases.length !== 1 ? 's' : ''} Found`;
  }, [purchases.length, hasSearched]);

  return (
    <PurchaseLayout>
      {toast && (
        <div className={`ms-toast ms-toast-${toast.type}`}>{toast.msg}</div>
      )}

      <div className="ms-page">

        {/* ── Page Header ───────────────────────── */}
        <div className="ms-page-header">
          <div>
            <h1 className="ms-page-title">Purchase Search</h1>
            <p className="ms-page-subtitle">Search purchase orders using multiple options</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="pm-search-row">
              <input className="ms-input m-0 pm-id-input"
                placeholder="Open Purchase by ID…"
                value={openId}
                onChange={e => setOpenId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleOpenById()} />
              <button className="ms-btn ms-btn-edit" onClick={handleOpenById} disabled={loading}>OPEN</button>
            </div>
            <Link to="/purchase/entry" className="ms-btn ms-btn-add">
              <span>+</span> NEW PURCHASE
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
                    border: active ? '1.5px solid #6d5bd0' : '1px solid #e2e2ea',
                    background: active ? '#f2f0ff' : '#fff',
                    color: active ? '#5b3fd6' : '#374151',
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

              {activeTab === 'purchaseNo' && (
                <div className="ms-field" style={{ minWidth: 320, flex: 1 }}>
                  <label className="ms-label">Purchase No / Invoice No</label>
                  <input className="ms-input"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runSearch()}
                    placeholder="e.g. PUR-0012 or INV-0045" />
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

              {activeTab === 'supplier' && (
                <div className="ms-field" style={{ minWidth: 320, flex: 1 }}>
                  <label className="ms-label">Supplier Name</label>
                  <select className="ms-select" value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}>
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.supplierId} — {s.supplierName}</option>
                    ))}
                  </select>
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
                  {['Sr.', 'Purchase No', 'Type', 'Invoice No', 'Invoice Date', 'Supplier', 'Items', 'Qty', 'Net Amount', 'Status'].map(h => (
                    <th key={h} className="ms-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  // <tr><td colSpan={10} className="ms-empty">No purchases found</td></tr>
                  <tr><td colSpan = {10} className="ms-empty">
                    {hasSearched ? 'No Purchases found for this search' : 'Choose a search option above and click SEARCH to view results'}
                     </td></tr>
                ) : purchases.map((p, i) => (
                  <tr key={p.id}
                    className="ms-tr"
                    onClick={() => navigate(`/purchase/entry/${p.id}`)}>
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
            Total Records : {purchases.length} · Click a row to open it in Purchase Entry
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
              {hasSearched ? <span className="pm-ph-filter">Filtered results &nbsp;·&nbsp; </span> : null}
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

    </PurchaseLayout>
  );
}
