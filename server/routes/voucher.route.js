const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getNextNo() {
  const last = await prisma.voucherMaster.findFirst({ orderBy: { id: 'desc' } });
  if (!last) return 'VC-0001';
  const n = parseInt(last.voucherNo.replace('VC-', '')) + 1;
  return `VC-${String(n).padStart(4, '0')}`;
}

router.get('/next-no', async (req, res) => {
  try { res.json({ success: true, data: await getNextNo() }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/all', async (req, res) => {
  try {
    const data = await prisma.voucherMaster.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/view/:id', async (req, res) => {
  try {
    const data = await prisma.voucherMaster.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!data) return res.status(404).json({ success: false, error: 'Voucher not found' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/search/:query', async (req, res) => {
  try {
    const q = req.params.query;
    const data = await prisma.voucherMaster.findMany({
      where: { OR: [
        { voucherNo:   { contains: q } },
        { paidTo:      { contains: q } },
        { particulars: { contains: q } },
        { mode:        { contains: q } },
      ]},
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/new', async (req, res) => {
  try {
    const { voucherDate, paidTo, particulars, amount, amountInWords, mode, transNo, transDate, bankName, passedBy } = req.body;
    if (!voucherDate || !amount) return res.status(400).json({ success: false, error: 'Voucher date and amount are required' });
    const data = await prisma.voucherMaster.create({
      data: {
        voucherNo:     await getNextNo(),
        voucherDate:   new Date(voucherDate),
        paidTo:        paidTo        || null,
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
    const existing = await prisma.voucherMaster.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!existing) return res.status(404).json({ success: false, error: 'Voucher not found' });
    if (existing.status === 'CONFIRMED') return res.status(400).json({ success: false, error: 'Cannot edit a confirmed voucher' });
    const { voucherDate, paidTo, particulars, amount, amountInWords, mode, transNo, transDate, bankName, passedBy } = req.body;
    const data = await prisma.voucherMaster.update({
      where: { id: parseInt(req.params.id) },
      data: {
        voucherDate:   voucherDate ? new Date(voucherDate) : undefined,
        paidTo:        paidTo        || null,
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
    const existing = await prisma.voucherMaster.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!existing) return res.status(404).json({ success: false, error: 'Voucher not found' });
    if (existing.status === 'CONFIRMED') return res.status(400).json({ success: false, error: 'Already confirmed' });
    const data = await prisma.voucherMaster.update({
      where: { id: parseInt(req.params.id) },
      data:  { status: 'CONFIRMED' },
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete('/delete/:id', async (req, res) => {
  try {
    const existing = await prisma.voucherMaster.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!existing) return res.status(404).json({ success: false, error: 'Voucher not found' });
    if (existing.status === 'CONFIRMED') return res.status(400).json({ success: false, error: 'Cannot delete a confirmed voucher' });
    await prisma.voucherMaster.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Voucher deleted' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
