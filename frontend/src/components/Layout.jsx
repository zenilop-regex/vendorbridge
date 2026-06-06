import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Users,
  FileText,
  CheckSquare,
  Receipt,
  History,
  BarChart3,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Bell
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout, login } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Define sidebar links based on role authorization
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['Procurement Officer', 'Vendor', 'Manager', 'Admin'] },
    { name: 'Vendors', path: '/vendors', icon: Users, roles: ['Procurement Officer', 'Admin'] },
    { name: 'RFQs', path: '/rfqs', icon: FileText, roles: ['Procurement Officer', 'Vendor'] },
    { name: 'Approvals', path: '/approvals', icon: CheckSquare, roles: ['Manager', 'Procurement Officer'] },
    { name: 'Invoices & POs', path: '/invoices', icon: Receipt, roles: ['Procurement Officer', 'Vendor'] },
    { name: 'Activity Logs', path: '/logs', icon: History, roles: ['Admin'] },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['Admin', 'Procurement Officer'] }
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(user?.role));

  const handleRoleSwitch = async (targetRole) => {
    if (targetRole === user?.role) return;
    setSwitching(true);
    try {
      let email = '';
      if (targetRole === 'Admin') email = 'admin@vendorbridge.com';
      if (targetRole === 'Procurement Officer') email = 'officer@vendorbridge.com';
      if (targetRole === 'Manager') email = 'manager@vendorbridge.com';
      if (targetRole === 'Vendor') email = 'vendor@infra-supplies.com';

      // Call standard login with mock email & password
      await login(email, 'password123');
      navigate('/');
    } catch (err) {
      console.error('Role switch failed:', err);
      alert('Failed to switch role: ' + err.message);
    } finally {
      setSwitching(false);
      setDropdownOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between z-10 shrink-0">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white tracking-wider">
              VB
            </div>
            <span className="font-bold text-lg text-white tracking-wide">VendorBridge</span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User logout section */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-800/40 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 font-bold">
              {user?.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.role}</p>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-800 hover:bg-red-950/30 hover:border-red-900/40 text-slate-400 hover:text-red-400 text-xs font-semibold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8 z-10">
          <div>
            <h2 className="font-semibold text-lg text-white capitalize">
              {location.pathname === '/' ? 'Dashboard' : location.pathname.substring(1).split('/')[0]}
            </h2>
          </div>

          {/* Action Header controls */}
          <div className="flex items-center gap-6">
            {/* Quick Demo Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={switching}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all focus:outline-none"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Role: <span className="font-semibold text-indigo-400">{user?.role}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 z-50">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                    Switch demo role
                  </div>
                  {['Procurement Officer', 'Vendor', 'Manager', 'Admin'].map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRoleSwitch(r)}
                      className={`w-full text-left px-4 py-2 text-xs font-medium transition-all ${
                        user?.role === r
                          ? 'bg-indigo-600/10 text-indigo-400'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification placeholder */}
            <button className="relative text-slate-400 hover:text-white transition-all">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-500"></span>
            </button>
          </div>
        </header>

        {/* Page Inner Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-950 relative">
          {switching && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
                <p className="text-xs font-semibold text-slate-400">Switching role environment...</p>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
