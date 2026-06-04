// server/routes/customer.js
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper: generate next Customer ID
async function generateCustomerId() {
  const last = await prisma.customer.findFirst({ orderBy: { id: 'desc' } });
  if (!last) return 'CUST-0001';
  const num = parseInt(last.customerId.split('-')[1]) + 1;
  return `CUST-${String(num).padStart(4, '0')}`;
}

// GET all customers
router.get('/', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single customer
router.get('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    if (!customer) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET next customer ID
router.get('/generate/next-id', async (req, res) => {
  try {
    const nextId = await generateCustomerId();
    res.json({ success: true, data: nextId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create customer
router.post('/', async (req, res) => {
  try {
    const {
      customerName, email, contactNo, mobileNo,
      address, state, gstTin, aadharNo, panNo
    } = req.body;

    if (!customerName) {
      return res.status(400).json({ success: false, error: 'Customer name is required' });
    }

    const customerId = await generateCustomerId();
    const customer = await prisma.customer.create({
      data: {
        customerId, customerName, email,
        contactNo, mobileNo, address, state,
        gstTin, aadharNo, panNo
      }
    });
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update customer
router.put('/:id', async (req, res) => {
  try {
    const {
      customerName, email, contactNo, mobileNo,
      address, state, gstTin, aadharNo, panNo
    } = req.body;

    const customer = await prisma.customer.update({
      where: { id: parseInt(req.params.id) },
      data: {
        customerName, email, contactNo, mobileNo,
        address, state, gstTin, aadharNo, panNo
      }
    });
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE customer
router.delete('/:id', async (req, res) => {
  try {
    await prisma.customer.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ success: true, message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SEARCH customers
router.get('/search/:query', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { customerName: { contains: req.params.query, mode: 'insensitive' } },
          { customerId:   { contains: req.params.query, mode: 'insensitive' } },
          { mobileNo:     { contains: req.params.query } },
        ]
      }
    });
    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
