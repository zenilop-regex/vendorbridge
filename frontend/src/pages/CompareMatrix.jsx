import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Check, AlertCircle, Award, CheckCircle } from 'lucide-react';

const CompareMatrix = () => {
  const { rfqId } = useParams();
  const { authFetch } = useApp();
  const navigate = useNavigate();

  // Data states
  const [rfqDetail, setRfqDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lowestQuoteId, setLowestQuoteId] = useState(null);

  useEffect(() => {
    const fetchMatrixData = async () => {
      try {
        const res = await authFetch(`/api/rfq/${rfqId}`);
        const data = await res.json();
        setRfqDetail(data); // data = { rfq, quotations }

        // Find lowest grand total quote ID
        if (data.quotations && data.quotations.length > 0) {
          let lowestTotal = Infinity;
          let lowestId = null;

          data.quotations.forEach(quote => {
            const subtotal = quote.lineItems.reduce((acc, item) => acc + item.totalPrice, 0);
            const total = subtotal + (subtotal * (quote.gstPercent / 100));
            if (total < lowestTotal) {
              lowestTotal = total;
              lowestId = quote._id;
            }
          });

          setLowestQuoteId(lowestId);
        }
      } catch (err) {
        console.error('Error loading comparison matrix:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatrixData();
  }, [rfqId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!rfqDetail || !rfqDetail.quotations || rfqDetail.quotations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="w-8 h-8 text-slate-500" />
        <p className="text-sm text-slate-400">No quotations submitted to build a comparison matrix.</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const { rfq, quotations } = rfqDetail;

  const handleSelectVendor = async (quote) => {
    try {
      const subtotal = quote.lineItems.reduce((acc, item) => acc + item.totalPrice, 0);
      const totalAmount = subtotal + (subtotal * (quote.gstPercent / 100));

      const res = await authFetch('/api/approvals', {
        method: 'POST',
        body: JSON.stringify({
          rfqId: rfq._id,
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

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to RFQ
        </button>

        <div className="text-right">
          <span className="font-mono text-xs font-semibold text-indigo-400 uppercase tracking-wide">{rfq.rfqId}</span>
          <h1 className="text-base font-bold text-white mt-0.5">Bid Comparison Matrix</h1>
        </div>
      </div>

      {/* Info panel */}
      <div className="bg-indigo-950/20 border border-indigo-900 p-4 rounded-xl flex items-start gap-3">
        <Award className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 animate-bounce" />
        <div className="text-xs">
          <p className="font-bold text-white">Automated Bid Highlighting Active</p>
          <p className="text-slate-400 mt-0.5">
            The quotation with the lowest estimated <strong className="text-emerald-400">Grand Total (including GST taxes)</strong> is automatically highlighted in emerald green to assist procurement selection.
          </p>
        </div>
      </div>

      {/* Comparison Matrix Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4 border-r border-slate-800 w-56">Comparison Parameters</th>
                {quotations.map((quote) => {
                  const isLowest = quote._id === lowestQuoteId;
                  return (
                    <th
                      key={quote._id}
                      className={`p-4 text-center border-r border-slate-800 min-w-[200px] ${
                        isLowest ? 'bg-emerald-950/10 text-emerald-400 font-bold' : 'text-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-extrabold truncate">{quote.vendorId.name}</p>
                        {isLowest && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold border border-emerald-500/20">
                            ★ L1 Lowest Bidder
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {/* Category Info */}
              <tr>
                <td className="p-3 font-semibold text-slate-400 border-r border-slate-800 bg-slate-950/20">Vendor Category</td>
                {quotations.map((quote) => (
                  <td key={quote._id} className="p-3 text-center border-r border-slate-800 font-mono">
                    {quote.vendorId.category}
                  </td>
                ))}
              </tr>

              {/* City Info */}
              <tr>
                <td className="p-3 font-semibold text-slate-400 border-r border-slate-800 bg-slate-950/20">Vendor Location</td>
                {quotations.map((quote) => (
                  <td key={quote._id} className="p-3 text-center border-r border-slate-800">
                    {quote.vendorId.city}
                  </td>
                ))}
              </tr>

              {/* Item details pricing */}
              {rfq.lineItems.map((item, idx) => (
                <tr key={item._id || idx}>
                  <td className="p-3 border-r border-slate-800 bg-slate-950/20">
                    <p className="font-semibold text-white truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-500">Req: {item.qty} {item.unit}</p>
                  </td>
                  {quotations.map((quote) => {
                    const qItem = quote.lineItems[idx];
                    return (
                      <td key={quote._id} className="p-3 text-center border-r border-slate-800 font-mono">
                        {qItem ? (
                          <div>
                            <p className="text-white">INR {qItem.unitPrice.toLocaleString()}</p>
                            <p className="text-[10px] text-slate-500">Total: INR {qItem.totalPrice.toLocaleString()}</p>
                          </div>
                        ) : (
                          <span className="text-slate-600">N/A</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Subtotal */}
              <tr className="bg-slate-950/10">
                <td className="p-3 font-semibold text-slate-400 border-r border-slate-800 bg-slate-950/20">Net Subtotal</td>
                {quotations.map((quote) => {
                  const subtotal = quote.lineItems.reduce((acc, item) => acc + item.totalPrice, 0);
                  return (
                    <td key={quote._id} className="p-3 text-center border-r border-slate-800 font-mono font-semibold">
                      INR {subtotal.toLocaleString()}
                    </td>
                  );
                })}
              </tr>

              {/* GST Tax */}
              <tr>
                <td className="p-3 font-semibold text-slate-400 border-r border-slate-800 bg-slate-950/20">GST Tax percentage</td>
                {quotations.map((quote) => (
                  <td key={quote._id} className="p-3 text-center border-r border-slate-800 font-mono text-slate-400">
                    {quote.gstPercent}%
                  </td>
                ))}
              </tr>

              {/* Grand Total */}
              <tr className="bg-slate-950/35 border-t border-b border-slate-850">
                <td className="p-4 font-bold text-white border-r border-slate-800 bg-slate-950/20">Grand Total (incl. Tax)</td>
                {quotations.map((quote) => {
                  const isLowest = quote._id === lowestQuoteId;
                  const subtotal = quote.lineItems.reduce((acc, item) => acc + item.totalPrice, 0);
                  const grandTotal = subtotal + (subtotal * (quote.gstPercent / 100));
                  return (
                    <td
                      key={quote._id}
                      className={`p-4 text-center border-r border-slate-800 font-mono text-sm font-bold ${
                        isLowest ? 'text-emerald-400 bg-emerald-950/20' : 'text-white'
                      }`}
                    >
                      INR {grandTotal.toLocaleString()}
                    </td>
                  );
                })}
              </tr>

              {/* Delivery Days */}
              <tr>
                <td className="p-3 font-semibold text-slate-400 border-r border-slate-800 bg-slate-950/20">Delivery Timeline</td>
                {quotations.map((quote) => (
                  <td key={quote._id} className="p-3 text-center border-r border-slate-800 font-medium text-slate-300">
                    {quote.deliveryTimeline}
                  </td>
                ))}
              </tr>

              {/* Payment Terms */}
              <tr>
                <td className="p-3 font-semibold text-slate-400 border-r border-slate-800 bg-slate-950/20">Payment Terms</td>
                {quotations.map((quote) => (
                  <td key={quote._id} className="p-3 text-center border-r border-slate-800 text-slate-300">
                    {quote.paymentTerms}
                  </td>
                ))}
              </tr>

              {/* Bid Validity */}
              <tr>
                <td className="p-3 font-semibold text-slate-400 border-r border-slate-800 bg-slate-950/20">Validity Date</td>
                {quotations.map((quote) => (
                  <td key={quote._id} className="p-3 text-center border-r border-slate-800 font-mono text-slate-400">
                    {new Date(quote.validityDate).toLocaleDateString()}
                  </td>
                ))}
              </tr>

              {/* Select Actions Row (Visible to Procurement Officer only) */}
              {rfq.status === 'Open' && (
                <tr className="bg-slate-950/40">
                  <td className="p-4 border-r border-slate-800 bg-slate-950/20"></td>
                  {quotations.map((quote) => (
                    <td key={quote._id} className="p-4 text-center border-r border-slate-800">
                      <button
                        onClick={() => handleSelectVendor(quote)}
                        className="flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
                      >
                        <Check className="w-3.5 h-3.5" /> Select Vendor
                      </button>
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CompareMatrix;
