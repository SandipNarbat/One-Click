// src/pages/MainMenu.jsx
import { useNavigate } from 'react-router-dom';
import './MainMenu.css';

const modules = [
  {
    id: 'masters',
    label: "Master's",
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M3 5v4c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
        <path d="M3 9v4c0 1.66 4.03 3 9 3s9-1.34 9-3V9"/>
        <path d="M3 13v4c0 1.66 4.03 3 9 3s9-1.34 9-3v-4"/>
      </svg>
    ),
    route: '/master',
    color: '#7c6ff7',
  },
  {
    id: 'purchase-master',
    label: 'Purchase Master',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        <path d="M12 9v6M9 12h6"/>
      </svg>
    ),
    route: '/purchase-master',
    color: '#4fd1c7',
  },
  {
    id: 'supplier-payment',
    label: 'Supplier Payment',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="14" rx="2"/>
        <path d="M2 10h20"/>
        <circle cx="12" cy="15" r="2"/>
      </svg>
    ),
    route: '/supplier-payment',
    color: '#4fd1c7',
  },
  {
    id: 'purchase-return',
    label: 'Purchase Return',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 14l-5-5 5-5"/>
        <path d="M4 9h10a7 7 0 0 1 0 14h-1"/>
      </svg>
    ),
    route: '/purchase-return',
    color: '#f687b3',
  },
  {
    id: 'payment-reminder',
    label: 'Payment Reminder',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
    route: '/payment-reminder',
    color: '#f687b3',
  },
  {
    id: 'mail-invoice',
    label: 'Mail Invoice To Customer',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    route: '/mail-invoice',
    color: '#4fd1c7',
  },
  {
    id: 'job-sheet',
    label: 'Job Sheet',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    route: '/job-sheet',
    color: '#7c6ff7',
  },
  {
    id: 'petty-cash',
    label: 'Petty Cash',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="14" rx="2"/>
        <path d="M2 10h20"/>
        <path d="M7 15h2M12 15h5"/>
      </svg>
    ),
    route: '/petty-cash',
    color: '#4fd1c7',
  },
  {
    id: 'counter-sale',
    label: 'Counter Sale',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
        <path d="M7 8h10M7 11h5"/>
      </svg>
    ),
    route: '/sales',
    color: '#f687b3',
  },
  {
    id: 'sales-return',
    label: 'Sales Return',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 14 4 9 9 4"/>
        <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
      </svg>
    ),
    route: '/sales-return',
    color: '#f687b3',
  },
  {
    id: 'customer-payment',
    label: 'Customer Payment',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
        <polyline points="17 11 19 13 23 9"/>
      </svg>
    ),
    route: '/customer-payment',
    color: '#7c6ff7',
  },
  {
    id: 'report',
    label: 'Report',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    route: '/report',
    color: '#7c6ff7',
  },
  {
    id: 'finance-master',
    label: 'Finance Master',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    route: '/finance-master',
    color: '#4fd1c7',
  },
  {
    id: 'barcode-reprinting',
    label: 'Barcode Re-Printing',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5v14M7 5v14M11 5v14M15 5v7M19 5v7M15 16v3M19 16v3M13 19h8"/>
      </svg>
    ),
    route: '/barcode-reprinting',
    color: '#f687b3',
  },
  {
    id: 'online-stock',
    label: 'Online Stock Taking',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <path d="M3 17h7M3 21h7M7 14v7"/>
      </svg>
    ),
    route: '/online-stock',
    color: '#7c6ff7',
  },
  {
    id: 'user-master',
    label: 'User Master',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    route: '/user-master',
    color: '#7c6ff7',
  },
  {
    id: 'change-password',
    label: 'Change Password',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.5 2v6h-6M2.5 22v-6h6"/>
        <path d="M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
      </svg>
    ),
    route: '/change-password',
    color: '#4fd1c7',
  },
  {
    id: 'utilities',
    label: 'Utilities',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
    route: '/utilities',
    color: '#f687b3',
  },
  {
    id: 'exit',
    label: 'Exit',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
        <polyline points="10 17 15 12 10 7"/>
        <line x1="15" y1="12" x2="3" y2="12"/>
      </svg>
    ),
    route: '/exit',
    color: '#f687b3',
  },
];

export default function MainMenu() {
  const navigate = useNavigate();

  return (
    <div className="mm-page">
      {/* Header */}
      <div className="mm-header">
        <h1 className="mm-title">Main Menu</h1>
        <p className="mm-subtitle">
          Welcome to your operational nerve center. Select a module to manage your<br />
          enterprise resources and sales flow.
        </p>
      </div>

      {/* Module Grid */}
      <div className="mm-grid">
        {modules.map((mod) => (
          <button
            key={mod.id}
            className="mm-card"
            style={{
              '--theme-border-hover': mod.color + '66',
              '--theme-glow-hover': `0 8px 30px ${mod.color}22`
            }}
            onClick={() => navigate(mod.route)}
          >
            <div className="mm-icon-wrap" style={{ color: mod.color }}>
              {mod.icon}
            </div>
            <span className="mm-card-label">{mod.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

