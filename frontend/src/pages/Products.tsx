import React, { useState, useEffect } from 'react';

interface ProductsProps {
  token: string;
  userRole: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  location: string;
  createdAt: string;
}

interface StockLog {
  id: string;
  productId: string;
  product: { name: string; sku: string };
  quantityChanged: number;
  movementType: 'IN' | 'OUT';
  reason: string;
  createdBy: string;
  createdAt: string;
}

const Products: React.FC<ProductsProps> = ({ token, userRole }) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'logs'>('catalog');
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [alertFilter, setAlertFilter] = useState(''); // 'low' or ''

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form Fields for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    unitPrice: 0,
    currentStock: 0,
    minStockAlert: 10,
    location: '',
  });

  // Form Fields for Stock Adjustment
  const [adjustData, setAdjustData] = useState({
    quantityChanged: 1,
    movementType: 'IN' as 'IN' | 'OUT',
    reason: '',
  });

  const isWriteAllowed = ['ADMIN', 'WAREHOUSE'].includes(userRole);
  const isLogsAllowed = ['ADMIN', 'WAREHOUSE'].includes(userRole);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      let url = 'http://localhost:5000/api/products';
      const params: string[] = [];
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (categoryFilter) params.push(`category=${categoryFilter}`);
      if (alertFilter) params.push(`alert=${alertFilter}`);
      
      if (params.length > 0) {
        url += '?' + params.join('&');
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch products');

      setProducts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!isLogsAllowed) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/products/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch logs');

      setLogs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'catalog') {
      fetchProducts();
    } else {
      fetchLogs();
    }
  }, [activeTab, search, categoryFilter, alertFilter]);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      sku: '',
      category: '',
      unitPrice: 0,
      currentStock: 0,
      minStockAlert: 10,
      location: '',
    });
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add product');

      setShowAddModal(false);
      fetchProducts();
      setSuccess('Product registered successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenEdit = (prod: Product) => {
    setSelectedProduct(prod);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      category: prod.category,
      unitPrice: prod.unitPrice,
      currentStock: prod.currentStock, // will not be sent to server for update, but kept for UI
      minStockAlert: prod.minStockAlert,
      location: prod.location,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setError('');

    try {
      const res = await fetch(`http://localhost:5000/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          sku: formData.sku,
          category: formData.category,
          unitPrice: formData.unitPrice,
          minStockAlert: formData.minStockAlert,
          location: formData.location
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update product');

      setShowEditModal(false);
      fetchProducts();
      setSuccess('Product details updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenAdjust = (prod: Product) => {
    setSelectedProduct(prod);
    setAdjustData({
      quantityChanged: 1,
      movementType: 'IN',
      reason: '',
    });
    setShowAdjustModal(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setError('');

    try {
      const res = await fetch(`http://localhost:5000/api/products/${selectedProduct.id}/adjust-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(adjustData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to adjust stock level');

      setShowAdjustModal(false);
      fetchProducts();
      setSuccess(`Inventory adjusted successfully for: ${selectedProduct.name}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Get list of unique categories for the filter
  const categories = ['Electricals', 'Lighting', 'Metals', 'Switches', 'Tools'];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory & Stock Manager</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Monitor materials, locations, current stocks, and manual logistics logs
          </p>
        </div>
        {isWriteAllowed && activeTab === 'catalog' && (
          <button onClick={handleOpenAdd} className="btn btn-primary">
            + Add Product
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Tabs */}
      {isLogsAllowed && (
        <div className="tabs-container">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`tab-button ${activeTab === 'catalog' ? 'active' : ''}`}
          >
            📦 Inventory Catalog
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
          >
            📋 Stock Movement Logs
          </button>
        </div>
      )}

      {activeTab === 'catalog' ? (
        <>
          {/* Filters */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ flexGrow: 1, minWidth: '240px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search by product name or SKU/code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div style={{ width: '180px' }}>
              <select
                className="form-input"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ width: '180px' }}>
              <select
                className="form-input"
                value={alertFilter}
                onChange={(e) => setAlertFilter(e.target.value)}
              >
                <option value="">All Stock Levels</option>
                <option value="low">⚠️ Low Stock Alerts</option>
              </select>
            </div>
          </div>

          {/* Products Table */}
          <div className="table-container">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                Loading inventory catalog...
              </div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                No products found in database.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>SKU / Code</th>
                    <th>Category</th>
                    <th>Unit Price</th>
                    <th>Current Stock</th>
                    <th>Alert Limit</th>
                    <th>Warehouse Location</th>
                    {isWriteAllowed && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {products.map((prod) => {
                    const isLow = prod.currentStock <= prod.minStockAlert;
                    return (
                      <tr key={prod.id} style={{ backgroundColor: isLow ? 'var(--danger-light)50' : 'inherit' }}>
                        <td style={{ fontWeight: 600 }}>{prod.name}</td>
                        <td><code>{prod.sku}</code></td>
                        <td>{prod.category}</td>
                        <td>₹{prod.unitPrice.toFixed(2)}</td>
                        <td>
                          <span style={{ fontWeight: 700, marginRight: '8px' }}>
                            {prod.currentStock}
                          </span>
                          {isLow ? (
                            <span className="badge badge-low-stock">Low Stock</span>
                          ) : (
                            <span className="badge badge-in-stock">In Stock</span>
                          )}
                        </td>
                        <td>{prod.minStockAlert}</td>
                        <td><span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>📍 {prod.location}</span></td>
                        {isWriteAllowed && (
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => handleOpenAdjust(prod)}
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: '12px', marginRight: '6px', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                            >
                              Adjust Stock
                            </button>
                            <button
                              onClick={() => handleOpenEdit(prod)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        /* Stock Logs View */
        <div className="table-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              Loading transaction logs...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              No inventory changes recorded.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Qty Changed</th>
                  <th>Type</th>
                  <th>Reason / Context</th>
                  <th>Log Author</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: 500 }}>{log.product?.name || 'Deleted Product'}</td>
                    <td><code>{log.product?.sku || 'N/A'}</code></td>
                    <td style={{ fontWeight: 600 }}>
                      {log.movementType === 'IN' ? `+${log.quantityChanged}` : `-${log.quantityChanged}`}
                    </td>
                    <td>
                      {log.movementType === 'IN' ? (
                        <span className="badge badge-active" style={{ width: '45px', textAlign: 'center' }}>IN</span>
                      ) : (
                        <span className="badge badge-cancelled" style={{ width: '45px', textAlign: 'center' }}>OUT</span>
                      )}
                    </td>
                    <td>{log.reason}</td>
                    <td>{log.createdBy}</td>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 1. ADD PRODUCT MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleAddSubmit}>
              <div className="modal-header">
                <h2 className="modal-title">Register New Product</h2>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Copper Wire 2.5mm"
                    required
                  />
                </div>
                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">SKU / Code *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="e.g. COP-W-2.5"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      className="form-input"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-cols-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Unit Price (INR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={formData.unitPrice || ''}
                      onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Stock *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.currentStock || ''}
                      onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min Alert Qty *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.minStockAlert || ''}
                      onChange={(e) => setFormData({ ...formData, minStockAlert: parseInt(e.target.value) || 0 })}
                      placeholder="10"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Warehouse Location (Aisle/Bin) *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Warehouse B - Shelf 5"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">
                  Save Product
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. EDIT PRODUCT MODAL */}
      {showEditModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleEditSubmit}>
              <div className="modal-header">
                <h2 className="modal-title">Edit Product Details</h2>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">SKU / Code *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      className="form-input"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-cols-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Unit Price (INR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={formData.unitPrice || ''}
                      onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Current Stock</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.currentStock}
                      disabled
                      style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min Alert Qty *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.minStockAlert || ''}
                      onChange={(e) => setFormData({ ...formData, minStockAlert: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Warehouse Location *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. ADJUST STOCK MODAL */}
      {showAdjustModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <form onSubmit={handleAdjustSubmit}>
              <div className="modal-header">
                <h2 className="modal-title">Adjust Stock Level</h2>
                <button type="button" onClick={() => setShowAdjustModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Adjusting stock for: <strong style={{ color: 'var(--text-primary)' }}>{selectedProduct.name}</strong> (SKU: <code>{selectedProduct.sku}</code>).
                  Current Stock: <strong>{selectedProduct.currentStock} units</strong>.
                </p>

                <div className="grid-cols-2" style={{ marginBottom: '16px' }}>
                  <div>
                    <label className="form-label">Movement Type *</label>
                    <select
                      className="form-input"
                      value={adjustData.movementType}
                      onChange={(e) => setAdjustData({ ...adjustData, movementType: e.target.value as 'IN' | 'OUT' })}
                      required
                    >
                      <option value="IN">IN (Restock/Purchase)</option>
                      <option value="OUT">OUT (Correction/Waste)</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Quantity changed *</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      value={adjustData.quantityChanged}
                      onChange={(e) => setAdjustData({ ...adjustData, quantityChanged: parseInt(e.target.value) || 1 })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason for change *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={adjustData.reason}
                    onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                    placeholder="e.g. Received shipment #562 or Damaged wire scrap"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--success)' }}>
                  Submit Stock Update
                </button>
                <button type="button" onClick={() => setShowAdjustModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
