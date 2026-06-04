import { Routes, Route, Link } from "react-router-dom";

import SupplierMaster from "./pages/SupplierMaster";
import CustomerMaster from "./pages/CustomerMaster";
import ProductMaster from "./pages/ProductMaster";

function App() {
  return (
    <>
      <div>
        <Link to="/supplier">
          <button>Supplier</button>
        </Link>

        <Link to="/customer">
          <button>Customer</button>
        </Link>

        <Link to="/product">
          <button>Product</button>
        </Link>
      </div>

      <Routes>
        <Route path="/supplier" element={<SupplierMaster />} />
        <Route path="/customer" element={<CustomerMaster />} />
        <Route path="/product" element={<ProductMaster />} />
      </Routes>
    </>
  );
}

export default App;