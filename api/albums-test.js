// api/albums-test.js - Test API để debug
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  return res.status(200).json({ 
    message: 'Albums API is working!',
    method: req.method,
    hasDbUrl: !!process.env.DATABASE_URL,
    dbUrlPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'NOT SET'
  });
}
