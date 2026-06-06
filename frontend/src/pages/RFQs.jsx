import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Plus,
  Search,
  Eye,
  X,
  Calendar,
  AlertCircle,
  CheckCircle,
  FileText,
  User,
  PlusCircle,
  Trash2,
  Check,
  Send,
  Sparkles,
  ArrowLeft,
  DollarSign
} from 'lucide-react';

const RFQs = () => {
  const { authFetch, user } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  // Core Data States
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorList, setVendorList] = useState([]); // for assigning vendors in wizard

  // View management
  const [activeView, setActiveView] = useState('list'); // 'list' | 'detail'
  const [selectedRfqId, setSelectedRfqId] = useState(null);
  const [rfqDetail, setRfqDetail] = useState(null); // { rfq, quotations }

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Wizard States (for creating RFQ)
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [rfqForm, setRfqForm] = useState({
    title: '',
    description: '',
    category: 'IT',
    deadline: '',
    lineItems: [{ name: '', description: '', qty: 1, unit: 'pcs' }],
    assignedVendors: []
  });
  const [wizardErrors, setWizardErrors] = useState({});

  // Quotation Submission Modal State (for Vendor)
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    lineItems: [],
    gstPercent: 18,
    paymentTerms: 'Net 30',
    deliveryTimeline: '10 Days',
    validityDate: '',
    notes: ''
  });
  const [quoteErrors, setQuoteErrors] = useState({});

  // Handle query parameter flags (e.g. from quick actions Dashboard)
  useEffect(() => {
    if (location.state?.openCreateModal) {
      handleOpenWizard();
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Load RFQ List
  const fetchRfqs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'All') queryParams.append('status', statusFilter);
      if (categoryFilter !== 'All') queryParams.append('category', categoryFilter);

      const res = await authFetch(`/api/rfq?${queryParams.toString()}`);
      const data = await res.json();
      setRfqs(data);
    } catch (err) {
      console.error('Error fetching RFQs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRfqs();
  }, [statusFilter, categoryFilter]);

  // Load Single RFQ Details
  const fetchRfqDetail = async (id) => {
    try {
      const res = await authFetch(`/api/rfq/${id}`);
      const data = await res.json();
      setRfqDetail(data); // data = { rfq, quotations }
      setSelectedRfqId(id);
      setActiveView('detail');
    } catch (err) {
      console.error('Error fetching RFQ detail:', err);
    }
  };

  // Fetch Category specific vendors for wizard
  const fetchCategoryVendors = async (categoryName) => {
    try {
      const res = await authFetch(`/api/vendors?category=${categoryName}`);
      const data = await res.json();
      setVendorList(data.filter(v => v.status === 'Active'));
    } catch (err) {
      console.error('Error fetching vendors for category:', err);
    }
  };

  // Wizard actions
  const handleOpenWizard = () => {
    setRfqForm({
      title: '',
      description: '',
      category: 'IT',
      deadline: '',
      lineItems: [{ name: '', description: '', qty: 1, unit: 'pcs' }],
      assignedVendors: []
    });
    setWizardErrors({});
    setWizardStep(1);
    setWizardOpen(true);
    fetchCategoryVendors('IT');
  };

  const handleNextStep = () => {
    const errs = {};
    if (wizardStep === 1) {
      if (!rfqForm.title) errs.title = 'Title is required';
      if (!rfqForm.description) errs.description = 'Description is required';
      if (!rfqForm.deadline) errs.deadline = 'Deadline is required';
      else if (new Date(rfqForm.deadline) < new Date()) {
        errs.deadline = 'Deadline cannot be in the past';
      }
      if (Object.keys(errs).length > 0) {
        setWizardErrors(errs);
        return;
      }
      // Load vendors for next step's vendor listing
      fetchCategoryVendors(rfqForm.category);
    }

    if (wizardStep === 2) {
      // Validate line items
      const itemErrors = [];
      rfqForm.lineItems.forEach((item, index) => {
        if (!item.name) {
          errs[`lineItem_${index}_name`] = 'Item name is required';
        }
        if (item.qty <= 0) {
          errs[`lineItem_${index}_qty`] = 'Qty must be greater than 0';
        }
      });
      if (Object.keys(errs).length > 0) {
        setWizardErrors(errs);
        return;
      }
    }

    setWizardErrors({});
    setWizardStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setWizardStep(prev => prev - 1);
  };

  // Dynamic Line item functions in Wizard
  const addLineItem = () => {
    setRfqForm({
      ...rfqForm,
      lineItems: [...rfqForm.lineItems, { name: '', description: '', qty: 1, unit: 'pcs' }]
    });
  };

  const deleteLineItem = (index) => {
    if (rfqForm.lineItems.length === 1) return;
    const items = [...rfqForm.lineItems];
    items.splice(index, 1);
    setRfqForm({ ...rfqForm, lineItems: items });
  };

  const updateLineItem = (index, field, value) => {
    const items = [...rfqForm.lineItems];
    items[index][field] = value;
    setRfqForm({ ...rfqForm, lineItems: items });
    // clear errors
    if (wizardErrors[`lineItem_${index}_${field}`]) {
      setWizardErrors({ ...wizardErrors, [`lineItem_${index}_${field}`]: null });
    }
  };

  const handleVendorToggle = (vendorId) => {
    const selected = [...rfqForm.assignedVendors];
    const index = selected.indexOf(vendorId);
    if (index > -1) {
      selected.splice(index, 1);
    } else {
      selected.push(vendorId);
    }
    setRfqForm({ ...rfqForm, assignedVendors: selected });
  };

  const handleSaveRfq = async (status) => {
    if (rfqForm.assignedVendors.length === 0) {
      setWizardErrors({ assignedVendors: 'Please assign at least one vendor' });
      return;
    }

    try {
      const res = await authFetch('/api/rfq', {
        method: 'POST',
        body: JSON.stringify({ ...rfqForm, status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save RFQ');

      setWizardOpen(false);
      fetchRfqs();
    } catch (err) {
      setWizardErrors({ general: err.message });
    }
  };

  // Vendor Quotation Actions
  const handleOpenQuoteModal = () => {
    // Check if user has an associated vendor ID
    // We can lookup in our seeded data: the user vendor@infra-supplies.com is associated with Infra Supplies
    // The dashboard stats endpoint returns the vendorId in dashboardStats if user is Vendor.
    // Let's call dashboard stats to fetch the vendor ID if needed, or query '/api/vendors' with user email.
    
    // We prepare the quotation line items matching RFQ line items
    const quoteItems = rfqDetail.rfq.lineItems.map(item => ({
      name: item.name,
      description: item.description,
      qty: item.qty,
      unit: item.unit,
      unitPrice: 0,
      totalPrice: 0
    }));

    // Today + 7 days
    const validity = new Date();
    validity.setDate(validity.getDate() + 14);

    setQuoteForm({
      lineItems: quoteItems,
      gstPercent: 18,
      paymentTerms: 'Net 30',
      deliveryTimeline: '10 Days',
      validityDate: validity.toISOString().split('T')[0],
      notes: ''
    });
    setQuoteErrors({});
    setQuoteModalOpen(true);
  };

  const updateQuoteItemPrice = (index, price) => {
    const items = [...quoteForm.lineItems];
    const parsedPrice = parseFloat(price) || 0;
    items[index].unitPrice = parsedPrice;
    items[index].totalPrice = parsedPrice * items[index].qty;
    setQuoteForm({ ...quoteForm, lineItems: items });
  };

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    
    // Validate unit prices
    const errs = {};
    quoteForm.lineItems.forEach((item, index) => {
      if (item.unitPrice <= 0) {
        errs[`item_${index}_price`] = 'Required';
      }
    });

    if (Object.keys(errs).length > 0) {
      setQuoteErrors(errs);
      return;
    }

    try {
      // First, get Vendor object matching this logged-in user email
      const vendorRes = await authFetch('/api/vendors');
      const vendors = await vendorRes.json();
      const vendor = vendors.find(v => v.email === user.email);

      if (!vendor) {
        throw new Error('Your user account is not linked to any registered Vendor profile.');
      }

      const payload = {
        rfqId: rfqDetail.rfq._id,
        vendorId: vendor._id,
        lineItems: quoteForm.lineItems,
        gstPercent: quoteForm.gstPercent,
        paymentTerms: quoteForm.paymentTerms,
        deliveryTimeline: quoteForm.deliveryTimeline,
        notes: quoteForm.notes,
        validityDate: quoteForm.validityDate
      };

      const res = await authFetch('/api/quotations', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');

      setQuoteModalOpen(false);
      // Reload details to show updated quotations
      fetchRfqDetail(rfqDetail.rfq._id);
    } catch (err) {
      setQuoteErrors({ general: err.message });
    }
  };

  const handlePublishRfq = async (id) => {
    try {
      const res = await authFetch(`/api/rfq/${id}/publish`, { method: 'PUT' });
      if (!res.ok) throw new Error('Publishing failed');
      fetchRfqDetail(id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSelectForApproval = async (quote) => {
    try {
      const subtotal = quote.lineItems.reduce((acc, item) => acc + item.totalPrice, 0);
      const totalAmount = subtotal + (subtotal * (quote.gstPercent / 100));

      const res = await authFetch('/api/approvals', {
        method: 'POST',
        body: JSON.stringify({
          rfqId: rfqDetail.rfq._id,
          quotationId: quote._id,
          vendorId: quote.vendorId._id,
          amount: totalAmount
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit selection for approval');

      alert('Selection submitted for Manager approval successfully!');
      navigate('/approvals');
    } catch (err) {
      alert(err.message);
    }
  };

  // Get status class for badges
  const getStatusClass = (status) => {
    const configs = {
      Draft: 'bg-slate-800 text-slate-400 border-slate-700',
      Open: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
      Closed: 'bg-amber-950/40 text-amber-400 border-amber-800/40',
      Completed: 'bg-indigo-950/40 text-indigo-400 border-indigo-800/40'
    };
    return `px-2 py-0.5 rounded text-[10px] font-semibold border ${configs[status] || 'bg-slate-900 text-slate-400 border-slate-800'}`;
  };

  return (
    <div className="space-y-6">
      {activeView === 'list' ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Requests for Quotations (RFQ)</h1>
              <p className="text-xs text-slate-400">Launch and track tender items, receive submissions, and perform bid evaluations</p>
            </div>
            {user.role === 'Procurement Officer' && (
              <button
                onClick={handleOpenWizard}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
              >
                <Plus className="w-4 h-4" /> Create RFQ
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
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
          </div>

          {/* List Table */}
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
                      <th className="p-4">RFQ ID</th>
                      <th className="p-4">RFQ Title</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Deadline</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {rfqs.length > 0 ? (
                      rfqs.map((rfq) => (
                        <tr key={rfq._id} className="hover:bg-slate-850/30 text-slate-300">
                          <td className="p-4 font-mono font-semibold text-indigo-400">{rfq.rfqId}</td>
                          <td className="p-4 font-semibold text-white">{rfq.title}</td>
                          <td className="p-4">{rfq.category}</td>
                          <td className="p-4">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {new Date(rfq.deadline).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="p-4">{getStatusBadge(rfq.status)}</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => fetchRfqDetail(rfq._id)}
                              className="p-1.5 rounded hover:bg-slate-800 hover:text-white text-slate-400 transition-all inline-flex items-center gap-1"
                              title="View RFQ"
                            >
                              <Eye className="w-4 h-4" /> View
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-500">
                          No RFQs available under selected filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* RFQ Detail View */
        rfqDetail && (
          <div className="space-y-6">
            {/* Detail Navigation Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setActiveView('list');
                  fetchRfqs();
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Back to list
              </button>

              <div className="flex items-center gap-3">
                {user.role === 'Procurement Officer' && rfqDetail.rfq.status === 'Draft' && (
                  <button
                    onClick={() => handlePublishRfq(rfqDetail.rfq._id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                  >
                    <Send className="w-3.5 h-3.5" /> Publish RFQ
                  </button>
                )}

                {user.role === 'Vendor' && rfqDetail.rfq.status === 'Open' && (
                  // Check if this vendor has already submitted a quotation
                  (() => {
                    const submitted = rfqDetail.quotations.some(q => q.vendorId.email === user.email);
                    if (submitted) {
                      return (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 rounded-lg text-xs font-semibold">
                          <CheckCircle className="w-4 h-4" /> Quotation Submitted
                        </span>
                      );
                    } else {
                      return (
                        <button
                          onClick={handleOpenQuoteModal}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                        >
                          <Plus className="w-4 h-4" /> Submit Quotation
                        </button>
                      );
                    }
                  })()
                )}

                {/* If approved selection exists, and user is Procurement Officer, show button to generate PO */}
                {user.role === 'Procurement Officer' && rfqDetail.rfq.status === 'Closed' && (
                  (() => {
                    // Check if there is an approved quotation
                    const approvedQuote = rfqDetail.quotations.find(q => q.status === 'selected');
                    if (approvedQuote) {
                      return (
                        <button
                          onClick={async () => {
                            try {
                              // We need the approval ID. We can fetch approvals from API
                              const res = await authFetch('/api/approvals?status=APPROVED');
                              const approvals = await res.json();
                              const approval = approvals.find(a => a.rfqId._id === rfqDetail.rfq._id);
                              
                              if (approval) {
                                // Create PO
                                const poRes = await authFetch('/api/po', {
                                  method: 'POST',
                                  body: JSON.stringify({ approvalId: approval._id })
                                });
                                if (!poRes.ok) throw new Error('Failed to generate PO');
                                alert('Purchase Order Generated successfully!');
                                navigate('/invoices');
                              } else {
                                alert('Could not resolve approved request.');
                              }
                            } catch (err) {
                              alert(err.message);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                        >
                          <Check className="w-4 h-4" /> Generate Purchase Order
                        </button>
                      );
                    }
                  })()
                )}
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* RFQ Meta Info */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="font-mono text-xs font-semibold text-indigo-400 uppercase tracking-wide">
                      {rfqDetail.rfq.rfqId}
                    </span>
                    <h2 className="text-lg font-bold text-white mt-1">{rfqDetail.rfq.title}</h2>
                  </div>
                  {getStatusBadge(rfqDetail.rfq.status)}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="block text-slate-500 text-[10px] uppercase font-semibold">Category</span>
                    <span className="font-semibold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800 inline-block mt-0.5">
                      {rfqDetail.rfq.category}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px] uppercase font-semibold">Deadline</span>
                    <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      {new Date(rfqDetail.rfq.deadline).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px] uppercase font-semibold">Created By</span>
                    <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
                      <User className="w-4 h-4 text-slate-500" />
                      {rfqDetail.rfq.createdBy?.name || 'Procurement Team'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="block text-slate-500 text-[10px] uppercase font-semibold mb-1">Description</span>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 border border-slate-800/60 p-4 rounded-lg">
                    {rfqDetail.rfq.description}
                  </p>
                </div>

                {/* Line Items Table */}
                <div>
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Line Items Specifications</h3>
                  <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/20">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/40 font-bold text-slate-400 uppercase">
                          <th className="p-3">#</th>
                          <th className="p-3">Item Specification</th>
                          <th className="p-3">Description</th>
                          <th className="p-3 text-center">Required Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {rfqDetail.rfq.lineItems.map((item, index) => (
                          <tr key={item._id || index} className="text-slate-300">
                            <td className="p-3 text-slate-500">{index + 1}</td>
                            <td className="p-3 font-semibold text-white">{item.name}</td>
                            <td className="p-3">{item.description || 'N/A'}</td>
                            <td className="p-3 text-center font-semibold text-white">
                              {item.qty} {item.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Invited Vendors Status panel */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider border-b border-slate-800 pb-3">
                  Invited Vendors Status
                </h3>

                <div className="space-y-4">
                  {rfqDetail.rfq.assignedVendors.map((vendor) => {
                    const submission = rfqDetail.quotations.find(q => q.vendorId._id === vendor._id);
                    return (
                      <div key={vendor._id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-850">
                        <div>
                          <p className="text-xs font-bold text-white">{vendor.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{vendor.contactPerson}</p>
                        </div>
                        {submission ? (
                          <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Submitted
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quotations comparison grid (Visible only to Procurement Officer or Admin) */}
            {(user.role === 'Procurement Officer' || user.role === 'Admin') && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Submitted Bid Quotations</h3>
                    <p className="text-xs text-slate-400">Review vendor responses, terms, and compare matrix costs</p>
                  </div>
                  {rfqDetail.quotations.length > 1 && (
                    <button
                      onClick={() => navigate(`/rfqs/${rfqDetail.rfq._id}/compare`)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all border border-slate-700"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Comparison Matrix
                    </button>
                  )}
                </div>

                {rfqDetail.quotations.length > 0 ? (
                  <div className="border border-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/40 font-bold text-slate-400 uppercase">
                          <th className="p-3">Vendor Name</th>
                          <th className="p-3 text-center">Subtotal</th>
                          <th className="p-3 text-center">GST Tax</th>
                          <th className="p-3 text-center">Grand Total</th>
                          <th className="p-3 text-center">Delivery Timeline</th>
                          <th className="p-3 text-center">Payment Terms</th>
                          <th className="p-3 text-right">Selection Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {rfqDetail.quotations.map((quote) => {
                          const subtotal = quote.lineItems.reduce((acc, item) => acc + item.totalPrice, 0);
                          const total = subtotal + (subtotal * (quote.gstPercent / 100));
                          
                          return (
                            <tr key={quote._id} className="hover:bg-slate-850/20">
                              <td className="p-3 font-semibold text-white">{quote.vendorId.name}</td>
                              <td className="p-3 text-center font-mono">INR {subtotal.toLocaleString()}</td>
                              <td className="p-3 text-center font-mono text-slate-400">{quote.gstPercent}%</td>
                              <td className="p-3 text-center font-mono font-bold text-indigo-400">INR {total.toLocaleString()}</td>
                              <td className="p-3 text-center">{quote.deliveryTimeline}</td>
                              <td className="p-3 text-center">{quote.paymentTerms}</td>
                              <td className="p-3 text-right">
                                {quote.status === 'selected' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-emerald-950/40 text-emerald-400 border-emerald-800/40">
                                    Approved & Awarded
                                  </span>
                                ) : quote.status === 'rejected' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-red-950/40 text-red-400 border-red-800/40">
                                    Rejected
                                  </span>
                                ) : rfqDetail.rfq.status === 'Open' ? (
                                  <button
                                    onClick={() => handleSelectForApproval(quote)}
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-semibold shadow transition-all"
                                  >
                                    Select vendor
                                  </button>
                                ) : (
                                  <span className="text-slate-500 text-[10px]">Awaiting Processing</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg text-xs">
                    No vendor has submitted a bid quotation yet.
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}

      {/* Multi-Step Creation Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Create Request for Quotation</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Follow steps to build details, add items, and match category vendors</p>
              </div>
              <button
                onClick={() => setWizardOpen(false)}
                className="text-slate-400 hover:text-white transition-all focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper indicator */}
            <div className="bg-slate-950/50 border-b border-slate-800 px-8 py-4 flex items-center justify-between text-xs font-semibold text-slate-400">
              {['Basic Details', 'Line Items', 'Vendor Assignment', 'Review'].map((step, idx) => {
                const stepNum = idx + 1;
                const isActive = wizardStep === stepNum;
                const isDone = wizardStep > stepNum;
                return (
                  <div key={step} className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                      isActive
                        ? 'border-indigo-600 bg-indigo-600/10 text-indigo-400'
                        : isDone
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-slate-800 bg-slate-950 text-slate-600'
                    }`}>
                      {isDone ? '✓' : stepNum}
                    </span>
                    <span className={isActive ? 'text-indigo-400 font-bold' : isDone ? 'text-slate-300' : 'text-slate-500'}>
                      {step}
                    </span>
                    {idx < 3 && <div className="hidden sm:block w-8 h-px bg-slate-800"></div>}
                  </div>
                );
              })}
            </div>

            {/* Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {wizardErrors.general && (
                <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/50 text-red-300 text-xs">
                  {wizardErrors.general}
                </div>
              )}

              {/* Step 1: Details */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">RFQ Title</label>
                    <input
                      type="text"
                      value={rfqForm.title}
                      onChange={(e) => setRfqForm({ ...rfqForm, title: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g. Mechanical pipe joint assemblies"
                    />
                    {wizardErrors.title && <span className="block mt-0.5 text-[10px] text-red-400">{wizardErrors.title}</span>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Category Category</label>
                      <select
                        value={rfqForm.category}
                        onChange={(e) => {
                          setRfqForm({ ...rfqForm, category: e.target.value, assignedVendors: [] });
                          fetchCategoryVendors(e.target.value);
                        }}
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
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Submission Deadline</label>
                      <input
                        type="date"
                        value={rfqForm.deadline}
                        onChange={(e) => setRfqForm({ ...rfqForm, deadline: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      {wizardErrors.deadline && <span className="block mt-0.5 text-[10px] text-red-400">{wizardErrors.deadline}</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Tender Scope/Description</label>
                    <textarea
                      value={rfqForm.description}
                      onChange={(e) => setRfqForm({ ...rfqForm, description: e.target.value })}
                      rows="4"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      placeholder="Enter specifications, standards, certifications required..."
                    ></textarea>
                    {wizardErrors.description && <span className="block mt-0.5 text-[10px] text-red-400">{wizardErrors.description}</span>}
                  </div>
                </div>
              )}

              {/* Step 2: Line Items */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">Items specifications</h4>
                    <button
                      type="button"
                      onClick={addLineItem}
                      className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300"
                    >
                      <PlusCircle className="w-4 h-4" /> Add Item Row
                    </button>
                  </div>

                  <div className="space-y-3">
                    {rfqForm.lineItems.map((item, index) => (
                      <div key={index} className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3 relative">
                        {rfqForm.lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteLineItem(index)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Item Specification Name</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateLineItem(index, 'name', e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                              placeholder="e.g. Copper wire 2.5mm"
                            />
                            {wizardErrors[`lineItem_${index}_name`] && (
                              <span className="block mt-0.5 text-[9px] text-red-400">{wizardErrors[`lineItem_${index}_name`]}</span>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Unit</label>
                            <select
                              value={item.unit}
                              onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-905 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
                            >
                              <option value="pcs">Pieces (pcs)</option>
                              <option value="meter">Meters (m)</option>
                              <option value="kg">Kilograms (kg)</option>
                              <option value="box">Boxes (box)</option>
                              <option value="hours">Hours (hrs)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Details/Requirements</label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                              placeholder="e.g. PVC insulated multi-strand ISO certified"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Qty</label>
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) => updateLineItem(index, 'qty', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                            />
                            {wizardErrors[`lineItem_${index}_qty`] && (
                              <span className="block mt-0.5 text-[9px] text-red-400">{wizardErrors[`lineItem_${index}_qty`]}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Vendor Assignment */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-950/20 border border-indigo-850 rounded-lg text-xs text-indigo-400 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Automated Vendor Matching</p>
                      <p className="text-[10px] mt-0.5 text-slate-400">
                        Listing active vendors matching category: <strong className="text-white">{rfqForm.category}</strong>. Assign which partners can view and bid.
                      </p>
                    </div>
                  </div>

                  {wizardErrors.assignedVendors && (
                    <span className="block text-xs text-red-400">{wizardErrors.assignedVendors}</span>
                  )}

                  <div className="space-y-2">
                    {vendorList.length > 0 ? (
                      vendorList.map((vendor) => {
                        const isChecked = rfqForm.assignedVendors.includes(vendor._id);
                        return (
                          <div
                            key={vendor._id}
                            onClick={() => handleVendorToggle(vendor._id)}
                            className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                              isChecked
                                ? 'bg-indigo-950/20 border-indigo-650'
                                : 'bg-slate-950 border-slate-850 hover:border-slate-700'
                            }`}
                          >
                            <div>
                              <p className="text-xs font-bold text-white">{vendor.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{vendor.contactPerson} • {vendor.city}</p>
                            </div>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                              isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-800 bg-slate-950'
                            }`}>
                              {isChecked && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-lg text-xs">
                        No active vendors registered under category "{rfqForm.category}"
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg space-y-3 text-xs">
                    <h4 className="font-bold text-white text-sm border-b border-slate-800 pb-2">{rfqForm.title}</h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-slate-400">
                      <div>
                        <span className="text-[10px] block uppercase font-bold text-slate-500">Category</span>
                        <span className="font-semibold text-white">{rfqForm.category}</span>
                      </div>
                      <div>
                        <span className="text-[10px] block uppercase font-bold text-slate-500">Deadline</span>
                        <span className="font-semibold text-white">{new Date(rfqForm.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] block uppercase font-bold text-slate-500">Scope Description</span>
                      <p className="text-slate-300 leading-normal mt-0.5">{rfqForm.description}</p>
                    </div>

                    <div>
                      <span className="text-[10px] block uppercase font-bold text-slate-500 mb-1">Assigned Specifications ({rfqForm.lineItems.length})</span>
                      <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                        {rfqForm.lineItems.map((item, idx) => (
                          <li key={idx} className="font-medium">
                            {item.name} - {item.qty} {item.unit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="text-[10px] block uppercase font-bold text-slate-500 mb-1">Invited Vendors ({rfqForm.assignedVendors.length})</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {rfqForm.assignedVendors.map((vendorId) => {
                          const vObj = vendorList.find(v => v._id === vendorId);
                          return (
                            <span key={vendorId} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-semibold text-indigo-400">
                              {vObj ? vObj.name : 'Unknown Vendor'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-950/20 flex justify-between items-center">
              <div>
                {wizardStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold transition-all"
                  >
                    Back
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setWizardOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                {wizardStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                  >
                    Continue
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveRfq('Draft')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-750 transition-all"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveRfq('Open')}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                    >
                      Publish Tender
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Submit Quotation Modal */}
      {quoteModalOpen && rfqDetail && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Submit Bid Quotation</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Tender ID: {rfqDetail.rfq.rfqId} • Title: {rfqDetail.rfq.title}</p>
              </div>
              <button
                onClick={() => setQuoteModalOpen(false)}
                className="text-slate-400 hover:text-white transition-all focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuoteSubmit} className="p-6 flex-1 overflow-y-auto space-y-4">
              {quoteErrors.general && (
                <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/50 text-red-300 text-xs">
                  {quoteErrors.general}
                </div>
              )}

              {/* Items pricing table */}
              <div>
                <h4 className="text-xs font-bold text-white mb-2">Item Specifications Pricing</h4>
                <div className="space-y-3">
                  {quoteForm.lineItems.map((item, index) => (
                    <div key={index} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-4 text-xs">
                      <div className="flex-1">
                        <p className="font-bold text-white">{item.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Required: {item.qty} {item.unit}</p>
                      </div>

                      <div className="w-32">
                        <label className="block text-[9px] font-semibold text-slate-500 mb-0.5">Unit Price (INR)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">₹</span>
                          <input
                            type="number"
                            value={item.unitPrice || ''}
                            onChange={(e) => updateQuoteItemPrice(index, e.target.value)}
                            className={`w-full pl-6 pr-2 py-1 bg-slate-900 border ${
                              quoteErrors[`item_${index}_price`] ? 'border-red-500' : 'border-slate-850'
                            } rounded text-xs text-white focus:outline-none`}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* General Terms and Conditions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">GST Tax Rate</label>
                  <select
                    value={quoteForm.gstPercent}
                    onChange={(e) => setQuoteForm({ ...quoteForm, gstPercent: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-350 focus:outline-none"
                  >
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST (Standard)</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Validity Date</label>
                  <input
                    type="date"
                    value={quoteForm.validityDate}
                    onChange={(e) => setQuoteForm({ ...quoteForm, validityDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Delivery Timeline</label>
                  <input
                    type="text"
                    value={quoteForm.deliveryTimeline}
                    onChange={(e) => setQuoteForm({ ...quoteForm, deliveryTimeline: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                    placeholder="e.g. 10 Days"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={quoteForm.paymentTerms}
                    onChange={(e) => setQuoteForm({ ...quoteForm, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                    placeholder="e.g. Net 30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Remarks / Negotiation Notes</label>
                <textarea
                  value={quoteForm.notes}
                  onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none resize-none"
                  placeholder="Enter special terms or delivery logistics..."
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500 uppercase font-semibold text-[9px] block">Grand Total Estimation</span>
                  <span className="text-sm font-bold text-indigo-400 font-mono">
                    INR {(quoteForm.lineItems.reduce((acc, item) => acc + item.totalPrice, 0) * (1 + quoteForm.gstPercent / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setQuoteModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                  >
                    Submit Bid
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple status badge mapper helper
const getStatusBadge = (status) => {
  const configs = {
    Draft: 'bg-slate-800 text-slate-400 border-slate-700',
    Open: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
    Closed: 'bg-amber-950/40 text-amber-400 border-amber-800/40',
    Completed: 'bg-indigo-950/40 text-indigo-400 border-indigo-800/40'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${configs[status] || 'bg-slate-900 text-slate-400 border-slate-800'}`}>
      {status}
    </span>
  );
};

export default RFQs;
