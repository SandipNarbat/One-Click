// server/routes/servicecenter.js
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper: generate next serial no
async function generateSerialNo() {
  const last = await prisma.serviceCenter.findFirst({ orderBy: { id: 'desc' } });
  if (!last) return 'SC-001';
  const num = parseInt(last.serialNo.split('-')[1]) + 1;
  return `SC-${String(num).padStart(3, '0')}`;
}

// GET all
router.get('/', async (req, res) => {
  try {
    const data = await prisma.serviceCenter.findMany({ orderBy: { id: 'asc' } });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET single
router.get('/:id', async (req, res) => {
  try {
    const data = await prisma.serviceCenter.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET next serial no
router.get('/generate/next-serial', async (req, res) => {
  try {
    const next = await generateSerialNo();
    res.json({ success: true, data: next });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET all product types (for dropdown)
router.get('/options/product-types', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      select: { id: true, productName: true, productType: true }
    });
    res.json({ success: true, data: products });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET all brands from items (for dropdown)
router.get('/options/brands', async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      select: { brand: true },
      distinct: ['brand'],
      where: { brand: { not: null } }
    });
    res.json({ success: true, data: items.map(i => i.brand) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST create
router.post('/', async (req, res) => {
  try {
    const { productType, brandName, serviceCentreNo } = req.body;
    if (!productType || !brandName) {
      return res.status(400).json({ success: false, error: 'Product type and brand are required' });
    }
    const serialNo = await generateSerialNo();
    const data = await prisma.serviceCenter.create({
      data: { serialNo, productType, brandName, serviceCentreNo }
    });
    res.status(201).json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const { productType, brandName, serviceCentreNo } = req.body;
    const data = await prisma.serviceCenter.update({
      where: { id: parseInt(req.params.id) },
      data: { productType, brandName, serviceCentreNo }
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await prisma.serviceCenter.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Service center deleted' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
