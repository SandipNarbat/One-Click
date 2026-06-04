// server/index.js
const express = require('express');
const cors    = require('cors');
const app     = express();

app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────
app.use('/api/suppliers',  require('./routes/supplier'));
app.use('/api/customers',  require('./routes/customer'));
app.use('/api/products',   require('./routes/product'));

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
