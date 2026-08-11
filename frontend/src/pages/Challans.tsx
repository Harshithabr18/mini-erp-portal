import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

interface ChallansProps {
  token: string;
  userRole: string;
}

interface Customer {
  id: string;
  name: string;
  businessName: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  currentStock: number;
}

interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  customer: { name: string; businessName: string };
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  totalQuantity: number;
  createdBy: string;
  createdAt: string;
  productsSnapshot: string; // JSON string of snapshot items
}

interface ChallanItemBuilder {
  productId: string;
  quantity: number;
  error?: string;
}

const Challans: React.FC<ChallansProps> = ({ token, userRole }) => {
  const [challans, setChallans] = useState<Challan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Selected Challan details
  const [selectedChallan, setSelectedChallan] = useState<Challan | null>(null);

  // Form Fields for creation
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedItems, setSelectedItems] = useState<ChallanItemBuilder[]>([
    { productId: '', quantity: 1 }
  ]);
  const [saveStatus, setSaveStatus] = useState<'DRAFT' | 'CONFIRMED'>('DRAFT');

  const isWriteAllowed = ['ADMIN', 'SALES'].includes(userRole);
  const isStatusUpdateAllowed = ['ADMIN', 'ACCOUNTS', 'SALES'].includes(userRole);

  const fetchChallans = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/challans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch challans');
      setChallans(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomersAndProducts = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const custRes = await fetch(`${API_URL}/api/customers?limit=100`, { headers });
      const custData = await custRes.json();
      if (custRes.ok) setCustomers(custData.customers || []);

      const prodRes = await fetch(`${API_URL}/api/products`, { headers });
      const prodData = await prodRes.json();
      if (prodRes.ok) setProducts(prodData || []);
    } catch (err) {
      console.error('Failed to load customers/products metadata', err);
    }
  };

  useEffect(() => {
    fetchChallans();
    fetchCustomersAndProducts();
  }, [token]);

  const handleOpenAdd = () => {
    setSelectedCustomerId('');
    setSelectedItems([{ productId: '', quantity: 1 }]);
    setSaveStatus('DRAFT');
    setShowAddModal(true);
    setError('');
  };

  const handleAddItemRow = () => {
    setSelectedItems([...selectedItems, { productId: '', quantity: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    const list = [...selectedItems];
    list.splice(index, 1);
    setSelectedItems(list);
  };

  const handleItemChange = (index: number, field: keyof ChallanItemBuilder, value: any) => {
    const list = [...selectedItems];
    list[index] = { ...list[index], [field]: value };
    
    // Auto validate stock in UI if productId & quantity are selected
    if (field === 'productId' || field === 'quantity') {
      const prodId = field === 'productId' ? value : list[index].productId;
      const qty = field === 'quantity' ? parseInt(value) || 0 : list[index].quantity;
      const prod = products.find(p => p.id === prodId);
      
      if (prod) {
        if (prod.currentStock < qty) {
          list[index].error = `Insufficent stock! Available: ${prod.currentStock}`;
        } else {
          list[index].error = undefined;
        }
      }
    }

    setSelectedItems(list);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    if (!selectedCustomerId) {
      setError('Please select a customer.');
      return;
    }

    // Filter invalid empty rows
    const validItems = selectedItems.filter(item => item.productId !== '');
    if (validItems.length === 0) {
      setError('Please select at least one valid product.');
      return;
    }

    // Check for duplicate product entries
    const productIds = validItems.map(i => i.productId);
    const hasDuplicates = productIds.some((val, i) => productIds.indexOf(val) !== i);
    if (hasDuplicates) {
      setError('Duplicate items found. Please merge quantities or select distinct products.');
      return;
    }

    // Check UI validation errors before submitting
    const itemWithErrors = validItems.find(i => i.error);
    if (saveStatus === 'CONFIRMED' && itemWithErrors) {
      setError('Cannot confirm challan with insufficient product stock levels.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/challans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          products: validItems.map(item => ({ productId: item.productId, quantity: item.quantity })),
          status: saveStatus
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit challan');

      setShowAddModal(false);
      fetchChallans();
      // Re-fetch products as stocks might have been updated
      fetchCustomersAndProducts();
      setSuccess(`Challan ${data.challanNumber} issued successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateStatus = async (challanId: string, nextStatus: 'CONFIRMED' | 'CANCELLED') => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/challans/${challanId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Status update failed');

      setShowDetailModal(false);
      fetchChallans();
      fetchCustomersAndProducts(); // refresh products stock
      setSuccess(`Challan status updated to ${nextStatus} successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenDetail = (challan: Challan) => {
    setSelectedChallan(challan);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status: Challan['status']) => {
    switch (status) {
      case 'CONFIRMED': return <span className="badge badge-confirmed">Confirmed</span>;
      case 'DRAFT': return <span className="badge badge-draft">Draft</span>;
      case 'CANCELLED': return <span className="badge badge-cancelled">Cancelled</span>;
    }
  };

  const renderProductsListFromSnapshot = (snapshotJson: string) => {
    try {
      const items: Array<{ productId: string; name: string; sku: string; unitPrice: number; quantity: number }> = 
        JSON.parse(snapshotJson);
      
      let grandTotal = 0;

      return (
        <table className="data-table" style={{ fontSize: '13px', marginTop: '12px' }}>
          <thead>
            <tr>
              <th>Item details</th>
              <th>SKU Code</th>
              <th>Quantity</th>
              <th>Unit price</th>
              <th style={{ textAlign: 'right' }}>Total price</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const rowTotal = it.unitPrice * it.quantity;
              grandTotal += rowTotal;
              return (
                <tr key={idx}>
                  <td style={{ fontWeight: 500 }}>{it.name}</td>
                  <td><code>{it.sku}</code></td>
                  <td>{it.quantity}</td>
                  <td>₹{it.unitPrice.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{rowTotal.toFixed(2)}</td>
                </tr>
              );
            })}
            <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
              <td colSpan={4}>Grand Total Value</td>
              <td style={{ textAlign: 'right', color: 'var(--primary)' }}>₹{grandTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      );
    } catch (err) {
      return <p style={{ color: 'var(--danger)' }}>Error reading product items details.</p>;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Challans Registry</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Issue draft/confirmed commercial challans, deduct inventory, and track invoice logs
          </p>
        </div>
        {isWriteAllowed && (
          <button onClick={handleOpenAdd} className="btn btn-primary">
            + Issue Challan
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Challans List */}
      <div className="table-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            Loading sales challans database...
          </div>
        ) : challans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No challans issued yet.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Challan Number</th>
                <th>Client / Business</th>
                <th>Total Items Qty</th>
                <th>Issuer</th>
                <th>Created Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {challans.map((ch) => (
                <tr key={ch.id}>
                  <td style={{ fontWeight: 600 }}>{ch.challanNumber}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{ch.customer?.name || 'Deleted'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ch.customer?.businessName || 'N/A'}</div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{ch.totalQuantity} units</td>
                  <td>{ch.createdBy}</td>
                  <td>{new Date(ch.createdAt).toLocaleDateString()}</td>
                  <td>{getStatusBadge(ch.status)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => handleOpenDetail(ch)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      View & Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 1. ISSUE NEW CHALLAN MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-header">
                <h2 className="modal-title">Create Sales Challan</h2>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>
                  ✕
                </button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

                <div className="form-group">
                  <label className="form-label">Select Customer *</label>
                  <select
                    className="form-input"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Client Profile --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.businessName})</option>
                    ))}
                  </select>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '20px', paddingTop: '16px' }}>
                  <div className="flex-between" style={{ marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Challan Products List</h3>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      + Add Item Row
                    </button>
                  </div>

                  {selectedItems.map((item, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      marginBottom: '12px',
                      backgroundColor: '#f8fafc',
                      padding: '12px',
                      borderRadius: 'var(--border-radius-sm)',
                      border: item.error ? '1px solid var(--danger)' : '1px solid transparent'
                    }}>
                      <div style={{ flexGrow: 1 }}>
                        <select
                          className="form-input"
                          value={item.productId}
                          onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                          required
                        >
                          <option value="">-- Select Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku}, Stock: {p.currentStock})</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ width: '100px' }}>
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                          required
                        />
                      </div>
                      <div style={{ alignSelf: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(index)}
                          className="btn btn-danger"
                          style={{ padding: '8px 12px', opacity: selectedItems.length > 1 ? 1 : 0.4 }}
                          disabled={selectedItems.length <= 1}
                        >
                          🗑
                        </button>
                      </div>
                      {item.error && (
                        <div style={{ width: '100%', color: 'var(--danger-dark)', fontSize: '11px', fontWeight: 500, marginTop: '4px' }}>
                          ⚠️ {item.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '20px', paddingTop: '16px' }}>
                  <label className="form-label">Issuing Mode *</label>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', fontSize: '14px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="saveStatus"
                        checked={saveStatus === 'DRAFT'}
                        onChange={() => setSaveStatus('DRAFT')}
                        style={{ marginRight: '8px' }}
                      />
                      Save as <strong>Draft</strong> (Does not adjust catalog stocks)
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', fontSize: '14px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="saveStatus"
                        checked={saveStatus === 'CONFIRMED'}
                        onChange={() => setSaveStatus('CONFIRMED')}
                        style={{ marginRight: '8px' }}
                      />
                      Save as <strong>Confirmed</strong> (Immediately deducts stocks from inventory)
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">
                  Submit Challan
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. VIEW DETAILS / AUDIT MODAL */}
      {showDetailModal && selectedChallan && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Manage Challan: {selectedChallan.challanNumber}</h2>
              <button onClick={() => setShowDetailModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="grid-cols-2" style={{ marginBottom: '16px' }}>
                <div>
                  <span className="form-label" style={{ marginBottom: '2px' }}>Client Customer</span>
                  <p style={{ fontWeight: 600 }}>{selectedChallan.customer?.name || 'Deleted'}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedChallan.customer?.businessName || 'N/A'}</p>
                </div>
                <div>
                  <span className="form-label" style={{ marginBottom: '2px' }}>Issued Status</span>
                  <p>{getStatusBadge(selectedChallan.status)}</p>
                </div>
                <div>
                  <span className="form-label" style={{ marginBottom: '2px' }}>Created Date</span>
                  <p>{new Date(selectedChallan.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <span className="form-label" style={{ marginBottom: '2px' }}>Created / Logged By</span>
                  <p style={{ fontWeight: 500 }}>{selectedChallan.createdBy}</p>
                </div>
              </div>

              {/* Items Table from snapshot */}
              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '20px', paddingTop: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Immutable Product Snapshot Data</h3>
                {renderProductsListFromSnapshot(selectedChallan.productsSnapshot)}
              </div>
            </div>
            <div className="modal-footer">
              {/* If Draft: Show Confirm & Cancel */}
              {selectedChallan.status === 'DRAFT' && isStatusUpdateAllowed && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(selectedChallan.id, 'CONFIRMED')}
                    className="btn btn-primary"
                    style={{ backgroundColor: 'var(--success)' }}
                  >
                    Confirm Challan
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedChallan.id, 'CANCELLED')}
                    className="btn btn-danger"
                  >
                    Cancel Challan
                  </button>
                </>
              )}

              {/* If Confirmed: Show Cancel (only for Accounts & Admin) */}
              {selectedChallan.status === 'CONFIRMED' && ['ADMIN', 'ACCOUNTS'].includes(userRole) && (
                <button
                  onClick={() => handleUpdateStatus(selectedChallan.id, 'CANCELLED')}
                  className="btn btn-danger"
                >
                  Cancel & Restore Stocks
                </button>
              )}

              <button onClick={() => setShowDetailModal(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Challans;
