// server/routes/report.js
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── TOTAL REPORT ──────────────────────────────────────
// GET sales report with filters
router.get('/', async (req, res) => {
  try {
    const { supplierId, productName, brand, model, from, to } = req.query;

    const where = {};

    if (supplierId) where.supplierId = parseInt(supplierId); // if Sale has supplier link

    if (productName) where.productName = { contains: productName, mode: 'insensitive' };
    if (brand)       where.brand       = { contains: brand,       mode: 'insensitive' };
    if (model)       where.model       = { contains: model,       mode: 'insensitive' };

    if (from || to) {
      where.invoiceDate = {};
      if (from) where.invoiceDate.gte = new Date(from);
      if (to)   where.invoiceDate.lte = new Date(new Date(to).setHours(23, 59, 59));
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer:    { select: { customerName: true } },
        salesPerson: { select: { name: true } }
      },
      orderBy: { invoiceDate: 'desc' }
    });

    const totalQty    = sales.reduce((s, r) => s + r.quantity, 0);
    const totalAmount = sales.reduce((s, r) => s + r.amount,   0);

    res.json({ success: true, data: sales, summary: { count: sales.length, totalQty, totalAmount } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET report filter options
router.get('/options/suppliers', async (req, res) => {
  try {
    const data = await prisma.supplier.findMany({
      select: { id: true, supplierId: true, supplierName: true },
      orderBy: { supplierName: 'asc' }
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/options/products', async (req, res) => {
  try {
    const data = await prisma.product.findMany({
      select: { id: true, prodCode: true, productName: true },
      orderBy: { productName: 'asc' }
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/options/brands', async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      select: { brand: true },
      distinct: ['brand'],
      where: { brand: { not: null } },
      orderBy: { brand: 'asc' }
    });
    res.json({ success: true, data: items.map(i => i.brand) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/options/models', async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      select: { model: true },
      distinct: ['model'],
      where: { model: { not: null } },
      orderBy: { model: 'asc' }
    });
    res.json({ success: true, data: items.map(i => i.model) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── SALE CRUD ─────────────────────────────────────────

// POST create sale record
router.post('/', async (req, res) => {
  try {
    const {
      invoiceNo, invoiceDate, customerId, salesPersonId,
      itemId, productName, model, brand, quantity, amount
    } = req.body;

    if (!invoiceNo || !invoiceDate || !quantity || !amount) {
      return res.status(400).json({ success: false, error: 'Invoice no, date, quantity and amount are required' });
    }

    const existing = await prisma.sale.findFirst({ where: { invoiceNo } });
    if (existing) {
      return res.status(409).json({ success: false, error: `Invoice ${invoiceNo} already exists` });
    }

    const data = await prisma.sale.create({
      data: {
        invoiceNo,
        invoiceDate: new Date(invoiceDate),
        customerId:    customerId    ? parseInt(customerId)    : null,
        salesPersonId: salesPersonId ? parseInt(salesPersonId) : null,
        itemId,
        productName,
        model,
        brand,
        quantity: parseInt(quantity),
        amount:   parseFloat(amount)
      }
    });
    res.status(201).json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PUT update sale
router.put('/:id', async (req, res) => {
  try {
    const {
      invoiceNo, invoiceDate, customerId, salesPersonId,
      itemId, productName, model, brand, quantity, amount
    } = req.body;

    const data = await prisma.sale.update({
      where: { id: parseInt(req.params.id) },
      data: {
        invoiceNo,
        invoiceDate:   invoiceDate   ? new Date(invoiceDate)      : undefined,
        customerId:    customerId    ? parseInt(customerId)        : null,
        salesPersonId: salesPersonId ? parseInt(salesPersonId)    : null,
        itemId, productName, model, brand,
        quantity: quantity ? parseInt(quantity) : undefined,
        amount:   amount   ? parseFloat(amount) : undefined
      }
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// DELETE sale
router.delete('/:id', async (req, res) => {
  try {
    await prisma.sale.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Sale record deleted' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── SUMMARY STATS ─────────────────────────────────────

// GET dashboard summary
router.get('/stats/summary', async (req, res) => {
  try {
    const [totalSales, totalCustomers, totalProducts, totalSuppliers, stockItems] = await Promise.all([
      prisma.sale.aggregate({ _sum: { amount: true }, _count: true }),
      prisma.customer.count(),
      prisma.product.count(),
      prisma.supplier.count(),
      prisma.item.aggregate({ _sum: { quantity: true } })
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue:   totalSales._sum.amount   || 0,
        totalSalesCount: totalSales._count        || 0,
        totalCustomers,
        totalProducts,
        totalSuppliers,
        totalStock:     stockItems._sum.quantity  || 0,
      }
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
