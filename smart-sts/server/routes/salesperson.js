// server/routes/salesperson.js
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper: generate next Employee ID
async function generateEmployeeId() {
  const last = await prisma.salesPerson.findFirst({ orderBy: { id: 'desc' } });
  if (!last) return 'EMP-1001';
  const num = parseInt(last.employeeId.split('-')[1]) + 1;
  return `EMP-${num}`;
}

// GET all
router.get('/', async (req, res) => {
  try {
    const data = await prisma.salesPerson.findMany({ orderBy: { id: 'asc' } });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET single
router.get('/:id', async (req, res) => {
  try {
    const data = await prisma.salesPerson.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET next employee ID
router.get('/generate/next-id', async (req, res) => {
  try {
    const nextId = await generateEmployeeId();
    res.json({ success: true, data: nextId });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST create
router.post('/', async (req, res) => {
  try {
    const { name, mobile, contactNo, email, address, visible } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name is required' });
    const employeeId = await generateEmployeeId();
    const data = await prisma.salesPerson.create({
      data: { employeeId, name, mobile, contactNo, email, address, visible: visible ?? true }
    });
    res.status(201).json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const { name, mobile, contactNo, email, address, visible } = req.body;
    const data = await prisma.salesPerson.update({
      where: { id: parseInt(req.params.id) },
      data: { name, mobile, contactNo, email, address, visible }
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await prisma.salesPerson.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Sales person deleted' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// SEARCH
router.get('/search/:query', async (req, res) => {
  try {
    const data = await prisma.salesPerson.findMany({
      where: {
        OR: [
          { name:       { contains: req.params.query, mode: 'insensitive' } },
          { employeeId: { contains: req.params.query, mode: 'insensitive' } },
          { mobile:     { contains: req.params.query } },
        ]
      }
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
