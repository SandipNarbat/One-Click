const purchaseReturnService = require('../services/purchaseReturn.service');

// ── Search ────────────────────────────────────────────────────
async function searchItem(req, res) {
    try {
        const { type, value } = req.query;

        if (!type || !value)
            return res.status(400).json({ success: false, error: 'type and value are required' });

        if (!['imei', 'barcode', 'invoice'].includes(type))
            return res.status(400).json({ success: false, error: 'type must be imei, barcode, or invoice' });

        const result = await purchaseReturnService.searchItem(type, value);

        if (!result)
            return res.status(404).json({ success: false, error: 'No record found' });

        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

// ── Returnable Items ──────────────────────────────────────────
async function getReturnableItems(req, res) {
    try {
        const data = await purchaseReturnService.getReturnableItems(
            Number(req.params.purchaseId)
        );
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

async function getSupplierItems(req, res) {
    try {
        const data = await purchaseReturnService.getSupplierItems(
            Number(req.params.supplierId)
        );
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

// ── Create ────────────────────────────────────────────────────
async function createReturn(req, res) {
    try {
        const { purchaseId, supplierId, returnType, reason, items } = req.body;

        // Validation
        const errors = [];
        if (!purchaseId) errors.push('purchaseId is required');
        if (!supplierId) errors.push('supplierId is required');
        if (!returnType) errors.push('returnType is required');
        if (!reason || reason.trim().length < 3) errors.push('reason is required');
        if (!Array.isArray(items) || !items.length) errors.push('items must be a non-empty array');

        if (errors.length)
            return res.status(400).json({ success: false, errors });

        const result = await purchaseReturnService.createReturn(req.body);
        res.status(201).json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

// ── Read ──────────────────────────────────────────────────────
async function getAllReturns(req, res) {
    try {
        const data = await purchaseReturnService.getAllReturns();
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

async function getReturnById(req, res) {
    try {
        const data = await purchaseReturnService.getReturnById(Number(req.params.id));
        if (!data) return res.status(404).json({ success: false, error: 'Return not found' });
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

async function getDebitNote(req, res) {
    try {
        const data = await purchaseReturnService.getDebitNote(Number(req.params.id));
        if (!data) return res.status(404).json({ success: false, error: 'Debit note not found' });
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

module.exports = {
    searchItem,
    getReturnableItems,
    getSupplierItems,
    createReturn,
    getAllReturns,
    getReturnById,
    getDebitNote,
};