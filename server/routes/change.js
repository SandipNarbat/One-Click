// server/routes/change.js
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── SHOW / SEARCH items ───────────────────────────────

// GET items filtered by product, model, brand, colour
router.get('/items', async (req, res) => {
  try {
    const { productName, model, brand, colour } = req.query;
    const where = {};

    if (productName) {
      where.product = { productName: { contains: productName } };
    }
    if (model)  where.model  = { contains: model };
    if (brand)  where.brand  = { contains: brand };
    if (colour) where.colour = { contains: colour };

    const data = await prisma.item.findMany({
      where,
      include: { product: { select: { productName: true } } },
      orderBy: { itemId: 'asc' }
    });

    const totalQty = data.reduce((s, i) => s + i.quantity, 0);
    res.json({ success: true, data, totalQty });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET single item by itemId string (e.g. "ITM-4921")
router.get('/item/:itemId', async (req, res) => {
  try {
    const data = await prisma.item.findUnique({
      where: { itemId: req.params.itemId },
      include: { product: true }
    });
    if (!data) return res.status(404).json({ success: false, error: 'Item not found' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET dropdown options
router.get('/options/models', async (req, res) => {
  try {
    const items = await prisma.item.findMany({ select: { model: true }, distinct: ['model'], where: { model: { not: null } } });
    res.json({ success: true, data: items.map(i => i.model) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/options/brands', async (req, res) => {
  try {
    const items = await prisma.item.findMany({ select: { brand: true }, distinct: ['brand'], where: { brand: { not: null } } });
    res.json({ success: true, data: items.map(i => i.brand) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/options/colours', async (req, res) => {
  try {
    const items = await prisma.item.findMany({ select: { colour: true }, distinct: ['colour'], where: { colour: { not: null } } });
    res.json({ success: true, data: items.map(i => i.colour) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── TAB 1: Sale Price Change ──────────────────────────

// PUT change sale price for a single item
router.put('/sale-price/:id', async (req, res) => {
  try {
    const { newSalePrice, tax, newImeiNo } = req.body;
    const itemId = parseInt(req.params.id);

    if (!newSalePrice) {
      return res.status(400).json({ success: false, error: 'New sale price is required' });
    }

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ success: false, error: 'Item not found' });

    // Save history
    await prisma.priceHistory.create({
      data: {
        itemId,
        oldSalePrice: item.salePrice,
        newSalePrice: parseFloat(newSalePrice),
        oldImei:      item.imeiNo,
        newImei:      newImeiNo || item.imeiNo,
        remark:       'Sale Price Change'
      }
    });

    // Update item
    const updated = await prisma.item.update({
      where: { id: itemId },
      data: {
        salePrice: parseFloat(newSalePrice),
        tax:       tax || item.tax,
        ...(newImeiNo && { imeiNo: newImeiNo })
      }
    });

    res.json({ success: true, data: updated });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PUT bulk sale price change (all filtered items)
router.put('/sale-price-bulk', async (req, res) => {
  try {
    const { itemIds, newSalePrice, tax } = req.body;

    if (!itemIds?.length || !newSalePrice) {
      return res.status(400).json({ success: false, error: 'itemIds and newSalePrice are required' });
    }

    const items = await prisma.item.findMany({ where: { id: { in: itemIds } } });

    // Save history for all
    await prisma.$transaction(
      items.map(item =>
        prisma.priceHistory.create({
          data: {
            itemId:       item.id,
            oldSalePrice: item.salePrice,
            newSalePrice: parseFloat(newSalePrice),
            remark:       'Bulk Sale Price Change'
          }
        })
      )
    );

    await prisma.item.updateMany({
      where: { id: { in: itemIds } },
      data: { salePrice: parseFloat(newSalePrice), ...(tax && { tax }) }
    });

    res.json({ success: true, message: `Updated ${items.length} item(s)` });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── TAB 2: Product Details Change ────────────────────

// PUT change product details (model, brand, colour, etc.)
router.put('/product-details/:id', async (req, res) => {
  try {
    const { model, brand, colour, quantity } = req.body;
    const itemId = parseInt(req.params.id);

    const updated = await prisma.item.update({
      where: { id: itemId },
      data: {
        ...(model    && { model }),
        ...(brand    && { brand }),
        ...(colour   && { colour }),
        ...(quantity !== undefined && { quantity: parseInt(quantity) }),
      }
    });
    res.json({ success: true, data: updated });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── TAB 3: IMEI Change ───────────────────────────────

// PUT change IMEI number for an item
router.put('/imei/:id', async (req, res) => {
  try {
    const { newImeiNo } = req.body;
    const itemId = parseInt(req.params.id);

    if (!newImeiNo) {
      return res.status(400).json({ success: false, error: 'New IMEI number is required' });
    }

    // Check if new IMEI already exists
    const existing = await prisma.item.findFirst({ where: { imeiNo: newImeiNo } });
    if (existing && existing.id !== itemId) {
      return res.status(409).json({ success: false, error: `IMEI ${newImeiNo} already assigned to another item` });
    }

    const item = await prisma.item.findUnique({ where: { id: itemId } });

    // Save history
    await prisma.priceHistory.create({
      data: {
        itemId,
        oldImei: item.imeiNo,
        newImei: newImeiNo,
        remark:  'IMEI Change'
      }
    });

    const updated = await prisma.item.update({
      where: { id: itemId },
      data: { imeiNo: newImeiNo }
    });

    res.json({ success: true, data: updated });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
