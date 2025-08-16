export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { propertyData } = req.body;
    
    const mockDescription = `This is working! Property at ${propertyData.address} with ${propertyData.bedrooms} bedrooms.`;
    
    res.status(200).json({ description: mockDescription });

  } catch (error) {
    res.status(500).json({ error: 'Failed to generate description' });
  }
}
