import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { logActivity } from '../middleware/loggerMiddleware.js';

const router = express.Router();

// Generate JWT Helper
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'fallback_secret_key_123',
    { expiresIn: '30d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password, role, companyName } = req.body;

  try {
    // Basic validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please enter all required fields' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      companyName
    });

    if (user) {
      const token = generateToken(user);

      // Audit Log
      await logActivity(
        `User registered: ${user.name} (${user.role})`,
        'Auth',
        user.name,
        `Registered with email ${user.email} for company ${user.companyName || 'N/A'}`
      );

      res.status(201).json({
        token,
        userId: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        companyName: user.companyName
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      const token = generateToken(user);

      // Audit Log
      await logActivity(
        `User logged in: ${user.name}`,
        'Auth',
        user.name,
        `Logged in from email: ${user.email}`
      );

      res.json({
        token,
        userId: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        companyName: user.companyName
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ message: 'Please enter your email' });
    }
    // Simulate sending link
    res.json({ message: 'Reset link sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
