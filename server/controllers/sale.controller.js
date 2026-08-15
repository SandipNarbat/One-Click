const saleService = require("../services/sale.service");

// POST /api/sales
async function createSale(req, res) {
  try {
    const sale = await saleService.createSale(req.body);
    res.status(201).json({ success: true, data: sale });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// GET /api/sales
async function getAllSales(req, res) {
  try {
    const sales = await saleService.getAllSales();
    res.json({ success: true, data: sales });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/sales/search?q=...
async function searchSales(req, res) {
  try {
    const query = req.query.q || "";
    const sales = await saleService.searchSales(query);
    res.json({ success: true, data: sales });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/sales/:id
async function getSaleById(req, res) {
  try {
    const id = Number(req.params.id);
    const sale = await saleService.getSaleById(id);
    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }
    res.json({ success: true, data: sale });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /api/sales/:id
async function updateSale(req, res) {
  try {
    const id = Number(req.params.id);
    const sale = await saleService.updateSale(id, req.body);
    res.json({ success: true, data: sale });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// DELETE /api/sales/:id
async function deleteSale(req, res) {
  try {
    const id = Number(req.params.id);
    await saleService.deleteSale(id);
    res.json({ success: true, message: "Sale deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// GET /api/sales/lookup/:code
async function lookupItem(req, res) {
  try {
    const code = req.params.code;
    const result = await saleService.lookupItemByCode(code);
    if (!result) {
      return res.status(404).json({ success: false, message: `No item found for code "${code}"` });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/sales/stock-info/:productId
async function getStockInfo(req, res) {
  try {
    const productId = Number(req.params.productId);
    const info = await saleService.getProductStockInfo(productId);
    res.json({ success: true, data: info });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  createSale,
  getAllSales,
  searchSales,
  lookupItem,
  getStockInfo,
  getSaleById,
  updateSale,
  deleteSale,
};
