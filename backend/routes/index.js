// routes/index.js - Route aggregator

const express = require('express');
const chatRoutes = require('./chat');

const router = express.Router();

// Health check
router.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'KTM AI Backend running',
    version: '1.0.0'
  });
});

// API routes
router.use('/api', chatRoutes);

module.exports = router;
