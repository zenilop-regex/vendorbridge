import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Routes imports
import authRoutes from './routes/auth.js';
import vendorRoutes from './routes/vendors.js';
import rfqRoutes from './routes/rfq.js';
import quotationRoutes from './routes/quotations.js';
import approvalRoutes from './routes/approvals.js';
import documentRoutes from './routes/documents.js';
import dashboardRoutes from './routes/dashboard.js';
import logsRoutes from './routes/logs.js';
import reportsRoutes from './routes/reports.js';

// Seed helper import
import User from './models/User.js';
import Vendor from './models/Vendor.js';
import RFQ from './models/RFQ.js';
import Quotation from './models/Quotation.js';
import { logActivity } from './middleware/loggerMiddleware.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes mount
app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/rfq', rfqRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api', documentRoutes); // Mounts /api/po and /api/invoice
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/reports', reportsRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('VendorBridge ERP API Server Running');
});

// Database connection & memory fallback
let mongoServer;
const connectDB = async () => {
  let dbUrl = process.env.MONGODB_URI;

  try {
    if (!dbUrl) {
      console.log('No MONGODB_URI found in environment. Launching MongoMemoryServer...');
      mongoServer = await MongoMemoryServer.create();
      dbUrl = mongoServer.getUri();
      console.log(`MongoMemoryServer running at: ${dbUrl}`);
    }

    await mongoose.connect(dbUrl);
    console.log('MongoDB connected successfully');
    
    // Seed data if empty
    await seedInitialData();

  } catch (error) {
    console.error('Database Connection Error:', error);
    process.exit(1);
  }
};

// Seeding function
const seedInitialData = async () => {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log('Database already populated. Skipping seeding.');
    return;
  }

  console.log('Database empty. Seeding initial mockup ERP data...');

  try {
    // 1. Seed Users (with hashed passwords - handled by pre-save hook)
    const officer = await User.create({
      name: 'Rohan Sharma',
      email: 'officer@vendorbridge.com',
      password: 'password123',
      role: 'Procurement Officer',
      companyName: 'VendorBridge Buyer Org'
    });

    const manager = await User.create({
      name: 'Priya Patel',
      email: 'manager@vendorbridge.com',
      password: 'password123',
      role: 'Manager',
      companyName: 'VendorBridge Buyer Org'
    });

    const vendorUser = await User.create({
      name: 'Amit Shah',
      email: 'vendor@infra-supplies.com',
      password: 'password123',
      role: 'Vendor',
      companyName: 'Infra Supplies Pvt Ltd'
    });

    const admin = await User.create({
      name: 'Vikram Singh',
      email: 'admin@vendorbridge.com',
      password: 'password123',
      role: 'Admin',
      companyName: 'VendorBridge Admin Org'
    });

    // 2. Seed Vendors
    const v1 = await Vendor.create({
      name: 'Infra Supplies Pvt Ltd',
      contactPerson: 'Amit Shah',
      email: 'vendor@infra-supplies.com',
      phone: '+91 98765 43210',
      gst: '27AABCS1429BZ0',
      category: 'Manufacturing',
      city: 'Mumbai',
      status: 'Active',
      notes: 'Trusted manufacturer for custom metallic line-items and hardware.'
    });

    const v2 = await Vendor.create({
      name: 'Techcore Solutions',
      contactPerson: 'Karan Malhotra',
      email: 'karan@techcore.com',
      phone: '+91 98765 43211',
      gst: '27AABCS1429BZ1',
      category: 'IT',
      city: 'Bengaluru',
      status: 'Active',
      notes: 'Provides high-end workstations, servers, and tech networking support.'
    });

    const v3 = await Vendor.create({
      name: 'Logix Logistics',
      contactPerson: 'Rajesh Nair',
      email: 'rajesh@logix.com',
      phone: '+91 98765 43212',
      gst: '27AABCS1429BZ2',
      category: 'Logistics',
      city: 'Chennai',
      status: 'Active',
      notes: 'Pan-India delivery operations. Specializes in heavy industrial shipments.'
    });

    const v4 = await Vendor.create({
      name: 'Office Depot Solutions',
      contactPerson: 'Sneha Rao',
      email: 'sneha@officedepot.com',
      phone: '+91 98765 43213',
      gst: '27AABCS1429BZ3',
      category: 'Services',
      city: 'Delhi',
      status: 'Inactive',
      notes: 'Furnitures supplier. Temp suspended for review.'
    });

    // 3. Seed open RFQ
    const rfq1 = await RFQ.create({
      title: 'Server Workstation procurement Q3',
      description: 'Require 10 standard engineering workstations with Intel i9 and 64GB RAM.',
      category: 'IT',
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      lineItems: [
        { name: 'Engineering Workstation', description: 'Intel i9, RTX 4080, 64GB RAM', qty: 10, unit: 'pcs' },
        { name: 'UPS Power backup 2kVA', description: 'Double conversion online UPS', qty: 5, unit: 'pcs' }
      ],
      assignedVendors: [v2._id],
      status: 'Open',
      createdBy: officer._id
    });

    // 4. Seed draft RFQ
    const rfq2 = await RFQ.create({
      title: 'Steel Pipe Line Raw Materials',
      description: 'Galvanized carbon-steel piping for boiler setup.',
      category: 'Manufacturing',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      lineItems: [
        { name: 'Carbon Steel Pipe 2 inch', description: 'Grade B schedule 40 seamless', qty: 150, unit: 'meter' },
        { name: 'Elbow Joint 90 deg 2 inch', description: 'Forged carbon steel socket-weld', qty: 40, unit: 'pcs' }
      ],
      assignedVendors: [v1._id, v3._id],
      status: 'Draft',
      createdBy: officer._id
    });

    // Audit logs
    await logActivity('System seeded with initial data', 'Auth', 'System', 'Pre-populated 4 users, 4 vendors, and 2 RFQs.');
    console.log('Database successfully seeded with initial mock data.');

  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

// Start Server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

// Handle graceful shutdowns
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
  process.exit(0);
});
