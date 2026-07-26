// src/App.jsx
import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import logo from './assets/logo.svg';

import MainMenu from './pages/MainMenu';
import Masters from './pages/Masters';
import SupplierMaster from './pages/SupplierMaster';
import CustomerMaster from './pages/CustomerMaster';
import ProductMaster from './pages/ProductMaster';
import ItemMaster from './pages/ItemMaster';
import SalespersonMaster from './pages/SalesPersonMaster';
import ServiceCenterMaster from './pages/ServiceCenterMaster';
import DOAMaster from './pages/DOAAdjust';
import PriceDropMaster from './pages/PriceDrop';
import ChangeMaster from './pages/ChangeMaster';
import ReportMaster from './pages/TotalReport';
import PurchaseMaster from './pages/PurchaseMaster';
import PurchaseReturn from './pages/PurchaseReturn';
import SupplierPayment from './pages/SupplierPayment';
import PettyCashDeposit from './pages/PettyCashDeposit';
import VoucherMasterPage from './pages/VoucherMaster';
import ProductSearch from './pages/ProductSearch';


function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="app-shell">
      {/* Top Navigation Bar */}
      <header className="app-navbar">
        <div className="app-nav-left">
          <div className="app-logo">
            <img src={logo} alt="Logo" className="app-logo-img" />
          </div>
          <span className="app-brand-name">One Click</span>
        </div>
        <div className="app-nav-right">
          {/* Theme Toggle Button */}
          <button 
            className="app-nav-btn" 
            onClick={toggleTheme} 
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          <button className="app-nav-btn" title="Profile">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
          <button className="app-nav-btn" title="Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button className="app-nav-btn app-nav-btn-logout" title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Page Content */}
      <main className="app-content">
        <Routes>
          {/* Landing — Main Menu */}
          <Route path="/" element={<MainMenu />} />

          {/* Master hub */}
          <Route path="/master" element={<Masters />} />

          {/* Master sub-pages */}
          <Route path="/supplier"       element={<SupplierMaster />} />
          <Route path="/customer"       element={<CustomerMaster />} />
          <Route path="/product"        element={<ProductMaster />} />
          <Route path="/item"           element={<ItemMaster />} />
          <Route path="/salesperson"    element={<SalespersonMaster />} />
          <Route path="/service-center" element={<ServiceCenterMaster />} />
          <Route path="/doa"            element={<DOAMaster />} />
          <Route path="/price-drop"     element={<PriceDropMaster />} />
          <Route path="/change"         element={<ChangeMaster />} />
          <Route path="/report"         element={<ReportMaster />} />
          <Route path="/purchase-master"  element={<PurchaseMaster />} />
          <Route path="/purchase-return"  element={<PurchaseReturn />} />
          <Route path="/supplier-payment" element={<SupplierPayment />} />


          <Route path="/purchase/all" element={<ProductSearch />} />
          <Route path="/purchase/entry/:id" element={<PurchaseMaster />} />
          <Route path="/purchase/entry" element={<PurchaseMaster />} />



          {/* Petty Cash */}
          <Route path="/petty-cash"         element={<PettyCashDeposit />} />
          <Route path="/petty-cash/deposit" element={<PettyCashDeposit />} />
          <Route path="/petty-cash/voucher" element={<VoucherMasterPage />} />

        </Routes>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <span className="app-footer-left">© 2026 KHETL0SYS IT SOLUTIONS</span>
        <div className="app-footer-right">
          {/* <span className="app-footer-link">DOCUMENTATION</span> */}
          <span className="app-footer-link">SUPPORT</span>
          {/* <span className="app-footer-link">SECURITY</span> */}
        </div>
      </footer>
    </div>
  );
}

export default App;