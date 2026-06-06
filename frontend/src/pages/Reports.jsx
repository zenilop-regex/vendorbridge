import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, FileSpreadsheet, Calendar, TrendingUp, HelpCircle } from 'lucide-react';

const Reports = () => {
  const { authFetch } = useApp();

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Data states
  const [loading, setLoading] = useState(true);
  const [spendData, setSpendData] = useState([]);
  const [vendorScores, setVendorScores] = useState([]);
  const [summaryTable, setSummaryTable] = useState([]);
  const [statusChart, setStatusChart] = useState([]);
  const [topVendors, setTopVendors] = useState([]);

  // Sorting
  const [sortField, setSortField] = useState('invited');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      // 1. Spend
      const spendRes = await authFetch(`/api/reports/spend?category=${categoryFilter}`);
      const spendData = await spendRes.json();
      setSpendData(spendData);

      // 2. Vendors scorecard
      const vendorRes = await authFetch(`/api/reports/vendors`);
      const vendorData = await vendorRes.json();
      setVendorScores(vendorData);

      // 3. Summary stats
      const summaryRes = await authFetch(`/api/reports/summary?category=${categoryFilter}`);
      const summaryData = await summaryRes.json();
      setSummaryTable(summaryData.summaryTable || []);
      setStatusChart(summaryData.rfqStatusChart || []);
      setTopVendors(summaryData.topVendorsChart || []);

    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [categoryFilter]);

  const handleSort = (field) => {
    const isAsc = sortField === field && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortField(field);
  };

  // Sort helper
  const sortedVendorScores = [...vendorScores].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'onTimeRate') {
      aVal = parseInt(a.onTimeRate.replace('%', ''));
      bVal = parseInt(b.onTimeRate.replace('%', ''));
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleExportExcel = () => {
    // Generate CSV contents for vendor scorecard
    const headers = ['Vendor Name', 'RFQs Invited', 'Quotations Submitted', 'POs Awarded', 'Avg Delivery Days', 'On-Time Rate'];
    const rows = sortedVendorScores.map(v => [
      v.name,
      v.invited,
      v.submitted,
      v.awarded,
      v.avgDeliveryDays,
      v.onTimeRate
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `VendorBridge_VendorPerformance_${categoryFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Donut Colors
  const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171'];

  // Table Totals calculation
  const totalRfqsCreated = summaryTable.reduce((acc, row) => acc + row.rfqsCreated, 0);
  const totalQuotesReceived = summaryTable.reduce((acc, row) => acc + row.quotesReceived, 0);
  const totalPosGenerated = summaryTable.reduce((acc, row) => acc + row.posGenerated, 0);
  const totalSpendVal = summaryTable.reduce((acc, row) => acc + row.totalSpend, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics & Reports</h1>
          <p className="text-xs text-slate-400">Review procurement spend trends, vendor scorecards, and tender statistics</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
          >
            <option value="All">All Categories</option>
            <option value="IT">IT</option>
            <option value="Logistics">Logistics</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Services">Services</option>
            <option value="Raw Materials">Raw Materials</option>
          </select>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-750 transition-all shadow"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export Scorecard
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-24 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly spend */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Monthly Procurement Capital Spend</h3>
                <p className="text-[10px] text-slate-400">Total INR spend calculated from awarded Purchase Orders</p>
              </div>

              <div className="h-64 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={spendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#818cf8', fontSize: '11px' }}
                    />
                    <Bar dataKey="spend" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Spend (INR)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RFQ Status Split Donut */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">RFQ Tender Status Breakdown</h3>
                <p className="text-[10px] text-slate-400">Aggregated RFQ counts by current workflow status</p>
              </div>

              <div className="h-56 w-full relative flex items-center justify-center">
                {statusChart.some(s => s.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChart.filter(s => s.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '11px', color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-slate-500 text-xs py-12">No active tenders found</div>
                )}
              </div>

              <div className="flex justify-center flex-wrap gap-x-4 gap-y-1 mt-2">
                {statusChart.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="text-slate-300 font-medium">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Vendors by spend */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl lg:col-span-3">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Top Vendor Partners by Capital Award</h3>
                <p className="text-[10px] text-slate-400">Horizontal breakdown of the top 5 vendor partners sorted by total PO spend</p>
              </div>

              <div className="h-44 w-full mt-4">
                {topVendors.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topVendors}
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} width={80} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '11px', color: '#818cf8' }}
                      />
                      <Bar dataKey="spend" fill="#818cf8" radius={[0, 4, 4, 0]} name="Spend (INR)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500 py-8">No PO capital disbursed yet</div>
                )}
              </div>
            </div>
          </div>

          {/* Tables Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Procurement Summary Table */}
            <div className="lg:col-span-3 bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Monthly Procurement Summary</h3>
                <p className="text-xs text-slate-400">Activity and budget totals grouped by calendar month (last 6 months)</p>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="p-3">Month</th>
                      <th className="p-3 text-center">RFQs Published</th>
                      <th className="p-3 text-center">Quotations Received</th>
                      <th className="p-3 text-center">POs Generated</th>
                      <th className="p-3 text-right">Spend (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300">
                    {summaryTable.map((row) => (
                      <tr key={row.month} className="hover:bg-slate-850/20">
                        <td className="p-3 font-semibold text-white">{row.month}</td>
                        <td className="p-3 text-center">{row.rfqsCreated}</td>
                        <td className="p-3 text-center">{row.quotesReceived}</td>
                        <td className="p-3 text-center">{row.posGenerated}</td>
                        <td className="p-3 text-right font-mono font-bold text-indigo-400">INR {row.totalSpend.toLocaleString()}</td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-slate-950/45 font-bold border-t border-slate-800">
                      <td className="p-3 text-white uppercase text-[10px]">Total</td>
                      <td className="p-3 text-center text-white">{totalRfqsCreated}</td>
                      <td className="p-3 text-center text-white">{totalQuotesReceived}</td>
                      <td className="p-3 text-center text-white">{totalPosGenerated}</td>
                      <td className="p-3 text-right font-mono text-emerald-400 text-sm">INR {totalSpendVal.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vendor Scorecard */}
            <div className="lg:col-span-3 bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Vendor Performance Scorecard</h3>
                <p className="text-xs text-slate-400">Interactive scoreboard auditing invitations, quotations, and on-time percentages (click headers to sort)</p>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-[9px] font-bold text-slate-400 uppercase tracking-wider select-none cursor-pointer">
                      <th className="p-3 text-left w-64" onClick={() => handleSort('name')}>Vendor Name</th>
                      <th className="p-3 text-center" onClick={() => handleSort('invited')}>Tenders Invited</th>
                      <th className="p-3 text-center" onClick={() => handleSort('submitted')}>Bids Submitted</th>
                      <th className="p-3 text-center" onClick={() => handleSort('awarded')}>POs Awarded</th>
                      <th className="p-3 text-center" onClick={() => handleSort('avgDeliveryDays')}>Avg Lead Days</th>
                      <th className="p-3 text-right" onClick={() => handleSort('onTimeRate')}>On-Time %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300">
                    {sortedVendorScores.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-850/20">
                        <td className="p-3 font-semibold text-white">{v.name}</td>
                        <td className="p-3 text-center">{v.invited}</td>
                        <td className="p-3 text-center">{v.submitted}</td>
                        <td className="p-3 text-center">{v.awarded}</td>
                        <td className="p-3 text-center">{v.avgDeliveryDays} Days</td>
                        <td className="p-3 text-right font-bold text-emerald-400">{v.onTimeRate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
