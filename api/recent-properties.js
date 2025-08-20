// /api/recent-properties.js
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY_RAW?.replace(/\\n/g, '\n'),
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, limit = '10' } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Query recent generations for this user
    const generationsRef = db.collection('generations');
    const query = generationsRef
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit) * 3); // Get more to account for duplicates

    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(200).json({ recentProperties: [] });
    }

    // Extract unique properties from generations
    const seenAddresses = new Set();
    const recentProperties = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      
      if (data.propertyData && data.propertyData.address) {
        const address = data.propertyData.address.trim().toLowerCase();
        
        // Skip if we've already seen this address
        if (seenAddresses.has(address)) {
          return;
        }
        
        seenAddresses.add(address);
        
        // Extract property data
        const property = {
          id: `${userId}_${address.replace(/[^a-zA-Z0-9]/g, '_')}`,
          address: data.propertyData.address,
          price: data.propertyData.price || '',
          bedrooms: data.propertyData.bedrooms || '',
          bathrooms: data.propertyData.bathrooms || '',
          sqft: data.propertyData.sqft || '',
          propertyType: data.propertyData.propertyType || 'Single Family Home',
          features: data.propertyData.features || '',
          yearBuilt: data.propertyData.yearBuilt || '',
          parking: data.propertyData.parking || '',
          condition: data.propertyData.condition || '',
          lotSize: data.propertyData.lotSize || '',
          neighborhood: data.propertyData.neighborhood || '',
          schoolDistrict: data.propertyData.schoolDistrict || '',
          specialFeatures: data.propertyData.specialFeatures || {
            pool: false,
            fireplace: false,
            hardwoodFloors: false,
            updatedKitchen: false,
            masterSuite: false,
            walkInCloset: false,
            centralAir: false,
            newAppliances: false,
            fencedYard: false,
            deck: false,
            basement: false,
            attic: false
          },
          lastUsed: data.timestamp?.toDate?.() || new Date()
        };
        
        recentProperties.push(property);
        
        // Stop when we have enough unique properties
        if (recentProperties.length >= parseInt(limit)) {
          return;
        }
      }
    });

    return res.status(200).json({ 
      recentProperties: recentProperties.slice(0, parseInt(limit)),
      total: recentProperties.length 
    });

  } catch (error) {
    console.error('Error fetching recent properties:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch recent properties',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
