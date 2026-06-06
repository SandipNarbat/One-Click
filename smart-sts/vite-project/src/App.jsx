import { Routes, Route, Link } from "react-router-dom";

import SupplierMaster from "./pages/SupplierMaster";
import CustomerMaster from "./pages/CustomerMaster";
import ProductMaster from "./pages/ProductMaster";
import SalespersonMaster from "./pages/SalespersonMaster";
import ServiceCenterMaster from "./pages/ServiceCenterMaster";
import DOAMaster from "./pages/DOAAdjust";
import PriceDropMaster from "./pages/PriceDrop";
import ChangeMaster from "./pages/ChangeMaster";
import ReportMaster from "./pages/TotalReport";

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

        <Link to="/salesperson">
          <button>Salesperson</button>
        </Link>

        <Link to="/service-center">
          <button>Service Center</button>
        </Link>

        <Link to="/doa">
          <button>DOA</button>
        </Link>

        <Link to="/price-drop">
          <button>Price Drop</button>
        </Link>

        <Link to="/change">
          <button>Change</button>
        </Link>

        <Link to="/report">
          <button>Report</button>
        </Link>
      </div>

      <Routes>
        <Route path="/supplier" element={<SupplierMaster />} />
        <Route path="/customer" element={<CustomerMaster />} />
        <Route path="/product" element={<ProductMaster />} />
        <Route path="/salesperson" element={<SalespersonMaster />} />
        <Route path="/service-center" element={<ServiceCenterMaster />} />
        <Route path="/doa" element={<DOAMaster />} />
        <Route path="/price-drop" element={<PriceDropMaster />} />
        <Route path="/change" element={<ChangeMaster />} />
        <Route path="/report" element={<ReportMaster />} />
      </Routes>
    </>
  );
}

export default App;