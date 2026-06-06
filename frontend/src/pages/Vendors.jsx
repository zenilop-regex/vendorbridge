import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Plus, Search, Edit2, Eye, X, Mail, Phone, MapPin, FileText, Calendar } from 'lucide-react';

const Vendors = () => {
  const { authFetch, user } = useApp();
  const location = useLocation();

  // Data states
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal states
  const [modalType, setModalType] = useState(null); // 'add' | 'edit' | 'detail' | null
  const [selectedVendor, setSelectedVendor] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    gst: '',
    category: 'IT',
    city: '',
    status: 'Active',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Check navigation states (e.g. if opened via Quick Actions "+ Add Vendor")
  useEffect(() => {
    if (location.state?.openAddModal) {
      setModalType('add');
      setFormData({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        gst: '',
        category: 'IT',
        city: '',
        status: 'Active',
        notes: ''
      });
      // Clear navigation state to avoid re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Fetch vendors helper
  const fetchVendors = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (category !== 'All') queryParams.append('category', category);
      if (statusFilter !== 'All') queryParams.append('status', statusFilter);

      const res = await authFetch(`/api/vendors?${queryParams.toString()}`);
      const data = await res.json();
      setVendors(data);
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors();
    }, 300); // Debounce searches
    return () => clearTimeout(timer);
  }, [search, category, statusFilter]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null });
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name) errs.name = 'Company Name is required';
    if (!formData.contactPerson) errs.contactPerson = 'Contact Person is required';
    if (!formData.email) {
      errs.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Email is invalid';
    }
    if (!formData.phone) errs.phone = 'Phone number is required';
    if (!formData.gst) {
      errs.gst = 'GST number is required';
    } else if (formData.gst.length !== 15) {
      errs.gst = 'GSTIN must be exactly 15 characters';
    }
    if (!formData.city) errs.city = 'City is required';

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      let res;
      if (modalType === 'add') {
        res = await authFetch('/api/vendors', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      } else {
        res = await authFetch(`/api/vendors/${selectedVendor._id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Operation failed');

      // Refresh list & close modal
      fetchVendors();
      setModalType(null);
      setSelectedVendor(null);
    } catch (err) {
      setFormErrors({ general: err.message });
    }
  };

  const openEditModal = (vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      name: vendor.name,
      contactPerson: vendor.contactPerson,
      email: vendor.email,
      phone: vendor.phone,
      gst: vendor.gst,
      category: vendor.category,
      city: vendor.city,
      status: vendor.status,
      notes: vendor.notes || ''
    });
    setFormErrors({});
    setModalType('edit');
  };

  const openDetailModal = (vendor) => {
    setSelectedVendor(vendor);
    setModalType('detail');
  };

  const getStatusBadge = (status) => {
    const configs = {
      Active: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
      Inactive: 'bg-amber-950/40 text-amber-400 border-amber-800/40',
      Blacklisted: 'bg-red-950/40 text-red-400 border-red-800/40'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${configs[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Vendor Directory</h1>
          <p className="text-xs text-slate-400">Manage registered partners, categories, and audit ratings</p>
        </div>
        {user.role !== 'Vendor' && (
          <button
            onClick={() => {
              setFormData({
                name: '',
                contactPerson: '',
                email: '',
                phone: '',
                gst: '',
                category: 'IT',
                city: '',
                status: 'Active',
                notes: ''
              });
              setFormErrors({});
              setModalType('add');
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> Add Vendor
          </button>
        )}
      </div>

      {/* Filter panel */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by vendor name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="All">All Categories</option>
            <option value="IT">IT</option>
            <option value="Logistics">Logistics</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Services">Services</option>
            <option value="Raw Materials">Raw Materials</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Blacklisted">Blacklisted</option>
          </select>
        </div>
      </div>

      {/* Vendors Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Vendor Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">GST No</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {vendors.length > 0 ? (
                  vendors.map((vendor) => (
                    <tr key={vendor._id} className="hover:bg-slate-850/30 text-slate-300">
                      <td className="p-4 font-semibold text-white">{vendor.name}</td>
                      <td className="p-4">
                        <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[10px]">
                          {vendor.category}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[11px]">{vendor.gst}</td>
                      <td className="p-4">{vendor.city}</td>
                      <td className="p-4">{getStatusBadge(vendor.status)}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDetailModal(vendor)}
                            className="p-1.5 rounded hover:bg-slate-800 hover:text-white text-slate-400 transition-all"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {user.role !== 'Vendor' && (
                            <button
                              onClick={() => openEditModal(vendor)}
                              className="p-1.5 rounded hover:bg-slate-800 hover:text-white text-slate-400 transition-all"
                              title="Edit Vendor"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-500">
                      No vendors found matching the filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(modalType === 'add' || modalType === 'edit') && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">
                {modalType === 'add' ? 'Register New Vendor' : 'Modify Vendor Profile'}
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-white transition-all focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {formErrors.general && (
                <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/50 text-red-300 text-xs">
                  {formErrors.general}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Company/Vendor Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Infra Supplies Pvt Ltd"
                  />
                  {formErrors.name && <span className="block mt-0.5 text-[10px] text-red-400">{formErrors.name}</span>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Contact Person</label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Amit Shah"
                  />
                  {formErrors.contactPerson && <span className="block mt-0.5 text-[10px] text-red-400">{formErrors.contactPerson}</span>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    name="gst"
                    value={formData.gst}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    placeholder="15-digit GST Number"
                  />
                  {formErrors.gst && <span className="block mt-0.5 text-[10px] text-red-400">{formErrors.gst}</span>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="vendor@company.com"
                  />
                  {formErrors.email && <span className="block mt-0.5 text-[10px] text-red-400">{formErrors.email}</span>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="+91 XXXXX XXXXX"
                  />
                  {formErrors.phone && <span className="block mt-0.5 text-[10px] text-red-400">{formErrors.phone}</span>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Vendor Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="IT">IT</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Services">Services</option>
                    <option value="Raw Materials">Raw Materials</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. Mumbai"
                  />
                  {formErrors.city && <span className="block mt-0.5 text-[10px] text-red-400">{formErrors.city}</span>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Vendor status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Blacklisted">Blacklisted</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Notes / Remarks</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    rows="3"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    placeholder="Enter special capabilities or details..."
                  ></textarea>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                >
                  {modalType === 'add' ? 'Save Vendor' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {modalType === 'detail' && selectedVendor && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-base text-white">{selectedVendor.name}</h3>
                {getStatusBadge(selectedVendor.status)}
              </div>
              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-white transition-all focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Profile details */}
              <div className="md:col-span-2 space-y-4">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Vendor Details</h4>
                <div className="grid grid-cols-2 gap-4 text-xs text-slate-300">
                  <div>
                    <span className="block text-slate-500 text-[10px] uppercase font-semibold">Contact Person</span>
                    <span className="font-semibold text-white">{selectedVendor.contactPerson}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px] uppercase font-semibold">GSTIN</span>
                    <span className="font-mono text-white">{selectedVendor.gst}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <div>
                      <span className="block text-slate-500 text-[10px] uppercase font-semibold">Email</span>
                      <a href={`mailto:${selectedVendor.email}`} className="text-indigo-400 hover:underline">{selectedVendor.email}</a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <div>
                      <span className="block text-slate-500 text-[10px] uppercase font-semibold">Phone</span>
                      <span>{selectedVendor.phone}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <div>
                      <span className="block text-slate-500 text-[10px] uppercase font-semibold">City</span>
                      <span>{selectedVendor.city}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <div>
                      <span className="block text-slate-500 text-[10px] uppercase font-semibold">Category</span>
                      <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[10px]">
                        {selectedVendor.category}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800/60 pt-4">
                  <span className="block text-slate-500 text-[10px] uppercase font-semibold mb-1">Special Notes / Description</span>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 border border-slate-800/60 p-3 rounded-lg">
                    {selectedVendor.notes || 'No notes added for this vendor.'}
                  </p>
                </div>
              </div>

              {/* Activity Timeline Placeholder */}
              <div className="border-t md:border-t-0 md:border-l border-slate-800/80 pt-6 md:pt-0 md:pl-6 space-y-4">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Activity History</h4>
                
                <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  <div className="flex gap-3 text-xs relative">
                    <div className="w-4.5 h-4.5 rounded-full bg-slate-950 border-2 border-emerald-500 flex items-center justify-center z-10 shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200">Vendor Onboarded</p>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" /> {new Date(selectedVendor.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 text-xs relative">
                    <div className="w-4.5 h-4.5 rounded-full bg-slate-950 border-2 border-slate-800 flex items-center justify-center z-10 shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-400">Profile Verified</p>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        GST Verification Complete
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setModalType(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold transition-all"
              >
                Close
              </button>
              {user.role !== 'Vendor' && (
                <button
                  onClick={() => openEditModal(selectedVendor)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;
