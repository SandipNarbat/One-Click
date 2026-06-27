// server/routes/supplier.js
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper: generate next Supplier ID
async function generateSupplierId() {
  const last = await prisma.supplier.findFirst({ orderBy: { id: 'desc' } });
  if (!last) return 'SUP-0001';
  const num = parseInt(last.supplierId.split('-')[1]) + 1;
  return `SUP-${String(num).padStart(4, '0')}`;
}

// GET all suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: suppliers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single supplier by ID
router.get('/:id', async (req, res) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    if (!supplier) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: supplier });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET next supplier ID (for auto-fill on form)
router.get('/generate/next-id', async (req, res) => {
  try {
    const nextId = await generateSupplierId();
    res.json({ success: true, data: nextId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create supplier
router.post('/', async (req, res) => {
  try {
    const {
      supplierName, contactPerson, email,
      mobile, landline, address, state,
      gstTin, aadharNo, panNo
    } = req.body;

    if (!supplierName) {
      return res.status(400).json({ success: false, error: 'Supplier name is required' });
    }

    const supplierId = await generateSupplierId();
    const supplier = await prisma.supplier.create({
      data: {
        supplierId, supplierName, contactPerson,
        email, mobile, landline, address, state,
        gstTin, aadharNo, panNo
      }
    });
    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Supplier already exists' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update supplier
router.put('/:id', async (req, res) => {
  try {
    const {
      supplierName, contactPerson, email,
      mobile, landline, address, state,
      gstTin, aadharNo, panNo
    } = req.body;

    const supplier = await prisma.supplier.update({
      where: { id: parseInt(req.params.id) },
      data: {
        supplierName, contactPerson, email,
        mobile, landline, address, state,
        gstTin, aadharNo, panNo
      }
    });
    res.json({ success: true, data: supplier });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE supplier
router.delete('/:id', async (req, res) => {
  try {
    await prisma.supplier.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ success: true, message: 'Supplier deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SEARCH suppliers
router.get('/search/:query', async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: {
        OR: [
          { supplierName: { contains: req.params.query } },
          { supplierId:   { contains: req.params.query } },
        ]
      }
    });
    res.json({ success: true, data: suppliers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
