import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Check, X, Calendar, User, FileText, AlertCircle, Clock, CheckCircle } from 'lucide-react';

const Approvals = () => {
  const { authFetch, user } = useApp();

  // Data states
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Status filter
  const [statusFilter, setStatusFilter] = useState('All');

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);

  // Remarks state
  const [remarks, setRemarks] = useState('');
  const [remarksError, setRemarksError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'All') queryParams.append('status', statusFilter);

      const res = await authFetch(`/api/approvals?${queryParams.toString()}`);
      const data = await res.json();
      setApprovals(data);
    } catch (err) {
      console.error('Error fetching approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [statusFilter]);

  const fetchApprovalDetails = async (id) => {
    try {
      const res = await authFetch(`/api/approvals/${id}`);
      const data = await res.json();
      setSelectedApproval(data);
      setRemarks(data.remarks || '');
      setRemarksError('');
      setDetailModalOpen(true);
    } catch (err) {
      console.error('Error fetching approval details:', err);
    }
  };

  const handleProcessApproval = async (action) => {
    // Action is 'approve' | 'reject'
    if (action === 'reject' && !remarks.trim()) {
      setRemarksError('Remarks/Reasons are mandatory for rejection');
      return;
    }

    setActionLoading(true);
    try {
      const res = await authFetch(`/api/approvals/${selectedApproval._id}/${action}`, {
        method: 'PUT',
        body: JSON.stringify({ remarks })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Operation failed');

      alert(`Request has been successfully ${action === 'approve' ? 'APPROVED' : 'REJECTED'}`);
      setDetailModalOpen(false);
      setSelectedApproval(null);
      fetchApprovals();
    } catch (err) {
      setRemarksError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      PENDING: 'bg-amber-950/40 text-amber-400 border-amber-800/40',
      APPROVED: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
      REJECTED: 'bg-red-950/40 text-red-400 border-red-800/40'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${configs[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Workflow Approvals</h1>
          <p className="text-xs text-slate-400">Review selected vendor bids, inspect prices/remarks, and process approvals</p>
        </div>
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
            <option value="All">All Requests</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Approvals Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">RFQ Ref</th>
                  <th className="p-4">Selected Vendor</th>
                  <th className="p-4 text-center">Amount (incl. Tax)</th>
                  <th className="p-4">Requested By</th>
                  <th className="p-4">Request Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {approvals.length > 0 ? (
                  approvals.map((app) => (
                    <tr key={app._id} className="hover:bg-slate-850/30">
                      <td className="p-4 font-mono font-semibold text-indigo-400">{app.rfqId?.rfqId}</td>
                      <td className="p-4 font-semibold text-white">{app.vendorId?.name}</td>
                      <td className="p-4 text-center font-mono font-bold">INR {app.amount.toLocaleString()}</td>
                      <td className="p-4">{app.requestedBy?.name}</td>
                      <td className="p-4">{new Date(app.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">{getStatusBadge(app.status)}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => fetchApprovalDetails(app._id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-semibold transition-all inline-flex items-center gap-1 border border-slate-700"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-500">
                      No approvals found matching the filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details & Action Modal */}
      {detailModalOpen && selectedApproval && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <div>
                <h3 className="font-bold text-base text-white">Procurement Approval Details</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Tender Reference: {selectedApproval.rfqId?.rfqId}</p>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-slate-400 hover:text-white transition-all focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Scope & Vendor details */}
              <div className="md:col-span-2 space-y-5">
                {/* Basic info */}
                <div>
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Tender Information</h4>
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg space-y-2 text-xs">
                    <p className="font-bold text-white text-sm">{selectedApproval.rfqId?.title}</p>
                    <p className="text-slate-400 leading-normal">{selectedApproval.rfqId?.description}</p>
                  </div>
                </div>

                {/* Vendor details */}
                <div>
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Selected Vendor Details</h4>
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg grid grid-cols-2 gap-4 text-xs text-slate-300">
                    <div>
                      <span className="block text-slate-500 text-[10px] uppercase font-semibold">Vendor Name</span>
                      <span className="font-bold text-white">{selectedApproval.vendorId?.name}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 text-[10px] uppercase font-semibold">GSTIN</span>
                      <span className="font-mono text-white">{selectedApproval.vendorId?.gst}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 text-[10px] uppercase font-semibold">Payment Terms</span>
                      <span className="font-semibold text-white">{selectedApproval.quotationId?.paymentTerms}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 text-[10px] uppercase font-semibold">Delivery Timeline</span>
                      <span className="font-semibold text-white">{selectedApproval.quotationId?.deliveryTimeline}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-slate-500 text-[10px] uppercase font-semibold">Vendor Remarks</span>
                      <p className="text-[11px] text-slate-400 italic mt-0.5">"{selectedApproval.quotationId?.notes || 'No notes added.'}"</p>
                    </div>
                  </div>
                </div>

                {/* Amount and requester */}
                <div className="flex justify-between items-center bg-slate-950 border border-slate-850 p-4 rounded-lg">
                  <div>
                    <span className="block text-slate-500 text-[9px] uppercase font-bold">Requested By</span>
                    <span className="text-xs font-semibold text-white">{selectedApproval.requestedBy?.name} ({selectedApproval.requestedBy?.email})</span>
                  </div>

                  <div className="text-right">
                    <span className="block text-slate-500 text-[9px] uppercase font-bold">Total Budget Requested</span>
                    <span className="text-sm font-extrabold text-indigo-400 font-mono">INR {selectedApproval.amount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Manager Action controls */}
                {selectedApproval.status === 'PENDING' && user.role === 'Manager' && (
                  <div className="border-t border-slate-800/80 pt-4 space-y-3">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Manager Decision Console</h4>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Remarks / Feedback (Required for rejection)</label>
                      <textarea
                        value={remarks}
                        onChange={(e) => {
                          setRemarks(e.target.value);
                          if (remarksError) setRemarksError('');
                        }}
                        rows="2"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                        placeholder="Enter audit approval remarks or rejection reasons here..."
                      ></textarea>
                      {remarksError && <span className="block text-[10px] text-red-400 mt-0.5">{remarksError}</span>}
                    </div>

                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => handleProcessApproval('reject')}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-950/40 border border-red-800 text-red-400 hover:bg-red-900 hover:text-white rounded-lg text-xs font-semibold shadow transition-all disabled:opacity-50"
                      >
                        <X className="w-4 h-4" /> Reject Request
                      </button>
                      <button
                        onClick={() => handleProcessApproval('approve')}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-all disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" /> Approve & Award
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Visual Timeline Workflow */}
              <div className="border-t md:border-t-0 md:border-l border-slate-800/85 pt-6 md:pt-0 md:pl-6 space-y-4">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Workflow Track timeline</h4>

                <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {selectedApproval.timeline.map((step, idx) => {
                    const isDone = step.status === 'done';
                    return (
                      <div key={idx} className="flex gap-3 text-xs relative">
                        <div className={`w-4.5 h-4.5 rounded-full bg-slate-950 border-2 flex items-center justify-center z-10 shrink-0 ${
                          step.stepName === 'Approved'
                            ? 'border-emerald-500'
                            : step.stepName === 'Rejected'
                              ? 'border-red-500'
                              : 'border-indigo-500'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            step.stepName === 'Approved'
                              ? 'bg-emerald-500'
                              : step.stepName === 'Rejected'
                                ? 'bg-red-500'
                                : 'bg-indigo-500'
                          }`}></div>
                        </div>

                        <div>
                          <p className="font-bold text-slate-200">{step.stepName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Action by: {step.actionBy}</p>
                          <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {new Date(step.actionDate).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedApproval.status !== 'PENDING' && (
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg space-y-1.5 text-xs text-slate-300">
                    <span className="block text-slate-500 text-[10px] uppercase font-semibold">Final Remarks</span>
                    <p className="text-slate-300 leading-normal italic">
                      "{selectedApproval.remarks || 'No remarks provided.'}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-950/20 flex justify-end">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold transition-all"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;
