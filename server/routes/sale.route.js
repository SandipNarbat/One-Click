const express = require("express");
const router = express.Router();
const saleController = require("../controllers/sale.controller");

// NOTE: /search, /lookup/:code, and /stock-info/:productId must all be
// registered before /:id, otherwise Express matches them as an :id param
// and routes them to getSaleById instead.
router.get("/search", saleController.searchSales);
router.get("/lookup/:code", saleController.lookupItem);
router.get("/stock-info/:productId", saleController.getStockInfo);

router.get("/", saleController.getAllSales);
router.get("/:id", saleController.getSaleById);
router.post("/", saleController.createSale);
router.put("/:id", saleController.updateSale);
router.delete("/:id", saleController.deleteSale);

module.exports = router;
