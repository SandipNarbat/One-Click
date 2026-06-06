// server/routes/doa.js
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET all DOA records (optionally filtered by supplier)
router.get('/', async (req, res) => {
  try {
    const { supplierId } = req.query;
    const where = supplierId ? { supplierId: parseInt(supplierId) } : {};
    const data = await prisma.dOARecord.findMany({
      where,
      include: { supplier: { select: { supplierId: true, supplierName: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET single DOA record
router.get('/:id', async (req, res) => {
  try {
    const data = await prisma.dOARecord.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { supplier: true }
    });
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET DOA records by supplier ID
router.get('/supplier/:supplierId', async (req, res) => {
  try {
    const data = await prisma.dOARecord.findMany({
      where: { supplierId: parseInt(req.params.supplierId) },
      include: { supplier: { select: { supplierId: true, supplierName: true } } },
      orderBy: { invoiceDate: 'desc' }
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST create DOA record
router.post('/', async (req, res) => {
  try {
    const { supplierId, invoiceNo, invoiceDate, totalQty, totalAmount, itemId, productName } = req.body;

    if (!supplierId || !invoiceNo || !invoiceDate) {
      return res.status(400).json({ success: false, error: 'Supplier, invoice no and date are required' });
    }

    // Check for duplicate invoice number
    const existing = await prisma.dOARecord.findFirst({ where: { invoiceNo } });
    if (existing) {
      return res.status(409).json({ success: false, error: `Invoice ${invoiceNo} already exists` });
    }

    const data = await prisma.dOARecord.create({
      data: {
        supplierId: parseInt(supplierId),
        invoiceNo,
        invoiceDate: new Date(invoiceDate),
        totalQty: parseInt(totalQty) || 0,
        totalAmount: parseFloat(totalAmount) || 0,
        itemId,
        productName
      },
      include: { supplier: { select: { supplierId: true, supplierName: true } } }
    });
    res.status(201).json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PUT update DOA record
router.put('/:id', async (req, res) => {
  try {
    const { invoiceNo, invoiceDate, totalQty, totalAmount, itemId, productName } = req.body;
    const data = await prisma.dOARecord.update({
      where: { id: parseInt(req.params.id) },
      data: {
        invoiceNo,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
        totalQty: totalQty ? parseInt(totalQty) : undefined,
        totalAmount: totalAmount ? parseFloat(totalAmount) : undefined,
        itemId,
        productName
      },
      include: { supplier: { select: { supplierId: true, supplierName: true } } }
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// DELETE DOA record
router.delete('/:id', async (req, res) => {
  try {
    await prisma.dOARecord.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'DOA record deleted' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET summary stats for a supplier
router.get('/stats/supplier/:supplierId', async (req, res) => {
  try {
    const records = await prisma.dOARecord.findMany({
      where: { supplierId: parseInt(req.params.supplierId) }
    });
    const totalQty    = records.reduce((s, r) => s + r.totalQty, 0);
    const totalAmount = records.reduce((s, r) => s + r.totalAmount, 0);
    res.json({ success: true, data: { count: records.length, totalQty, totalAmount } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
