import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { FileText, Download, Mail, Calendar, MapPin, Printer, Eye, X, Check, FileCheck, Receipt } from 'lucide-react';

const Invoices = () => {
  const { authFetch, user, backendUrl } = useApp();

  // Navigation tabs: 'po' | 'invoices'
  const [activeTab, setActiveTab] = useState('po');
  const [pos, setPos] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detail Modal States
  const [poDetail, setPoDetail] = useState(null);
  const [invoiceDetail, setInvoiceDetail] = useState(null);

  // Actions states
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'po') {
        const res = await authFetch('/api/po');
        const data = await res.json();
        setPos(data);
      } else {
        const res = await authFetch('/api/invoice');
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error('Error fetching document lists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleGenerateInvoice = async (poId) => {
    try {
      // Due date set to 30 days from now
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const res = await authFetch('/api/invoice', {
        method: 'POST',
        body: JSON.stringify({ poId, dueDate })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invoice generation failed');

      alert(`Invoice generated successfully! Ref: ${data.invoiceNumber}`);
      setActiveTab('invoices');
    } catch (err) {
      alert(err.message);
    }
  };

  const fetchInvoiceDetails = async (id) => {
    try {
      const res = await authFetch(`/api/invoice/${id}`);
      // Since our GET /api/invoice/:id route isn't explicitly defined, we can fetch all and match
      // Or we can just build invoiceDetails by populating on frontend from the current state list!
      // But let's check: our backend documents.js has:
      // router.get('/invoice', protect, ...) -> which lists all invoices populated with poId and vendorId.
      // So we can easily retrieve details from our list, OR call the details helper. Let's lookup.
      // Let's implement detail fetch by querying all and matching, which is very safe.
      const match = invoices.find(inv => inv._id === id);
      setInvoiceDetail(match);
      setEmailSuccess('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendEmail = async (id) => {
    setEmailLoading(true);
    setEmailSuccess('');
    try {
      const res = await authFetch(`/api/invoice/${id}/send`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setEmailSuccess(data.message || 'Email sent successfully');
    } catch (err) {
      alert('Email trigger failed: ' + err.message);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleDownloadPdf = (id) => {
    // Open direct pdf download URL in a new window using the bearer token as query or headers.
    // In our backend GET /api/invoice/:id/pdf, we require protect middleware (Authorization header).
    // To download easily, we can use fetch and create a local blob, which works perfectly with headers!
    const activeToken = localStorage.getItem('token');
    
    fetch(`${backendUrl}/api/invoice/${id}/pdf`, {
      headers: {
        'Authorization': `Bearer ${activeToken}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to generate PDF');
      return res.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch(err => {
      alert(err.message);
    });
  };

  const getStatusBadge = (status) => {
    const configs = {
      sent: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
      Draft: 'bg-slate-800 text-slate-400 border-slate-700',
      Sent: 'bg-indigo-950/40 text-indigo-400 border-indigo-800/40',
      Paid: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${configs[status] || 'bg-slate-900 text-slate-400'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Documents Ledger</h1>
          <p className="text-xs text-slate-400">View Purchase Orders (PO) and generate audit-compliant GST Invoices</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('po')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'po' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Purchase Orders
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'invoices' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Invoices
          </button>
        </div>
      </div>

      {/* Main grids */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
          </div>
        ) : activeTab === 'po' ? (
          /* PO LIST TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">PO Number</th>
                  <th className="p-4">Tender Ref</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4 text-center">Amount</th>
                  <th className="p-4">Delivery Address</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {pos.length > 0 ? (
                  pos.map((po) => (
                    <tr key={po._id} className="hover:bg-slate-850/30">
                      <td className="p-4 font-mono font-semibold text-white">{po.poNumber}</td>
                      <td className="p-4 font-mono text-indigo-400">{po.rfqId?.rfqId}</td>
                      <td className="p-4 font-semibold text-white">{po.vendorId?.name}</td>
                      <td className="p-4 text-center font-mono font-bold">INR {po.totalAmount.toLocaleString()}</td>
                      <td className="p-4 truncate max-w-[150px]">{po.deliveryAddress}</td>
                      <td className="p-4">{getStatusBadge(po.status)}</td>
                      <td className="p-4 text-right">
                        {/* If no invoice has been created for this PO yet, show Generate Invoice */}
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedPo(po);
                              setPoDetail(po);
                            }}
                            className="p-1 text-slate-400 hover:text-white"
                            title="Quick View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {/* We check if an invoice has already been created for this PO.
                              Instead of hitting complex filters, we can let them generate, and backend handles duplicate prevention. */}
                          <button
                            onClick={() => handleGenerateInvoice(po._id)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-semibold shadow transition-all flex items-center gap-1"
                          >
                            <Receipt className="w-3.5 h-3.5" /> Invoice
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-500">
                      No Purchase Orders found in the records
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* INVOICES LIST TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Invoice Number</th>
                  <th className="p-4">PO Reference</th>
                  <th className="p-4">Vendor Partner</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4 text-center">Subtotal</th>
                  <th className="p-4 text-center">Grand Total</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {invoices.length > 0 ? (
                  invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-850/30">
                      <td className="p-4 font-mono font-semibold text-white">{inv.invoiceNumber}</td>
                      <td className="p-4 font-mono text-indigo-400">{inv.poId?.poNumber}</td>
                      <td className="p-4 font-semibold text-white">{inv.poId?.vendorId?.name || 'Seeded Partner'}</td>
                      <td className="p-4 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono">INR {inv.subtotal.toLocaleString()}</td>
                      <td className="p-4 text-center font-mono font-bold text-indigo-400">INR {inv.grandTotal.toLocaleString()}</td>
                      <td className="p-4">{getStatusBadge(inv.status)}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => fetchInvoiceDetails(inv._id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-755 text-slate-300 hover:text-white rounded text-[11px] font-semibold border border-slate-700 transition-all inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View GST Invoice
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-500">
                      No Invoices generated in ledger
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PO View Modal */}
      {poDetail && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Purchase Order: {poDetail.poNumber}</h3>
              <button onClick={() => setPoDetail(null)} className="text-slate-400 hover:text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-slate-500 text-[10px] uppercase font-semibold">Vendor Partner</span>
                  <span className="font-bold text-white text-sm">{poDetail.vendorId?.name}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-[10px] uppercase font-semibold">Payment Terms</span>
                  <span className="font-semibold text-white">{poDetail.paymentTerms}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-slate-500 text-[10px] uppercase font-semibold">Delivery Address</span>
                  <span className="text-white">{poDetail.deliveryAddress}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/20">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-[9px] font-bold uppercase text-slate-400">
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Price</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {poDetail.lineItems.map((item, idx) => (
                      <tr key={idx} className="text-slate-300">
                        <td className="p-2.5 font-medium text-white">{item.name}</td>
                        <td className="p-2.5 text-center">{item.qty}</td>
                        <td className="p-2.5 text-right">INR {item.unitPrice.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-mono text-indigo-400">INR {item.totalPrice.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center bg-slate-950 border border-slate-850 p-3 rounded-lg">
                <span className="font-bold text-white">Grand Budget Amount</span>
                <span className="font-bold text-indigo-400 font-mono text-sm">INR {poDetail.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/20">
              <button
                onClick={() => setPoDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Close PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal (GST printable mockup) */}
      {invoiceDetail && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/20">
              <div>
                <h3 className="font-bold text-base text-white">Invoice: {invoiceDetail.invoiceNumber}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">PO Reference: {invoiceDetail.poId?.poNumber}</p>
              </div>
              <button onClick={() => setInvoiceDetail(null)} className="text-slate-400 hover:text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* GST Invoice Printable Mockup */}
            <div className="p-8 flex-1 overflow-y-auto space-y-6 bg-slate-900">
              {/* Org Details header */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-6 text-xs text-slate-300">
                <div className="space-y-1">
                  <span className="text-indigo-400 font-extrabold text-sm uppercase tracking-wide">VendorBridge Buyer Org</span>
                  <p>Corporate Hub, Sector 62, Noida</p>
                  <p>Uttar Pradesh, 201301</p>
                  <p className="font-mono text-[10px] text-slate-500">GSTIN: 09AAACV5489B1Z0</p>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Vendor Partner Details</span>
                  <p className="font-semibold text-white">{invoiceDetail.poId?.vendorId?.name || 'Seeded Partner'}</p>
                  <p>{invoiceDetail.poId?.vendorId?.city || 'India'}</p>
                  <p className="font-mono text-[10px] text-slate-500">GSTIN: {invoiceDetail.poId?.vendorId?.gst || 'N/A'}</p>
                </div>
              </div>

              {/* Dates & Refs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="block text-slate-500 text-[10px] uppercase font-semibold">Invoice Date</span>
                  <span className="font-semibold text-white">{new Date(invoiceDetail.invoiceDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-[10px] uppercase font-semibold">Payment Due Date</span>
                  <span className="font-semibold text-white">{new Date(invoiceDetail.dueDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-[10px] uppercase font-semibold">Payment Terms</span>
                  <span className="font-semibold text-white">{invoiceDetail.poId?.paymentTerms}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-[10px] uppercase font-semibold">Status</span>
                  <span className="font-semibold text-white">{getStatusBadge(invoiceDetail.status)}</span>
                </div>
              </div>

              {/* Line items billing */}
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/20">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-[9px] font-bold uppercase text-slate-400">
                      <th className="p-3">#</th>
                      <th className="p-3">Billing Item Name</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Unit Rate (INR)</th>
                      <th className="p-3 text-right">Net Price (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300">
                    {invoiceDetail.poId?.lineItems?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3 text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-semibold text-white">{item.name}</td>
                        <td className="p-3 text-center">{item.qty}</td>
                        <td className="p-3 text-right">INR {item.unitPrice.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-white">INR {item.totalPrice.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tax Calculations */}
              <div className="flex justify-between items-start text-xs pt-4 border-t border-slate-800">
                <div className="max-w-xs text-slate-500 text-[10px] italic leading-normal">
                  Note: Tax computations are split into Central GST (CGST @ 9%) and State GST (SGST @ 9%) in accordance with standard Indian taxation laws.
                </div>

                <div className="w-64 space-y-1.5 font-semibold text-slate-400">
                  <div className="flex justify-between">
                    <span>Taxable Subtotal</span>
                    <span className="font-mono text-white">INR {invoiceDetail.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Central GST (9%)</span>
                    <span className="font-mono text-white">INR {invoiceDetail.cgst.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>State GST (9%)</span>
                    <span className="font-mono text-white">INR {invoiceDetail.sgst.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-indigo-400 font-bold border-t border-slate-800 pt-2 text-sm">
                    <span>Grand Total Due</span>
                    <span className="font-mono">INR {invoiceDetail.grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Status callback logs */}
              {emailSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60 text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{emailSuccess}</span>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="p-6 border-t border-slate-800 bg-slate-950/20 flex justify-between items-center">
              <button
                onClick={() => handleSendEmail(invoiceDetail._id)}
                disabled={emailLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 disabled:opacity-50 transition-all"
              >
                <Mail className="w-4 h-4 text-indigo-400" />
                {emailLoading ? 'Dispatching...' : 'Email to Vendor'}
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDownloadPdf(invoiceDetail._id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 rounded-lg text-xs font-semibold border border-slate-700 transition-all"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
                <button
                  onClick={() => setInvoiceDetail(null)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                >
                  Close Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
