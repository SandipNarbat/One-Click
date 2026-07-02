const router = require('express').Router();
const purchaseReturnController = require('../controllers/purchaseReturn.controller');

// Search
router.get('/search', purchaseReturnController.searchItem);
router.get('/purchase/:purchaseId/items', purchaseReturnController.getReturnableItems);
router.get('/supplier/:supplierId/items', purchaseReturnController.getSupplierItems);

// Create
router.post('/new', purchaseReturnController.createReturn);

// Read
router.get('/all', purchaseReturnController.getAllReturns);
router.get('/view/:id', purchaseReturnController.getReturnById);
router.get('/debit-note/:id', purchaseReturnController.getDebitNote);

module.exports = router;