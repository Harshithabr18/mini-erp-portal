import React, { useState, useEffect } from 'react';

interface DashboardProps {
  token: string;
  userRole: string;
  onNavigate: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ token, userRole, onNavigate }) => {
  const [stats, setStats] = useState({
    customers: 0,
    products: 0,
    lowStock: 0,
    challans: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoading(true);
      setError('');
      try {
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch Customers, Products, Challans
        // Handle gracefully if a role doesn't have permissions to a certain endpoint
        let customerCount = 0;
        let productCount = 0;
        let lowStockCount = 0;
        let challanCount = 0;

        if (['ADMIN', 'SALES', 'ACCOUNTS'].includes(userRole)) {
          const res = await fetch('http://localhost:5000/api/customers?limit=1', { headers });
          if (res.ok) {
            const data = await res.json();
            customerCount = data.meta.total;
          }
        }

        if (['ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS'].includes(userRole)) {
          const res = await fetch('http://localhost:5000/api/products', { headers });
          if (res.ok) {
            const data = await res.json();
            productCount = data.length;
            lowStockCount = data.filter((p: any) => p.currentStock <= p.minStockAlert).length;
          }
        }

        if (['ADMIN', 'SALES', 'ACCOUNTS'].includes(userRole)) {
          const res = await fetch('http://localhost:5000/api/challans', { headers });
          if (res.ok) {
            const data = await res.json();
            challanCount = data.length;
          }
        }

        setStats({
          customers: customerCount,
          products: productCount,
          lowStock: lowStockCount,
          challans: challanCount,
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Failed to load some dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [token, userRole]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Operational Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Real-time status overview of business logistics
          </p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Loading dashboard metrics...
        </div>
      ) : (
        <>
          <div className="card-grid">
            {['ADMIN', 'SALES', 'ACCOUNTS'].includes(userRole) && (
              <div className="stat-card" onClick={() => onNavigate('crm')} style={{ cursor: 'pointer' }}>
                <span className="stat-label">👥 Active CRM Customers</span>
                <span className="stat-value">{stats.customers}</span>
                <span style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '8px', fontWeight: 500 }}>
                  Manage leads & contacts →
                </span>
              </div>
            )}

            <div className="stat-card" onClick={() => onNavigate('products')} style={{ cursor: 'pointer' }}>
              <span className="stat-label">📦 Catalog Products</span>
              <span className="stat-value">{stats.products}</span>
              <span style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '8px', fontWeight: 500 }}>
                Check storage inventory →
              </span>
            </div>

            <div className="stat-card" onClick={() => onNavigate('products')} style={{ cursor: 'pointer', borderLeft: stats.lowStock > 0 ? '4px solid var(--danger)' : '1px solid var(--border-color)' }}>
              <span className="stat-label">⚠️ Low Stock Alerts</span>
              <span className="stat-value" style={{ color: stats.lowStock > 0 ? 'var(--danger)' : 'inherit' }}>
                {stats.lowStock}
              </span>
              <span style={{ fontSize: '12px', color: stats.lowStock > 0 ? 'var(--danger-dark)' : 'var(--text-muted)', marginTop: '8px', fontWeight: 500 }}>
                {stats.lowStock > 0 ? 'Urgent reorder required →' : 'Inventory levels optimal'}
              </span>
            </div>

            {['ADMIN', 'SALES', 'ACCOUNTS'].includes(userRole) && (
              <div className="stat-card" onClick={() => onNavigate('challans')} style={{ cursor: 'pointer' }}>
                <span className="stat-label">📝 Sales Challans Issued</span>
                <span className="stat-value">{stats.challans}</span>
                <span style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '8px', fontWeight: 500 }}>
                  View invoices & drafts →
                </span>
              </div>
            )}
          </div>

          <div style={{
            background: 'white',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
            marginTop: '12px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Role Quick-Guide</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: 'var(--border-radius-sm)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>Sales</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Add/edit customer profiles, record contact follow-up logs, and write Sales Challans in Draft or Confirmed.
                </p>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: 'var(--border-radius-sm)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--success-dark)', marginBottom: '4px' }}>Warehouse</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Monitor stock thresholds, manage warehouse bins, adjust stock counts manually, and view movement logs.
                </p>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: 'var(--border-radius-sm)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--warning-dark)', marginBottom: '4px' }}>Accounts</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Audit sales transaction logs, view inventory details, and change challan status (Confirm draft or Cancel).
                </p>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: 'var(--border-radius-sm)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Admin</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Superuser access. Override operations, control inventory catalogs, audit follow-ups, and transition challan states.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
