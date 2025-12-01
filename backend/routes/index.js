// routes/index.js - Route aggregator

const express = require('express');
const chatRoutes = require('./chat');
const albumsRoutes = require('./albums');

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
router.use('/api', albumsRoutes);

module.exports = router;
