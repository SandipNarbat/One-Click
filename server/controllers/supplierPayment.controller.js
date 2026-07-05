const service = require('../services/supplierPayment.service');

async function searchSuppliers(req, res) {
  try {
    const suppliers = await service.searchSuppliers(req.query.q);
    res.status(200).json(suppliers);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function getOutstandingSummary(req, res) {
  try {
    const summary = await service.getSupplierOutstandingSummary(Number(req.params.supplierId));
    res.status(200).json(summary);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function getPendingInvoices(req, res) {
  try {
    const grid = await service.getPurchaseGrid(Number(req.params.supplierId), req.query.filter);
    res.status(200).json(grid);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function autoAllocate(req, res) {
  try {
    const { purchaseIds, paymentAmount } = req.body;
    const allocations = await service.calculateAutoAllocation(purchaseIds, paymentAmount);
    res.status(200).json(allocations);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function listPayments(req, res) {
  try {
    const result = await service.listPayments(req.query);
    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function getPaymentById(req, res) {
  try {
    const payment = await service.getPaymentById(Number(req.params.id));
    res.status(200).json(payment);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function createPayment(req, res) {
  try {
    const payment = await service.createPayment(req.body);
    res.status(201).json(payment);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function updatePayment(req, res) {
  try {
    const payment = await service.updatePayment(Number(req.params.id), req.body);
    res.status(200).json(payment);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

// DELETE = cancel/reversal, not a hard delete. Body must include cancelReason.
async function cancelPayment(req, res) {
  try {
    const payment = await service.cancelPayment(Number(req.params.id), req.body.cancelReason);
    res.status(200).json(payment);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function getPrintData(req, res) {
  try {
    const data = await service.getPrintData(Number(req.params.id));
    res.status(200).json(data);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function getSupplierLedger(req, res) {
  try {
    const ledger = await service.getSupplierLedger(Number(req.params.supplierId));
    res.status(200).json(ledger);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

module.exports = {
  searchSuppliers,
  getOutstandingSummary,
  getPendingInvoices,
  autoAllocate,
  listPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  cancelPayment,
  getPrintData,
  getSupplierLedger,
};
