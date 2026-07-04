const express = require('express');
const controller = require('../controllers/supplierPayment.controller');

const router = express.Router();

// Supplier search (name / code / mobile / GST)
router.get('/suppliers/search', controller.searchSuppliers);

// Outstanding summary + ageing, shown when supplier is selected
router.get('/outstanding/:supplierId', controller.getOutstandingSummary);

// Purchase grid — Outstanding Only / Fully Paid / All (default: OUTSTANDING_ONLY)
// e.g. GET /pending/12?filter=OUTSTANDING_ONLY|FULLY_PAID|ALL
router.get('/pending/:supplierId', controller.getPendingInvoices);

// Auto Allocate — pure calculation, does not persist anything
router.post('/auto-allocate', controller.autoAllocate);

// Supplier Ledger (printable)
router.get('/ledger/:supplierId', controller.getSupplierLedger);

// CRUD
router.get('/', controller.listPayments);
router.get('/:id', controller.getPaymentById);
router.post('/', controller.createPayment);
router.put('/:id', controller.updatePayment);

// DELETE = cancel/reversal (see service). Body: { cancelReason }
router.delete('/:id', controller.cancelPayment);

// Print
router.get('/:id/print', controller.getPrintData);

module.exports = router;
