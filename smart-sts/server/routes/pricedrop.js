// server/routes/pricedrop.js
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET all items with filters (for the product directory table)
router.get('/items', async (req, res) => {
  try {
    const { productId, model, brand } = req.query;
    const where = {};
    if (productId) where.productId = parseInt(productId);
    if (model)     where.model     = { contains: model,  mode: 'insensitive' };
    if (brand)     where.brand     = { contains: brand,  mode: 'insensitive' };

    const data = await prisma.item.findMany({
      where,
      include: { product: { select: { productName: true, prodCode: true } } },
      orderBy: { itemId: 'asc' }
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET all unique models (for dropdown)
router.get('/options/models', async (req, res) => {
  try {
    const { productId } = req.query;
    const where = { model: { not: null } };
    if (productId) where.productId = parseInt(productId);
    const items = await prisma.item.findMany({ select: { model: true }, distinct: ['model'], where });
    res.json({ success: true, data: items.map(i => i.model) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET all unique brands (for dropdown)
router.get('/options/brands', async (req, res) => {
  try {
    const { productId } = req.query;
    const where = { brand: { not: null } };
    if (productId) where.productId = parseInt(productId);
    const items = await prisma.item.findMany({ select: { brand: true }, distinct: ['brand'], where });
    res.json({ success: true, data: items.map(i => i.brand) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST apply price drop to matching items
// Body: { productId, model, brand, newDp, newSalePrice, remark, itemIds[] }
router.post('/apply', async (req, res) => {
  try {
    const { productId, model, brand, newDp, newSalePrice, remark, itemIds } = req.body;

    if (!newDp && !newSalePrice) {
      return res.status(400).json({ success: false, error: 'Provide at least new DP or new Sale Price' });
    }

    // Find items to update
    const where = {};
    if (itemIds?.length)  where.id        = { in: itemIds };
    else {
      if (productId) where.productId = parseInt(productId);
      if (model)     where.model     = model;
      if (brand)     where.brand     = brand;
    }

    const items = await prisma.item.findMany({ where });
    if (items.length === 0) {
      return res.status(404).json({ success: false, error: 'No matching items found' });
    }

    // Save price history for each item, then update price
    const results = await prisma.$transaction(
      items.map(item =>
        prisma.priceHistory.create({
          data: {
            itemId:       item.id,
            oldDp:        item.dp,
            newDp:        newDp        ? parseFloat(newDp)        : item.dp,
            oldSalePrice: item.salePrice,
            newSalePrice: newSalePrice ? parseFloat(newSalePrice) : item.salePrice,
            remark
          }
        })
      )
    );

    // Now update item prices
    await prisma.item.updateMany({
      where,
      data: {
        ...(newDp        && { dp:        parseFloat(newDp) }),
        ...(newSalePrice && { salePrice: parseFloat(newSalePrice) }),
      }
    });

    res.json({
      success: true,
      message: `Price updated for ${items.length} item(s)`,
      data: { updatedCount: items.length, historyCreated: results.length }
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET price history for an item
router.get('/history/:itemId', async (req, res) => {
  try {
    const data = await prisma.priceHistory.findMany({
      where: { itemId: parseInt(req.params.itemId) },
      orderBy: { changedAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET all price history (for audit log)
router.get('/history', async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.changedAt = {};
      if (from) where.changedAt.gte = new Date(from);
      if (to)   where.changedAt.lte = new Date(to);
    }
    const data = await prisma.priceHistory.findMany({
      where,
      include: { item: { select: { itemId: true, brand: true, model: true } } },
      orderBy: { changedAt: 'desc' },
      take: 500
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
