import React from 'react';

interface SidebarProps {
  userRole: string;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ userRole, currentPage, onPageChange }) => {
  // Define navigation tabs based on user roles
  const showCRM = ['ADMIN', 'SALES', 'ACCOUNTS'].includes(userRole);
  const showProducts = ['ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS'].includes(userRole);
  const showChallans = ['ADMIN', 'SALES', 'ACCOUNTS'].includes(userRole);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        🚀 <span>SEDONA</span> ERP
      </div>
      <nav style={{ flexGrow: 1 }}>
        <ul className="sidebar-menu">
          <li>
            <button 
              onClick={() => onPageChange('dashboard')} 
              className={`sidebar-item ${currentPage === 'dashboard' ? 'active' : ''}`}
            >
              📊 Dashboard
            </button>
          </li>
          {showCRM && (
            <li>
              <button 
                onClick={() => onPageChange('crm')} 
                className={`sidebar-item ${currentPage === 'crm' ? 'active' : ''}`}
              >
                👥 Customer CRM
              </button>
            </li>
          )}
          {showProducts && (
            <li>
              <button 
                onClick={() => onPageChange('products')} 
                className={`sidebar-item ${currentPage === 'products' ? 'active' : ''}`}
              >
                📦 Products & Stock
              </button>
            </li>
          )}
          {showChallans && (
            <li>
              <button 
                onClick={() => onPageChange('challans')} 
                className={`sidebar-item ${currentPage === 'challans' ? 'active' : ''}`}
              >
                📝 Sales Challans
              </button>
            </li>
          )}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
          Version 1.0.0 (Prisma & SQLite)
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
