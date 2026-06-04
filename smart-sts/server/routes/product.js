// server/routes/product.js
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper: generate next product code
async function generateProdCode() {
  const last = await prisma.product.findFirst({ orderBy: { id: 'desc' } });
  if (!last) return '1';
  return String(parseInt(last.prodCode) + 1);
}

// ─── PRODUCT ROUTES ───────────────────────────────────

// GET all products
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { id: 'asc' },
      include: { _count: { select: { items: true } } }
    });
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { items: true }
    });
    if (!product) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create product
router.post('/', async (req, res) => {
  try {
    const {
      productName, productType, hsnCode,
      productCategory, gstPercentage, organisation
    } = req.body;

    if (!productName || !productType) {
      return res.status(400).json({ success: false, error: 'Product name and type are required' });
    }

    const prodCode = await generateProdCode();
    const product = await prisma.product.create({
      data: {
        prodCode, productName,
        productType: productType.toUpperCase(),
        hsnCode, productCategory,
        gstPercentage: gstPercentage ? parseFloat(gstPercentage) : null,
        organisation
      }
    });
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update product
router.put('/:id', async (req, res) => {
  try {
    const {
      productName, productType, hsnCode,
      productCategory, gstPercentage, organisation
    } = req.body;

    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: {
        productName,
        productType: productType?.toUpperCase(),
        hsnCode, productCategory,
        gstPercentage: gstPercentage ? parseFloat(gstPercentage) : null,
        organisation
      }
    });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE product
router.delete('/:id', async (req, res) => {
  try {
    // Check if product has items before deleting
    const itemCount = await prisma.item.count({
      where: { productId: parseInt(req.params.id) }
    });
    if (itemCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete: ${itemCount} items linked to this product`
      });
    }

    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SEARCH products
router.get('/search/:query', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { productName: { contains: req.params.query, mode: 'insensitive' } },
          { prodCode:    { contains: req.params.query } },
          { hsnCode:     { contains: req.params.query } },
        ]
      }
    });
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── ITEM ROUTES (nested under product) ──────────────

// GET all items for a product
router.get('/:id/items', async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      where: { productId: parseInt(req.params.id) },
      include: { supplier: true }
    });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
