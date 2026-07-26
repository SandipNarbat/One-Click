// src/pages/Masters.jsx
import { useNavigate } from 'react-router-dom';
import './Masters.css';

const masterModules = [
  {
    id: 'supplier-master',
    label: 'Supplier Master',
    route: '/supplier',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M9 21V9"/>
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    glowColor: '#6366f1',
  },
  {
    id: 'customer-master',
    label: 'Customer Master',
    route: '/customer',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
    glowColor: '#22d3ee',
  },
  {
    id: 'product-gst-master',
    label: 'Product GST Master',
    route: '/product',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M9 21V9M15 21V9"/>
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
    glowColor: '#14b8a6',
  },
  {
    id: 'report',
    label: 'Report',
    route: '/report',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
        <rect x="2" y="2" width="20" height="20" rx="2"/>
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)',
    glowColor: '#38bdf8',
  },
  {
    id: 'service-centre-master',
    label: 'Service Centre Master',
    route: '/service-center',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.5 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.44 1.5h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16.5l.42.42z"/>
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #3730a3 0%, #4338ca 100%)',
    glowColor: '#818cf8',
  },
  {
    id: 'sales-person-master',
    label: 'Sales Person Master',
    route: '/salesperson',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #0891b2 0%, #0284c7 100%)',
    glowColor: '#38bdf8',
  },
  {
    id: 'doa-adjust',
    label: 'DOA Adjust',
    route: '/doa',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
    glowColor: '#9ca3af',
  },
  {
    id: 'price-drop',
    label: 'Price Drop',
    route: '/price-drop',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
        <polyline points="17 18 23 18 23 12"/>
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
    glowColor: '#2dd4bf',
  },
  {
    id: 'change',
    label: 'Change',
    route: '/change',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.5 2v6h-6M2.5 22v-6h6"/>
        <path d="M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
    glowColor: '#818cf8',
  },
  {
    id: 'back',
    label: 'Back',
    route: '/',
    isBack: true,
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"/>
        <polyline points="12 19 5 12 12 5"/>
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
    glowColor: '#f87171',
  },
];

export default function Masters() {
  const navigate = useNavigate();

  return (
    <div className="masters-page">
      {/* Header */}
      <div className="masters-header">
        <h1 className="masters-title">MASTER'S</h1>
        <p className="masters-subtitle">CONFIGURE CORE ENTERPRISE MODULES AND MASTER DATA SETTINGS</p>
      </div>

      {/* Grid */}
      <div className="masters-grid">
        {masterModules.map((mod) => (
          <button
            key={mod.id}
            className={`masters-card ${mod.isBack ? 'back' : ''}`}
            style={{
              '--glow-border': mod.glowColor + '55',
              '--glow-shadow': `0 12px 40px ${mod.glowColor}30`
            }}
            onClick={() => navigate(mod.route)}
          >
            <div className="masters-icon-box" style={{ background: mod.gradient }}>
              <span>
                {mod.icon}
              </span>
            </div>
            <span className={`masters-label ${mod.isBack ? 'masters-label-back' : ''}`}>
              {mod.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}


