// server.js - Entry point

const express = require('express');
const { PORT } = require('./config');
const corsMiddleware = require('./middleware/cors');
const routes = require('./routes');

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json());

// Routes
app.use(routes);

// Start server
app.listen(PORT, () => {
  console.log(`KTM AI Backend listening on port ${PORT}`);
});

