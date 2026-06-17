const router = require("express").Router();

const purchaseController = require("../controllers/purchase.controller");

router.post("/new", purchaseController.createPurchase);

router.get("/all",purchaseController.getAllPurchases);

router.get("/search/:query", purchaseController.searchPurchases);

router.get("/view/:id",purchaseController.getPurchaseById);

router.put("/update/:id",purchaseController.updatePurchase);

router.delete("/delete/:id",purchaseController.deletePurchase);

module.exports = router;



router.get(
  "/search/:query",
  purchaseController.searchPurchases
);