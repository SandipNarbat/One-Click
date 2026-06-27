// server/index.js
const express = require('express');
const cors    = require('cors');
const app     = express();

app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────
app.use('/api/suppliers',      require('./routes/supplier'));
app.use('/api/customers',      require('./routes/customer'));
app.use('/api/products',       require('./routes/product'));
app.use('/api/items',          require('./routes/item'));
app.use('/api/salespersons',   require('./routes/salesperson'));
app.use('/api/servicecenters', require('./routes/servicecenter'));
app.use('/api/doa',            require('./routes/doa'));
app.use('/api/pricedrop',      require('./routes/pricedrop'));
app.use('/api/change',         require('./routes/change'));
app.use('/api/report',         require('./routes/report'));
app.use('/api/purchases',      require('./routes/purchase.route'));
app.use('/api/vouchers',       require('./routes/voucher.route'));
app.use('/api/pettycash',      require('./routes/pettycash.route'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Error handler ─────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ SMART STS Server running on http://localhost:${PORT}`);
});

module.exports = app;
