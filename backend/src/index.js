const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Initialize DB Connection
const { db } = require('./db/connection');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Custom middleware: bypass global JSON parser for Stripe Webhook raw validation
app.use((req, res, next) => {
  if (req.originalUrl === '/api/billing/webhook') {
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Import and Register Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/sets', require('./routes/sets'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/users', require('./routes/users'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/billing', require('./routes/billing'));

// Global Error Handler Middleware
const errorHandler = require('./middleware/error');
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`EduMatch Backend Server active on port ${PORT}`);
  console.log(`Workspace Path: ${path.resolve(__dirname, '..')}`);
  console.log(`=================================================`);
});
