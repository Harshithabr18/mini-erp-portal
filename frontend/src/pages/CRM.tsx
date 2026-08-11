import React, { useState, useEffect } from 'react';

interface CRMProps {
  token: string;
  userRole: string;
}

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber?: string | null;
  customerType: 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
  address: string;
  status: 'LEAD' | 'ACTIVE' | 'INACTIVE';
  followUpDate?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface FollowUp {
  id: string;
  note: string;
  createdBy: string;
  createdAt: string;
}

const CRM: React.FC<CRMProps> = ({ token, userRole }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Selected Customer details
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [newFollowUpNote, setNewFollowUpNote] = useState('');

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    businessName: '',
    gstNumber: '',
    customerType: 'RETAIL' as Customer['customerType'],
    address: '',
    status: 'LEAD' as Customer['status'],
    followUpDate: '',
    notes: '',
  });

  const isWriteAllowed = ['ADMIN', 'SALES'].includes(userRole);

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      let url = `http://localhost:5000/api/customers?page=${page}&limit=8`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (typeFilter) url += `&type=${typeFilter}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch customers');

      setCustomers(data.customers);
      setTotalCustomers(data.meta.total);
      setTotalPages(data.meta.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search, statusFilter, typeFilter]);

  const handleOpenDetail = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
    setNewFollowUpNote('');
    
    // Fetch detail & followups
    try {
      const res = await fetch(`http://localhost:5000/api/customers/${customer.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setFollowUps(data.followUps || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !newFollowUpNote.trim()) return;

    try {
      const res = await fetch(`http://localhost:5000/api/customers/${selectedCustomer.id}/followups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ note: newFollowUpNote })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add follow-up note');

      setFollowUps([data, ...followUps]);
      setNewFollowUpNote('');
      setSuccess('Follow-up note added successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      mobile: '',
      email: '',
      businessName: '',
      gstNumber: '',
      customerType: 'RETAIL',
      address: '',
      status: 'LEAD',
      followUpDate: '',
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add customer');

      setShowAddModal(false);
      fetchCustomers();
      setSuccess('Customer profile created successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
      businessName: customer.businessName,
      gstNumber: customer.gstNumber || '',
      customerType: customer.customerType,
      address: customer.address,
      status: customer.status,
      followUpDate: customer.followUpDate ? new Date(customer.followUpDate).toISOString().split('T')[0] : '',
      notes: customer.notes || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setError('');

    try {
      const res = await fetch(`http://localhost:5000/api/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update customer');

      setShowEditModal(false);
      if (showDetailModal) {
        setSelectedCustomer(data);
      }
      fetchCustomers();
      setSuccess('Customer profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status: Customer['status']) => {
    switch (status) {
      case 'ACTIVE': return <span className="badge badge-active">Active</span>;
      case 'LEAD': return <span className="badge badge-lead">Lead</span>;
      case 'INACTIVE': return <span className="badge badge-inactive">Inactive</span>;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer CRM Module</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Manage commercial distributors, wholesalers, and retail leads
          </p>
        </div>
        {isWriteAllowed && (
          <button onClick={handleOpenAdd} className="btn btn-primary">
            + Add Customer
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Filters and Search Bar */}
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
            placeholder="Search by name, business, email, or mobile..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div style={{ width: '150px' }}>
          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div style={{ width: '180px' }}>
          <select
            className="form-input"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Types</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
        </div>
      </div>

      {/* Customers List */}
      <div className="table-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            Loading customers database...
          </div>
        ) : customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No customers found. Try relaxing your filters.
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client / Business</th>
                  <th>Contact</th>
                  <th>Type</th>
                  <th>GST Number</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((cust) => (
                  <tr key={cust.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{cust.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cust.businessName}</div>
                    </td>
                    <td>
                      <div>{cust.mobile}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cust.email}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{cust.customerType}</span>
                    </td>
                    <td>
                      <code style={{ fontSize: '12px' }}>{cust.gstNumber || 'N/A'}</code>
                    </td>
                    <td>
                      {getStatusBadge(cust.status)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenDetail(cust)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', marginRight: '6px' }}
                      >
                        Details
                      </button>
                      {isWriteAllowed && (
                        <button
                          onClick={() => handleOpenEdit(cust)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="pagination">
              <span className="pagination-text">
                Showing {customers.length} of {totalCustomers} customers
              </span>
              <div className="pagination-buttons">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px' }}
                >
                  Previous
                </button>
                <span style={{ alignSelf: 'center', margin: '0 12px', fontSize: '13px', fontWeight: 500 }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px' }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 1. VIEW DETAIL MODAL */}
      {showDetailModal && selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Client Details: {selectedCustomer.name}</h2>
              <button onClick={() => setShowDetailModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
                <div>
                  <span className="form-label" style={{ marginBottom: '2px' }}>Business Name</span>
                  <p style={{ fontWeight: 500 }}>{selectedCustomer.businessName}</p>
                </div>
                <div>
                  <span className="form-label" style={{ marginBottom: '2px' }}>GST Registration</span>
                  <p><code>{selectedCustomer.gstNumber || 'Not provided'}</code></p>
                </div>
                <div>
                  <span className="form-label" style={{ marginBottom: '2px' }}>Mobile Number</span>
                  <p>{selectedCustomer.mobile}</p>
                </div>
                <div>
                  <span className="form-label" style={{ marginBottom: '2px' }}>Email Address</span>
                  <p>{selectedCustomer.email}</p>
                </div>
                <div>
                  <span className="form-label" style={{ marginBottom: '2px' }}>Customer Type</span>
                  <p style={{ textTransform: 'capitalize' }}>{selectedCustomer.customerType.toLowerCase()}</p>
                </div>
                <div>
                  <span className="form-label" style={{ marginBottom: '2px' }}>Account Status</span>
                  <p>{getStatusBadge(selectedCustomer.status)}</p>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span className="form-label" style={{ marginBottom: '2px' }}>Billing Address</span>
                  <p style={{ backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '4px', fontSize: '13px' }}>
                    {selectedCustomer.address}
                  </p>
                </div>
                {selectedCustomer.followUpDate && (
                  <div>
                    <span className="form-label" style={{ marginBottom: '2px' }}>Next Scheduled Follow-up</span>
                    <p style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      {new Date(selectedCustomer.followUpDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {selectedCustomer.notes && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span className="form-label" style={{ marginBottom: '2px' }}>Initial Notes</span>
                    <p style={{ fontStyle: 'italic', fontSize: '13px' }}>"{selectedCustomer.notes}"</p>
                  </div>
                )}
              </div>

              {/* Follow Up logs */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>CRM Follow-Up History</h3>
                
                {isWriteAllowed && (
                  <form onSubmit={handleAddFollowUp} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Add a new follow-up progress note..."
                      value={newFollowUpNote}
                      onChange={(e) => setNewFollowUpNote(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                      Add Note
                    </button>
                  </form>
                )}

                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {followUps.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                      No follow-up records logged yet.
                    </p>
                  ) : (
                    followUps.map((fu) => (
                      <div key={fu.id} style={{
                        padding: '10px 12px',
                        backgroundColor: '#f8fafc',
                        borderRadius: 'var(--border-radius-sm)',
                        borderLeft: '3px solid var(--primary)',
                        fontSize: '13px'
                      }}>
                        <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{fu.note}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
                          <span>By: {fu.createdBy}</span>
                          <span>{new Date(fu.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {isWriteAllowed && (
                <button
                  onClick={() => { setShowDetailModal(false); handleOpenEdit(selectedCustomer); }}
                  className="btn btn-primary"
                >
                  Edit Profile
                </button>
              )}
              <button onClick={() => setShowDetailModal(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADD CUSTOMER MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleAddSubmit}>
              <div className="modal-header">
                <h2 className="modal-title">Create Customer Profile</h2>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Client Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Business Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="e.g. Kumar Enterprises"
                    required
                  />
                </div>
                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="e.g. 9876543210"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      className="form-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. ramesh@gmail.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Customer Type *</label>
                    <select
                      className="form-input"
                      value={formData.customerType}
                      onChange={(e) => setFormData({ ...formData, customerType: e.target.value as Customer['customerType'] })}
                      required
                    >
                      <option value="RETAIL">Retail</option>
                      <option value="WHOLESALE">Wholesale</option>
                      <option value="DISTRIBUTOR">Distributor</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST Number (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                      placeholder="e.g. 27AAAAA1111A1Z1"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Billing Address *</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter complete office/billing address"
                    required
                  ></textarea>
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Initial Status *</label>
                    <select
                      className="form-input"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Customer['status'] })}
                      required
                    >
                      <option value="LEAD">Lead</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Follow-up Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.followUpDate}
                      onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Brief background context..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">
                  Create Profile
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. EDIT CUSTOMER MODAL */}
      {showEditModal && selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleEditSubmit}>
              <div className="modal-header">
                <h2 className="modal-title">Edit Customer Profile</h2>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Client Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Business Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    required
                  />
                </div>
                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      className="form-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Customer Type *</label>
                    <select
                      className="form-input"
                      value={formData.customerType}
                      onChange={(e) => setFormData({ ...formData, customerType: e.target.value as Customer['customerType'] })}
                      required
                    >
                      <option value="RETAIL">Retail</option>
                      <option value="WHOLESALE">Wholesale</option>
                      <option value="DISTRIBUTOR">Distributor</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST Number (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Billing Address *</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  ></textarea>
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Account Status *</label>
                    <select
                      className="form-input"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Customer['status'] })}
                      required
                    >
                      <option value="LEAD">Lead</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Next Follow-up Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.followUpDate}
                      onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    />
                  </div>
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
    </div>
  );
};

export default CRM;
