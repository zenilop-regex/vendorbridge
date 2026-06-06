import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Users,
  CheckSquare,
  Receipt,
  Plus,
  ArrowRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const { user, authFetch } = useApp();
  const navigate = useNavigate();

  // Component states
  const [stats, setStats] = useState({});
  const [logs, setLogs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Fetch KPI stats
        const statsRes = await authFetch('/api/dashboard/stats');
        const statsData = await statsRes.json();
        setStats(statsData);

        // 2. Fetch logs (take last 8 for feed)
        const logsRes = await authFetch('/api/logs');
        const logsData = await logsRes.json();
        setLogs(logsData.slice(0, 8));

        // 3. Fetch summary for chart
        const reportsRes = await authFetch('/api/reports/summary');
        const reportsData = await reportsRes.json();
        setChartData(reportsData.summaryTable || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // Render role-specific KPI cards
  const renderKpiGrid = () => {
    const { role } = user;

    if (role === 'Procurement Officer' || role === 'Admin') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Active RFQs</p>
              <h3 className="text-2xl font-bold text-white">{stats.activeRfqs || 0}</h3>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                <TrendingUp className="w-3 h-3" /> Live in marketplace
              </p>
            </div>
            <div className="p-3 bg-indigo-600/10 rounded-lg text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pending Approvals</p>
              <h3 className="text-2xl font-bold text-white">{stats.pendingApprovals || 0}</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Awaiting Manager review</p>
            </div>
            <div className="p-3 bg-amber-600/10 rounded-lg text-amber-400">
              <CheckSquare className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">POs Generated</p>
              <h3 className="text-2xl font-bold text-white">{stats.posThisMonth || 0}</h3>
              <p className="text-[10px] text-indigo-400 mt-1 font-medium">This Calendar Month</p>
            </div>
            <div className="p-3 bg-emerald-600/10 rounded-lg text-emerald-400">
              <Receipt className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Invoices Sent</p>
              <h3 className="text-2xl font-bold text-white">{stats.invoicesSent || 0}</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Dispatched to accounts</p>
            </div>
            <div className="p-3 bg-cyan-600/10 rounded-lg text-cyan-400">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
        </div>
      );
    }

    if (role === 'Manager') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pending Requests</p>
              <h3 className="text-2xl font-bold text-white">{stats.managerPendingApprovals || 0}</h3>
              <p className="text-[10px] text-amber-400 mt-1 font-medium">Needs immediate action</p>
            </div>
            <div className="p-3 bg-amber-600/10 rounded-lg text-amber-400">
              <CheckSquare className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Approved (Month)</p>
              <h3 className="text-2xl font-bold text-white">{stats.approvedThisMonth || 0}</h3>
              <p className="text-[10px] text-emerald-400 mt-1 font-medium">Passed audits</p>
            </div>
            <div className="p-3 bg-emerald-600/10 rounded-lg text-emerald-400">
              <CheckSquare className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Rejected (Month)</p>
              <h3 className="text-2xl font-bold text-white">{stats.rejectedThisMonth || 0}</h3>
              <p className="text-[10px] text-red-400 mt-1 font-medium">Returned for re-selection</p>
            </div>
            <div className="p-3 bg-red-600/10 rounded-lg text-red-400">
              <CheckSquare className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Approved Spend</p>
              <h3 className="text-lg font-bold text-indigo-400 truncate">INR {stats.totalSpendApproved?.toLocaleString() || 0}</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Lifetime PO capital</p>
            </div>
            <div className="p-3 bg-indigo-600/10 rounded-lg text-indigo-400 font-bold text-center">
              ₹
            </div>
          </div>
        </div>
      );
    }

    if (role === 'Vendor') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Assigned RFQs</p>
              <h3 className="text-2xl font-bold text-white">{stats.openRfqsAssigned || 0}</h3>
              <p className="text-[10px] text-amber-400 mt-1 font-medium">Open for quotation submissions</p>
            </div>
            <div className="p-3 bg-amber-600/10 rounded-lg text-amber-400">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Quotes Submitted</p>
              <h3 className="text-2xl font-bold text-white">{stats.quotationsSubmitted || 0}</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Quotations active in pipeline</p>
            </div>
            <div className="p-3 bg-indigo-600/10 rounded-lg text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">POs Received</p>
              <h3 className="text-2xl font-bold text-white">{stats.posReceived || 0}</h3>
              <p className="text-[10px] text-emerald-400 mt-1 font-medium">Orders awarded by buyer</p>
            </div>
            <div className="p-3 bg-emerald-600/10 rounded-lg text-emerald-400">
              <Receipt className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pending Invoices</p>
              <h3 className="text-2xl font-bold text-white">{stats.pendingInvoicesCount || 0}</h3>
              <p className="text-[10px] text-red-400 mt-1 font-medium">Draft state. Needs invoice generation.</p>
            </div>
            <div className="p-3 bg-red-600/10 rounded-lg text-red-400">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
        </div>
      );
    }
  };

  // Render role-specific quick action links
  const renderQuickActions = () => {
    const { role } = user;

    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-8">
        <h3 className="text-sm font-bold text-white mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          {(role === 'Procurement Officer' || role === 'Admin') && (
            <>
              <Link
                to="/rfqs"
                state={{ openCreateModal: true }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
              >
                <Plus className="w-4 h-4" /> New RFQ
              </Link>
              <Link
                to="/vendors"
                state={{ openAddModal: true }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all border border-slate-700"
              >
                <Plus className="w-4 h-4" /> Add Vendor
              </Link>
            </>
          )}

          {(role === 'Manager') && (
            <Link
              to="/approvals"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
            >
              <CheckSquare className="w-4 h-4" /> Review Approvals
            </Link>
          )}

          {(role === 'Vendor') && (
            <Link
              to="/rfqs"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
            >
              <FileText className="w-4 h-4" /> View Open RFQs
            </Link>
          )}

          <Link
            to={role === 'Vendor' ? '/rfqs' : '/approvals'}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-semibold transition-all border border-slate-800/80"
          >
            Pending Actions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Welcome back, {user.name}</h1>
        <p className="text-sm text-slate-400">Here's what is happening in the VendorBridge network today.</p>
      </div>

      {/* KPI Stats Grid */}
      {renderKpiGrid()}

      {/* Quick Actions */}
      {renderQuickActions()}

      {/* Main Grid: Charts & Activity logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Column */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white mb-1">Procurement Operations Trend</h3>
            <p className="text-xs text-slate-400">Total RFQs created per calendar month (last 6 months)</p>
          </div>

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#818cf8', fontSize: '11px' }}
                  />
                  <Bar dataKey="rfqsCreated" fill="#4f46e5" radius={[4, 4, 0, 0]} name="RFQs Created" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">No chart data available</div>
            )}
          </div>
        </div>

        {/* Activity Feed Column */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Recent Activity Audit</h3>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[260px] space-y-4 pr-1">
            {logs.length > 0 ? (
              logs.map((log) => {
                // Formatting relative timestamps
                const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={log._id} className="flex gap-3 text-xs border-b border-slate-800/40 pb-3 last:border-b-0 last:pb-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="font-semibold text-slate-200 leading-normal">{log.action}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                        <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-[9px] text-slate-400 uppercase">
                          {log.module}
                        </span>
                        <span>by {log.actorName}</span>
                        <span>•</span>
                        <span>{timeStr}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500 py-12">No recent logs</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
