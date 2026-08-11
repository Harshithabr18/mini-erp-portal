import React from 'react';

interface User {
  name: string;
  email: string;
  role: string;
}

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'badge-active';
      case 'SALES': return 'badge-lead';
      case 'WAREHOUSE': return 'badge-inactive';
      case 'ACCOUNTS': return 'badge-draft';
      default: return '';
    }
  };

  return (
    <header className="navbar">
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Mini ERP + CRM Portal
        </h2>
      </div>
      <div className="navbar-user">
        <div className="user-info">
          <div className="user-name">{user.name}</div>
          <span className={`badge ${getRoleBadgeClass(user.role)} user-role`}>
            {user.role}
          </span>
        </div>
        <button onClick={onLogout} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
          Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;
