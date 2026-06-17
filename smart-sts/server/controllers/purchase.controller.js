const purchaseService =
  require("../services/purchase.service");

async function createPurchase(req, res) {

  try {

    const result =
      await purchaseService.createPurchase(
        req.body
      );
      console.log(result);

    res.status(201).json({
      success: true,
      data: result
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function getAllPurchases(req,res){
  try{

    const purchases =
      await purchaseService.getAllPurchases();

    res.json({
      success:true,
      data:purchases
    });

  }catch(error){

    res.status(500).json({
      success:false,
      error:error.message
    });
  }
}

async function getPurchaseById(req,res){

  try{

    const purchase =
      await purchaseService.getPurchaseById(
        Number(req.params.id)
      );

    if(!purchase){
      return res.status(404).json({
        success:false,
        error:"Purchase not found"
      });
    }

    res.json({
      success:true,
      data:purchase
    });

  }catch(error){

    res.status(500).json({
      success:false,
      error:error.message
    });
  }
}

async function updatePurchase(req,res){

  try{

    const purchase =
      await purchaseService.updatePurchase(
        Number(req.params.id),
        req.body
      );

    res.json({
      success:true,
      data:purchase
    });

  }catch(error){

    res.status(500).json({
      success:false,
      error:error.message
    });
  }
}

async function deletePurchase(req,res){

  try{

    await purchaseService.deletePurchase(
      Number(req.params.id)
    );

    res.json({
      success:true,
      message:"Purchase deleted successfully"
    });

  }catch(error){

    res.status(500).json({
      success:false,
      error:error.message
    });
  }
}

async function searchPurchases(req, res) {
  try {

    const purchases =
      await purchaseService.searchPurchases(
        req.params.query
      );

    res.json({
      success: true,
      data: purchases
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
  searchPurchases
};