import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Calendar, Filter, FileSpreadsheet, Eye, EyeOff } from 'lucide-react';

const Logs = () => {
  const { authFetch } = useApp();

  // Data states
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [moduleFilter, setModuleFilter] = useState('All');
  const [actorSearch, setActorSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Row expansion
  const [expandedLogId, setExpandedLogId] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (moduleFilter !== 'All') queryParams.append('module', moduleFilter);
      if (actorSearch) queryParams.append('actor', actorSearch);
      if (fromDate) queryParams.append('fromDate', fromDate);
      if (toDate) queryParams.append('toDate', toDate);

      const res = await authFetch(`/api/logs?${queryParams.toString()}`);
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [moduleFilter, actorSearch, fromDate, toDate]);

  const toggleExpandLog = (id) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const handleExportCSV = () => {
    // Generate CSV contents
    const headers = ['Timestamp', 'Module', 'Action', 'Actor Name', 'Details'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.module,
      log.action,
      log.actorName,
      log.details || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `VendorBridge_AuditLogs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const getModuleBadge = (mod) => {
    const configs = {
      RFQ: 'bg-indigo-950/40 text-indigo-400 border-indigo-800/40',
      Vendor: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
      PO: 'bg-cyan-950/40 text-cyan-400 border-cyan-800/40',
      Invoice: 'bg-blue-950/40 text-blue-400 border-blue-800/40',
      Auth: 'bg-rose-950/40 text-rose-400 border-rose-800/40',
      Approval: 'bg-amber-950/40 text-amber-400 border-amber-800/40'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${configs[mod] || 'bg-slate-900 border-slate-800 text-slate-400'}`}>
        {mod}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">System Audit logs</h1>
          <p className="text-xs text-slate-400">Track and review every database mutation, user entry, and login event in real-time</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-750 transition-all shadow"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by actor name..."
            value={actorSearch}
            onChange={(e) => setActorSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase">Module</label>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="All">All Modules</option>
            <option value="Auth">Authentication</option>
            <option value="RFQ">RFQ Tender</option>
            <option value="Vendor">Vendor Management</option>
            <option value="Approval">Approvals</option>
            <option value="PO">Purchase Orders</option>
            <option value="Invoice">Invoices</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
            placeholder="From Date"
          />
          <span className="text-slate-500 text-xs">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
            placeholder="To Date"
          />
        </div>
      </div>

      {/* Logs Table */}
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
                  <th className="p-4 w-48">Timestamp</th>
                  <th className="p-4 w-32">Module</th>
                  <th className="p-4">Action Event</th>
                  <th className="p-4 w-44">Actor Name</th>
                  <th className="p-4 text-right w-24">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {logs.length > 0 ? (
                  logs.map((log) => {
                    const isExpanded = expandedLogId === log._id;
                    return (
                      <React.Fragment key={log._id}>
                        <tr className="hover:bg-slate-850/20">
                          <td className="p-4 font-mono text-slate-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-4">{getModuleBadge(log.module)}</td>
                          <td className="p-4 font-semibold text-white">{log.action}</td>
                          <td className="p-4 text-slate-300 font-medium">{log.actorName}</td>
                          <td className="p-4 text-right">
                            {log.details ? (
                              <button
                                onClick={() => toggleExpandLog(log._id)}
                                className="p-1 text-slate-500 hover:text-white rounded transition-all"
                                title={isExpanded ? 'Hide Details' : 'Show Details'}
                              >
                                {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            ) : (
                              <span className="text-slate-600 text-[10px] pr-2">N/A</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && log.details && (
                          <tr className="bg-slate-950/35 border-b border-slate-800">
                            <td colSpan="5" className="p-4 pl-12 text-slate-400 leading-relaxed text-[11px]">
                              <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg font-mono">
                                {log.details}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500">
                      No logs found matching the active filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Logs;
