// routes/chat.js - Chat AI routes

const express = require('express');
const { askGemini } = require('../services/gemini');

const router = express.Router();

/**
 * POST /api/chat-ai
 * Body: { question: string, products: array }
 */
router.post('/chat-ai', async (req, res) => {
  try {
    const { question, products } = req.body || {};

    if (!question) {
      return res.status(400).json({ error: 'Missing "question" in body' });
    }

    const reply = await askGemini(question, products || []);
    res.json({ reply });

  } catch (err) {
    console.error('POST /api/chat-ai error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
