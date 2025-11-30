// config/index.js - Cấu hình chung cho backend

require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 4000,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: 'gemini-2.0-flash',
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models'
};
