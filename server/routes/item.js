// server/routes/item.js
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper: generate next Item ID  (ITM-0001, ITM-0002 …)
async function generateItemId() {
  const last = await prisma.item.findFirst({ orderBy: { id: 'desc' } });
  if (!last) return 'ITM-0001';
  const num = parseInt(last.itemId.split('-')[1]) + 1;
  return `ITM-${String(num).padStart(4, '0')}`;
}

// GET all items
router.get('/', async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      orderBy: { createdAt: 'desc' },
      include: { product: true, supplier: true }
    });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET next item ID (for auto-fill on form)
router.get('/generate/next-id', async (req, res) => {
  try {
    const nextId = await generateItemId();
    res.json({ success: true, data: nextId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single item by ID
router.get('/:id', async (req, res) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { product: true, supplier: true, priceHistory: true }
    });
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create item
router.post('/', async (req, res) => {
  try {
    const {
      productId, supplierId, model, brand,
      colour, imeiNo, dp, salePrice, tax, quantity
    } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product is required' });
    }

    const itemId = await generateItemId();
    const item = await prisma.item.create({
      data: {
        itemId,
        productId:  parseInt(productId),
        supplierId: supplierId ? parseInt(supplierId) : null,
        model,
        brand,
        colour,
        imeiNo:     imeiNo || null,
        dp:         dp ? parseFloat(dp) : null,
        salePrice:  salePrice ? parseFloat(salePrice) : null,
        tax,
        quantity:   quantity ? parseInt(quantity) : 0
      },
      include: { product: true, supplier: true }
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Duplicate entry (IMEI may already exist)' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update item
router.put('/:id', async (req, res) => {
  try {
    const {
      productId, supplierId, model, brand,
      colour, imeiNo, dp, salePrice, tax, quantity
    } = req.body;

    const item = await prisma.item.update({
      where: { id: parseInt(req.params.id) },
      data: {
        productId:  productId  ? parseInt(productId)  : undefined,
        supplierId: supplierId ? parseInt(supplierId) : null,
        model,
        brand,
        colour,
        imeiNo:     imeiNo || null,
        dp:         dp ? parseFloat(dp) : null,
        salePrice:  salePrice ? parseFloat(salePrice) : null,
        tax,
        quantity:   quantity != null ? parseInt(quantity) : undefined
      },
      include: { product: true, supplier: true }
    });
    res.json({ success: true, data: item });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Duplicate entry (IMEI may already exist)' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE item
router.delete('/:id', async (req, res) => {
  try {
    // Check if item has price history before deleting
    const historyCount = await prisma.priceHistory.count({
      where: { itemId: parseInt(req.params.id) }
    });
    if (historyCount > 0) {
      // Delete price history first, then delete item
      await prisma.priceHistory.deleteMany({
        where: { itemId: parseInt(req.params.id) }
      });
    }

    await prisma.item.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SEARCH items
router.get('/search/:query', async (req, res) => {
  try {
    const q = req.params.query;
    const items = await prisma.item.findMany({
      where: {
        OR: [
          { itemId:  { contains: q } },
          { model:   { contains: q } },
          { brand:   { contains: q } },
          { colour:  { contains: q } },
          { imeiNo:  { contains: q } },
        ]
      },
      include: { product: true, supplier: true }
    });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
