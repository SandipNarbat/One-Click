// server/routes/product.js
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateProdCode() {
  const last = await prisma.product.findFirst({ orderBy: { id: 'desc' } });
  return last ? String(parseInt(last.prodCode, 10) + 1) : '1';
}

const MAX_PRODCODE_RETRY = 3;

async function createProductWithRetry(data, attempt = 1) {
  const prodCode = await generateProdCode();
  try {
    return await prisma.product.create({ data: { ...data, prodCode } });
  } catch (err) {
    if (err.code === 'P2002' && attempt < MAX_PRODCODE_RETRY) {
      return createProductWithRetry(data, attempt + 1);
    }
    throw err;
  }
}

// FIX: gstPercentage of 0 (a real, valid rate) was being treated as
// "not entered" by `gstPercentage ? ... : null`, since 0 is falsy in
// JS, and silently stored as null instead of 0.
function normalizeGst(gstPercentage) {
  return gstPercentage !== undefined && gstPercentage !== null && gstPercentage !== ''
    ? parseFloat(gstPercentage)
    : null;
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

    const product = await createProductWithRetry({
      productName,
      productType: productType.toUpperCase(),
      hsnCode,
      productCategory,
      gstPercentage: normalizeGst(gstPercentage),
      organisation
    });
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update product
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Product not found' });

    const {
      productName, productType, hsnCode,
      productCategory, gstPercentage, organisation
    } = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        productName,
        productType: productType?.toUpperCase(),
        hsnCode,
        productCategory,
        gstPercentage: normalizeGst(gstPercentage),
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
    const id = parseInt(req.params.id);

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Product not found' });

    const itemCount = await prisma.item.count({ where: { productId: id } });
    if (itemCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete: ${itemCount} items linked to this product`
      });
    }

    await prisma.product.delete({ where: { id } });
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
          { productName: { contains: req.params.query } },
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
// FIX: old path was '/:id/ ' (literal trailing space, unreachable).
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

// ─── HSN CODE ROUTES ──────────────────────────────────

// GET suggestion list — ?q=mob matches code or description
router.get('/hsn-codes', async (req, res) => {
  try {
    const q = req.query.q;
    const hsnCodes = await prisma.hsnCode.findMany({
      where: {
        isActive: true,
        ...(q ? { OR: [{ code: { contains: q } }, { description: { contains: q } }] } : {})
      },
      orderBy: { code: 'asc' },
      take: 50
    });
    res.json({ success: true, data: hsnCodes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create — explicit admin create, errors if the code already exists
router.post('/hsn-codes', async (req, res) => {
  try {
    const { code, description, defaultGstPercentage } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, error: 'HSN code is required' });
    }
    const trimmed = code.trim();

    const existing = await prisma.hsnCode.findUnique({ where: { code: trimmed } });
    if (existing) {
      return res.status(409).json({ success: false, error: `HSN code "${trimmed}" already exists` });
    }

    const hsnCode = await prisma.hsnCode.create({
      data: { code: trimmed, description: description || null, defaultGstPercentage: normalizeGst(defaultGstPercentage) }
    });
    res.status(201).json({ success: true, data: hsnCode });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST upsert — "auto-remember" endpoint. Called from Product Master AND
// Purchase Entry save flows with whatever code the user typed. Never
// errors on a duplicate — returns the existing row if already known.
router.post('/hsn-codes/upsert', async (req, res) => {
  try {
    const { code, description, defaultGstPercentage } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, error: 'HSN code is required' });
    }
    const trimmed = code.trim();

    const existing = await prisma.hsnCode.findUnique({ where: { code: trimmed } });
    if (existing) return res.json({ success: true, data: existing });

    const hsnCode = await prisma.hsnCode.create({
      data: { code: trimmed, description: description || null, defaultGstPercentage: normalizeGst(defaultGstPercentage) }
    });
    res.json({ success: true, data: hsnCode });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update — description / default GST% / active flag
router.put('/hsn-codes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.hsnCode.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'HSN code not found' });

    const { description, defaultGstPercentage, isActive } = req.body;
    const hsnCode = await prisma.hsnCode.update({
      where: { id },
      data: {
        description: description !== undefined ? description : undefined,
        defaultGstPercentage: defaultGstPercentage !== undefined ? normalizeGst(defaultGstPercentage) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined
      }
    });
    res.json({ success: true, data: hsnCode });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE — soft retire, not a hard delete
router.delete('/hsn-codes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.hsnCode.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'HSN code not found' });

    const hsnCode = await prisma.hsnCode.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, data: hsnCode, message: 'HSN code retired' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;