import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Vendors from './pages/Vendors';
import RFQs from './pages/RFQs';
import CompareMatrix from './pages/CompareMatrix';
import Approvals from './pages/Approvals';
import Invoices from './pages/Invoices';
import Logs from './pages/Logs';
import Reports from './pages/Reports';

const App = () => {
  return (
    <AppProvider>
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Routes wrapped in Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute roles={['Procurement Officer', 'Vendor', 'Manager', 'Admin']}>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/vendors"
            element={
              <ProtectedRoute roles={['Procurement Officer', 'Admin']}>
                <Layout>
                  <Vendors />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/rfqs"
            element={
              <ProtectedRoute roles={['Procurement Officer', 'Vendor']}>
                <Layout>
                  <RFQs />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/rfqs/:rfqId/compare"
            element={
              <ProtectedRoute roles={['Procurement Officer', 'Admin']}>
                <Layout>
                  <CompareMatrix />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/approvals"
            element={
              <ProtectedRoute roles={['Manager', 'Procurement Officer']}>
                <Layout>
                  <Approvals />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/invoices"
            element={
              <ProtectedRoute roles={['Procurement Officer', 'Vendor']}>
                <Layout>
                  <Invoices />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/logs"
            element={
              <ProtectedRoute roles={['Admin']}>
                <Layout>
                  <Logs />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={['Admin', 'Procurement Officer']}>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Redirect all unmatched routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AppProvider>
  );
};

export default App;
