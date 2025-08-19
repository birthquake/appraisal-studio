async function handleGetHistory(req, res) {
  try {
    // Import Firebase Admin dynamically
    const admin = require('firebase-admin');
    
    // Debug environment variables (without exposing sensitive data)
    console.log('🔍 Environment check:');
    console.log('- FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Missing');
    console.log('- FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Missing');
    console.log('- FIREBASE_PRIVATE_KEY_RAW:', process.env.FIREBASE_PRIVATE_KEY_RAW ? 'Set (length: ' + process.env.FIREBASE_PRIVATE_KEY_RAW.length + ')' : 'Missing');
    
    // Initialize if not already done
    if (!admin.apps.length) {
      // Handle the private key formatting
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (privateKey) {
        // Replace escaped newlines with actual newlines
        privateKey = privateKey.replace(/\\n/g, '\n');
        
        // If it doesn't start with -----BEGIN, it might be base64 encoded
        if (!privateKey.startsWith('-----BEGIN')) {
          try {
            privateKey = Buffer.from(privateKey, 'base64').toString();
          } catch (e) {
            console.error('Failed to decode private key from base// /api/content-history.js
// Simple version that uses basic Firebase Admin setup

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return handleGetHistory(req, res);
  } else if (req.method === 'DELETE') {
    return handleDeleteHistory(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetHistory(req, res) {
  try {
    // Import Firebase Admin dynamically
    const admin = require('firebase-admin');
    
    // Initialize if not already done
    if (!admin.apps.length) {
      // Handle the private key formatting - using your actual variable name
      let privateKey = process.env.FIREBASE_PRIVATE_KEY_RAW;
      if (privateKey) {
        // Replace escaped newlines with actual newlines
        privateKey = privateKey.replace(/\\n/g, '\n');
        
        // If it doesn't start with -----BEGIN, it might be base64 encoded
        if (!privateKey.startsWith('-----BEGIN')) {
          try {
            privateKey = Buffer.from(privateKey, 'base64').toString();
          } catch (e) {
            console.error('Failed to decode private key from base64');
          }
        }
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
    }

    const db = admin.firestore();
    const { userId, limit = '50', offset = '0', contentType, search } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('🔍 Fetching content history for user:', userId);

    // Build the query
    let query = db.collection('generations').where('userId', '==', userId);

    // Filter by content type if specified
    if (contentType && contentType !== 'all') {
      query = query.where('contentType', '==', contentType);
    }

    // Order by timestamp (most recent first)
    query = query.orderBy('timestamp', 'desc');

    // Apply limit
    const limitNum = parseInt(limit, 10);
    query = query.limit(limitNum);

    // Execute the query
    const snapshot = await query.get();
    console.log('📄 Found documents:', snapshot.size);

    if (snapshot.empty) {
      return res.status(200).json({ 
        history: [],
        total: 0,
        message: 'No content history found'
      });
    }

    // Process documents and map to frontend format
    let history = snapshot.docs.map(doc => {
      const data = doc.data();

      // Calculate word count
      const wordCount = data.content ? data.content.split(/\s+/).filter(word => word.length > 0).length : 0;
      
      // Extract property address from propertyData
      const propertyAddress = data.propertyData?.address || 'Unknown Address';
      
      // Handle timestamp
      let createdAt;
      if (data.timestamp && data.timestamp.toDate) {
        createdAt = data.timestamp.toDate().toISOString();
      } else {
        createdAt = new Date().toISOString();
      }

      return {
        id: doc.id,
        content: data.content || '',
        contentType: data.contentType || 'unknown',
        propertyAddress: propertyAddress,
        wordCount: wordCount,
        createdAt: createdAt,
        userId: data.userId || userId
      };
    });

    // Apply search filter if provided
    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      history = history.filter(item => 
        item.content.toLowerCase().includes(searchTerm) ||
        item.propertyAddress.toLowerCase().includes(searchTerm)
      );
    }

    return res.status(200).json({
      history: history,
      total: history.length
    });

  } catch (error) {
    console.error('❌ Error fetching content history:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch content history',
      details: error.message 
    });
  }
}

async function handleDeleteHistory(req, res) {
  try {
    // Import Firebase Admin dynamically
    const admin = require('firebase-admin');
    const db = admin.firestore();

    const { id, userId } = req.body;

    if (!id || !userId) {
      return res.status(400).json({ error: 'Document ID and User ID are required' });
    }

    // Get the document first to verify ownership
    const docRef = db.collection('generations').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const data = doc.data();
    
    // Verify the document belongs to the requesting user
    if (data.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this content' });
    }

    // Delete the document
    await docRef.delete();

    return res.status(200).json({ 
      success: true,
      message: 'Content deleted successfully' 
    });

  } catch (error) {
    console.error('❌ Error deleting content history:', error);
    return res.status(500).json({ 
      error: 'Failed to delete content',
      details: error.message 
    });
  }
}
