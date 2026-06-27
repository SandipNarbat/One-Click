const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getNextNo() {
  const last = await prisma.pettyCashDeposit.findFirst({ orderBy: { id: 'desc' } });
  if (!last) return 'PC-0001';
  const n = parseInt(last.voucherNo.replace('PC-', '')) + 1;
  return `PC-${String(n).padStart(4, '0')}`;
}

router.get('/next-no', async (req, res) => {
  try { res.json({ success: true, data: await getNextNo() }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/all', async (req, res) => {
  try {
    const data = await prisma.pettyCashDeposit.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/view/:id', async (req, res) => {
  try {
    const data = await prisma.pettyCashDeposit.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!data) return res.status(404).json({ success: false, error: 'Record not found' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/search/:query', async (req, res) => {
  try {
    const q = req.params.query;
    const data = await prisma.pettyCashDeposit.findMany({
      where: { OR: [
        { voucherNo:     { contains: q } },
        { depositedFrom: { contains: q } },
        { particulars:   { contains: q } },
        { mode:          { contains: q } },
      ]},
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/new', async (req, res) => {
  try {
    const { depositDate, depositedFrom, particulars, amount, amountInWords, mode, transNo, transDate, bankName, passedBy } = req.body;
    if (!depositDate || !amount) return res.status(400).json({ success: false, error: 'Deposit date and amount are required' });
    const data = await prisma.pettyCashDeposit.create({
      data: {
        voucherNo:     await getNextNo(),
        depositDate:   new Date(depositDate),
        depositedFrom: depositedFrom || null,
        particulars:   particulars   || null,
        amount:        parseFloat(amount),
        amountInWords: amountInWords || null,
        mode:          mode          || null,
        transNo:       transNo       || null,
        transDate:     transDate     ? new Date(transDate) : null,
        bankName:      bankName      || null,
        passedBy:      passedBy      || null,
        status:        'DRAFT',
      },
    });
    res.status(201).json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/update/:id', async (req, res) => {
  try {
    const existing = await prisma.pettyCashDeposit.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!existing) return res.status(404).json({ success: false, error: 'Record not found' });
    if (existing.status === 'CONFIRMED') return res.status(400).json({ success: false, error: 'Cannot edit a confirmed record' });
    const { depositDate, depositedFrom, particulars, amount, amountInWords, mode, transNo, transDate, bankName, passedBy } = req.body;
    const data = await prisma.pettyCashDeposit.update({
      where: { id: parseInt(req.params.id) },
      data: {
        depositDate:   depositDate   ? new Date(depositDate) : undefined,
        depositedFrom: depositedFrom || null,
        particulars:   particulars   || null,
        amount:        amount        ? parseFloat(amount) : undefined,
        amountInWords: amountInWords || null,
        mode:          mode          || null,
        transNo:       transNo       || null,
        transDate:     transDate     ? new Date(transDate) : null,
        bankName:      bankName      || null,
        passedBy:      passedBy      || null,
      },
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/confirm/:id', async (req, res) => {
  try {
    const existing = await prisma.pettyCashDeposit.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!existing) return res.status(404).json({ success: false, error: 'Record not found' });
    if (existing.status === 'CONFIRMED') return res.status(400).json({ success: false, error: 'Already confirmed' });
    const data = await prisma.pettyCashDeposit.update({
      where: { id: parseInt(req.params.id) },
      data:  { status: 'CONFIRMED' },
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete('/delete/:id', async (req, res) => {
  try {
    const existing = await prisma.pettyCashDeposit.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!existing) return res.status(404).json({ success: false, error: 'Record not found' });
    if (existing.status === 'CONFIRMED') return res.status(400).json({ success: false, error: 'Cannot delete a confirmed record' });
    await prisma.pettyCashDeposit.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Record deleted' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
