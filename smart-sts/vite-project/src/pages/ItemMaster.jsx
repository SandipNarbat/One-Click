// src/pages/ItemMaster.jsx
import { useState, useEffect, useCallback } from 'react';
import { itemAPI, productAPI, supplierAPI } from '../api/axios';

const EMPTY_FORM = {
  productId: '', supplierId: '', model: '', brand: '',
  colour: '', imeiNo: '', dp: '', salePrice: '', tax: '', quantity: ''
};

export default function ItemMaster() {
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [items,     setItems]     = useState([]);
  const [products,  setProducts]  = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [nextId,    setNextId]    = useState('ITM-0001');
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState(null);
  const [search,    setSearch]    = useState('');

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).replace(/ /g, '/');

  // ── Data loading ─────────────────────────
  const loadItems = useCallback(async () => {
    try {
      const res = await itemAPI.getAll();
      setItems(res.data);
    } catch (e) { showToast('error', e.message); }
  }, []);

  const loadNextId = useCallback(async () => {
    try {
      const res = await itemAPI.getNextId();
      setNextId(res.data);
    } catch {}
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const res = await productAPI.getAll();
      setProducts(res.data);
    } catch {}
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await supplierAPI.getAll();
      setSuppliers(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    loadItems();
    loadNextId();
    loadProducts();
    loadSuppliers();
  }, [loadItems, loadNextId, loadProducts, loadSuppliers]);

  // ── Toast ─────────────────────────────────
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Form handlers ─────────────────────────
  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSelect = (item) => {
    setSelected(item);
    setForm({
      productId:  item.productId  ? String(item.productId)  : '',
      supplierId: item.supplierId ? String(item.supplierId) : '',
      model:      item.model      || '',
      brand:      item.brand      || '',
      colour:     item.colour     || '',
      imeiNo:     item.imeiNo     || '',
      dp:         item.dp != null         ? String(item.dp)        : '',
      salePrice:  item.salePrice != null  ? String(item.salePrice) : '',
      tax:        item.tax        || '',
      quantity:   item.quantity != null    ? String(item.quantity)  : '',
    });
  };

  const handleClear = () => {
    setForm(EMPTY_FORM);
    setSelected(null);
  };

  // ── CRUD ──────────────────────────────────
  const handleAdd = async () => {
    if (!form.productId) return showToast('error', 'Product is required');
    setLoading(true);
    try {
      await itemAPI.create(form);
      showToast('success', 'Item added successfully');
      handleClear();
      loadItems();
      loadNextId();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!selected) return showToast('error', 'Select an item to update');
    setLoading(true);
    try {
      await itemAPI.update(selected.id, form);
      showToast('success', 'Item updated');
      handleClear();
      loadItems();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selected) return showToast('error', 'Select an item to delete');
    if (!window.confirm(`Delete "${selected.itemId}"?`)) return;
    setLoading(true);
    try {
      await itemAPI.delete(selected.id);
      showToast('success', 'Item deleted');
      handleClear();
      loadItems();
      loadNextId();
    } catch (e) { showToast('error', e.message); }
    finally { setLoading(false); }
  };

  const handlePrint = () => window.print();

  // ── Filtered list ─────────────────────────
  const filtered = items.filter(it => {
    const q = search.toLowerCase();
    return (
      it.itemId.toLowerCase().includes(q) ||
      (it.model  || '').toLowerCase().includes(q) ||
      (it.brand  || '').toLowerCase().includes(q) ||
      (it.colour || '').toLowerCase().includes(q) ||
      (it.imeiNo || '').toLowerCase().includes(q) ||
      (it.product?.productName || '').toLowerCase().includes(q) ||
      (it.supplier?.supplierName || '').toLowerCase().includes(q)
    );
  });

  const s = styles;

  return (
    <div style={s.page}>
      {/* Toast */}
      {toast && (
        <div style={{ ...s.toast, background: toast.type === 'success' ? '#10b981' : '#ef4444' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Item Master</h1>
          <p style={s.subtitle}>Manage individual stock items with IMEI, pricing & supplier info</p>
        </div>
        <div style={s.entryDate}>
          <span style={s.entryLabel}>ENTRY DATE</span>
          <span style={s.entryValue}>{today}</span>
        </div>
      </div>

      {/* Main content — Split layout */}
      <div style={s.splitWrap}>

        {/* LEFT — Form */}
        <div style={{ ...s.card, flex: '0 0 420px' }}>

          {/* Item ID (auto) */}
          <div style={{ ...s.field, marginBottom: 16 }}>
            <label style={s.label}>ITEM ID</label>
            <input style={{ ...s.input, ...s.inputDisabled }}
              value={selected ? selected.itemId : nextId} readOnly />
          </div>

          {/* Product & Supplier selects */}
          <div style={{ ...s.row, marginBottom: 16 }}>
            <div style={s.field}>
              <label style={s.label}>PRODUCT *</label>
              <select style={s.select} name="productId" value={form.productId} onChange={handleChange}>
                <option value="">Select Product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.productName}</option>
                ))}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>SUPPLIER</label>
              <select style={s.select} name="supplierId" value={form.supplierId} onChange={handleChange}>
                <option value="">Select Supplier...</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.supplierName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Model & Brand */}
          <div style={{ ...s.row, marginBottom: 16 }}>
            <div style={s.field}>
              <label style={s.label}>MODEL</label>
              <input style={s.input} name="model" value={form.model}
                onChange={handleChange} placeholder="e.g. Eco Volt Neo" />
            </div>
            <div style={s.field}>
              <label style={s.label}>BRAND</label>
              <input style={s.input} name="brand" value={form.brand}
                onChange={handleChange} placeholder="e.g. Samsung" />
            </div>
          </div>

          {/* Colour & IMEI */}
          <div style={{ ...s.row, marginBottom: 16 }}>
            <div style={s.field}>
              <label style={s.label}>COLOUR</label>
              <input style={s.input} name="colour" value={form.colour}
                onChange={handleChange} placeholder="e.g. Phantom Black" />
            </div>
            <div style={s.field}>
              <label style={s.label}>IMEI NO.</label>
              <input style={s.input} name="imeiNo" value={form.imeiNo}
                onChange={handleChange} placeholder="15-digit IMEI" maxLength={15} />
            </div>
          </div>

          {/* Pricing section */}
          <div style={s.sectionLabel}>PRICING & STOCK</div>

          <div style={{ ...s.row, marginBottom: 16 }}>
            <div style={s.field}>
              <label style={s.label}>DEALER PRICE (DP)</label>
              <div style={s.priceWrap}>
                <span style={s.pricePrefix}>₹</span>
                <input style={{ ...s.input, flex: 1, borderRadius: '0 6px 6px 0' }}
                  name="dp" type="number" value={form.dp}
                  onChange={handleChange} placeholder="0.00" />
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>SALE PRICE</label>
              <div style={s.priceWrap}>
                <span style={s.pricePrefix}>₹</span>
                <input style={{ ...s.input, flex: 1, borderRadius: '0 6px 6px 0' }}
                  name="salePrice" type="number" value={form.salePrice}
                  onChange={handleChange} placeholder="0.00" />
              </div>
            </div>
          </div>

          <div style={{ ...s.row, marginBottom: 20 }}>
            <div style={s.field}>
              <label style={s.label}>TAX</label>
              <input style={s.input} name="tax" value={form.tax}
                onChange={handleChange} placeholder="e.g. Standard (20%)" />
            </div>
            <div style={s.field}>
              <label style={s.label}>QUANTITY</label>
              <input style={s.input} name="quantity" type="number" value={form.quantity}
                onChange={handleChange} placeholder="0" min="0" />
            </div>
          </div>

          {/* Margin indicator */}
          {form.dp && form.salePrice && (
            <div style={s.marginBar}>
              <span style={s.marginLabel}>MARGIN</span>
              <span style={{
                ...s.marginValue,
                color: (parseFloat(form.salePrice) - parseFloat(form.dp)) >= 0 ? '#4ade80' : '#f87171'
              }}>
                ₹{(parseFloat(form.salePrice) - parseFloat(form.dp)).toFixed(2)}
                {' '}
                ({((parseFloat(form.salePrice) - parseFloat(form.dp)) / parseFloat(form.dp) * 100).toFixed(1)}%)
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleAdd} disabled={loading}>+ ADD</button>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={handleSave} disabled={loading}>✎ UPDATE</button>
            <button style={{ ...s.btn, ...s.btnDanger }} onClick={handleDelete} disabled={loading}>🗑 DELETE</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={handleClear}>⊘ CLEAR</button>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={handlePrint}>🖨 PRINT</button>
          </div>
        </div>

        {/* RIGHT — Items Directory Table */}
        <div style={{ ...s.card, flex: 1 }}>
          <div style={s.tableHeader}>
            <span style={s.tableTitle}>Item Directory ({filtered.length})</span>
            <input style={{ ...s.input, width: 240, margin: 0 }}
              placeholder="Search by ID, model, brand, IMEI..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Sr.', 'Item ID', 'Product', 'Model', 'Brand', 'Colour', 'IMEI', 'DP (₹)', 'Sale (₹)', 'Qty'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} style={s.empty}>No items found</td></tr>
                ) : filtered.map((it, i) => (
                  <tr key={it.id}
                    style={{ ...s.tr, ...(selected?.id === it.id ? s.trSelected : {}) }}
                    onClick={() => handleSelect(it)}>
                    <td style={s.td}>{i + 1}</td>
                    <td style={{ ...s.td, color: '#60a5fa' }}>{it.itemId}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{it.product?.productName || '—'}</td>
                    <td style={s.td}>{it.model || '—'}</td>
                    <td style={s.td}>{it.brand || '—'}</td>
                    <td style={s.td}>{it.colour || '—'}</td>
                    <td style={{ ...s.td, fontSize: 11, fontFamily: 'monospace' }}>{it.imeiNo || '—'}</td>
                    <td style={s.td}>{it.dp != null ? it.dp.toLocaleString('en-IN') : '—'}</td>
                    <td style={s.td}>{it.salePrice != null ? it.salePrice.toLocaleString('en-IN') : '—'}</td>
                    <td style={s.td}>
                      <span style={{
                        ...s.badge,
                        background: it.quantity > 0 ? '#1a3a2a' : '#3a1a1a',
                        color: it.quantity > 0 ? '#4ade80' : '#f87171',
                      }}>
                        {it.quantity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={s.tableFooter}>Showing {filtered.length} records</div>
        </div>
      </div>
    </div>
  );
}

// ── Inline styles matching dark theme ─────
const styles = {
  page:         { padding: '24px', color: '#e2e8f0', fontFamily: "'Courier New', monospace" },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title:        { fontSize: 26, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  subtitle:     { fontSize: 13, color: '#64748b', margin: '4px 0 0' },
  entryDate:    { textAlign: 'right' },
  entryLabel:   { display: 'block', fontSize: 11, color: '#64748b', letterSpacing: 1 },
  entryValue:   { fontSize: 14, color: '#e2e8f0', fontWeight: 600 },
  splitWrap:    { display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' },
  card:         { background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 20, border: '1px solid #334155' },
  row:          { display: 'flex', gap: 16, flexWrap: 'wrap' },
  field:        { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 160 },
  label:        { fontSize: 11, color: '#64748b', letterSpacing: 1, marginBottom: 6 },
  input:        { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  inputDisabled:{ background: '#0d1a2d', color: '#94a3b8' },
  select:       { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', cursor: 'pointer', width: '100%', boxSizing: 'border-box' },
  sectionLabel: { fontSize: 11, color: '#64748b', letterSpacing: 2, marginBottom: 12, marginTop: 8, textTransform: 'uppercase' },
  priceWrap:    { display: 'flex' },
  pricePrefix:  { background: '#1e293b', border: '1px solid #334155', borderRight: 'none', borderRadius: '6px 0 0 6px', padding: '10px 12px', color: '#94a3b8', fontSize: 14 },
  marginBar:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', borderRadius: 6, padding: '8px 14px', marginBottom: 8, border: '1px solid #334155' },
  marginLabel:  { fontSize: 11, color: '#64748b', letterSpacing: 1 },
  marginValue:  { fontSize: 14, fontWeight: 700 },
  btn:          { padding: '9px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnPrimary:   { background: '#6366f1', color: '#fff' },
  btnSecondary: { background: '#0f172a', color: '#94a3b8', border: '1px solid #334155' },
  btnDanger:    { background: 'transparent', color: '#f87171', border: '1px solid #f87171' },
  tableHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  tableTitle:   { fontSize: 15, fontWeight: 600, color: '#e2e8f0' },
  tableWrap:    { overflowX: 'auto' },
  table:        { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:           { padding: '10px 14px', textAlign: 'left', color: '#60a5fa', fontSize: 11, letterSpacing: 1, borderBottom: '1px solid #334155', textTransform: 'uppercase', whiteSpace: 'nowrap' },
  tr:           { borderBottom: '1px solid #1e293b', cursor: 'pointer' },
  trSelected:   { background: '#1e3a5f' },
  td:           { padding: '10px 14px', color: '#cbd5e1', whiteSpace: 'nowrap' },
  badge:        { padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 },
  empty:        { textAlign: 'center', padding: 40, color: '#475569' },
  tableFooter:  { fontSize: 12, color: '#475569', marginTop: 12 },
  toast:        { position: 'fixed', top: 20, right: 20, padding: '12px 24px', borderRadius: 8, color: '#fff', fontWeight: 600, zIndex: 9999, fontSize: 14 },
};
