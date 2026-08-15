// src/components/MasterLayout.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import './MasterLayout.css';

const NAV_ITEMS = [
  {
    label: 'Sales Entry',
    route: '/sales',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    label: 'Sales Search',
    route: '/sales/all',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
];

export default function MasterLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="ml-shell">
      {/* Sidebar */}
      <aside className="ml-sidebar">
        <div className="ml-sidebar-header">
          <button
            className="ml-back-btn"
            onClick={() => navigate('/')}
            title="Back to Home"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            <span>Back to Home</span>
          </button>
        </div>
        <div className="ml-sidebar-label">PRODUCT MANAGEMENT</div>
        <nav className="ml-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.route;
            return (
              <button
                key={item.route}
                className={`ml-nav-item ${isActive ? 'ml-nav-item-active' : ''}`}
                onClick={() => navigate(item.route)}
              >
                <span className="ml-nav-icon">
                  {item.icon}
                </span>
                <span className="ml-nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="ml-content">
        {children}
      </main>
    </div>
  );
}


