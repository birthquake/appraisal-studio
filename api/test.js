export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed - but this means the function is working!' });
  }

  return res.status(200).json({ 
    description: "🎉 SUCCESS! This is a test response. If you see this, the API is working!" 
  });
}
