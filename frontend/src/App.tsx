import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import Products from './pages/Products';
import Challans from './pages/Challans';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('erp_token'));
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);

  // Sync token changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('erp_token', token);
      fetchUserData();
    } else {
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_user');
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const fetchUserData = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        localStorage.setItem('erp_user', JSON.stringify(data.user));
      } else {
        // Token expired or invalid
        handleLogout();
      }
    } catch (err) {
      console.error('Failed to fetch user verification data', err);
      // Fallback to local storage if offline
      const localUser = localStorage.getItem('erp_user');
      if (localUser) {
        setUser(JSON.parse(localUser));
      } else {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('erp_token', newToken);
    localStorage.setItem('erp_user', JSON.stringify(newUser));
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setCurrentPage('dashboard');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontSize: '16px',
        fontWeight: 500
      }}>
        Initializing Sedona ERP portal...
      </div>
    );
  }

  // If not logged in, show Login view
  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Render view depending on state selection
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard token={token} userRole={user.role} onNavigate={setCurrentPage} />;
      case 'crm':
        return <CRM token={token} userRole={user.role} />;
      case 'products':
        return <Products token={token} userRole={user.role} />;
      case 'challans':
        return <Challans token={token} userRole={user.role} />;
      default:
        return <Dashboard token={token} userRole={user.role} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar 
        userRole={user.role} 
        currentPage={currentPage} 
        onPageChange={setCurrentPage} 
      />

      {/* Main Viewport Panel */}
      <div className="main-content">
        <Navbar user={user} onLogout={handleLogout} />
        {renderPage()}
      </div>
    </div>
  );
};

export default App;
