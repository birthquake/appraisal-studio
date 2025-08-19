// api/content-history.js
// Handles retrieving user content history from existing "generations" collection
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY_RAW?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_PROVIDER_CERT_URL,
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Retrieve user's content history from "generations" collection
      const { userId, limit = 50, offset = 0, contentType, search } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'Missing userId parameter' });
      }

      // Build query on existing "generations" collection
      let query = db.collection('generations')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc');

      // Add content type filter if specified
      if (contentType && contentType !== 'all') {
        query = query.where('contentType', '==', contentType);
      }

      // Apply pagination
      query = query.limit(parseInt(limit));
      if (offset > 0) {
        query = query.offset(parseInt(offset));
      }

      const snapshot = await query.get();
      
      let results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert timestamp to ISO string for frontend
          createdAt: data.timestamp.toDate().toISOString(),
          // Add computed fields that the frontend expects
          propertyAddress: data.propertyData?.address || 'Unknown Property',
          contentLength: data.content?.length || 0,
          wordCount: data.content ? data.content.split(' ').length : 0,
          generationTime: 0 // This field doesn't exist in your current data
        };
      });

      // Apply text search if specified (simple client-side filtering)
      if (search && search.trim()) {
        const searchTerm = search.toLowerCase().trim();
        results = results.filter(item => 
          item.content.toLowerCase().includes(searchTerm) ||
          (item.propertyAddress && item.propertyAddress.toLowerCase().includes(searchTerm))
        );
      }

      return res.status(200).json({ 
        success: true, 
        history: results,
        total: results.length
      });

    } else if (req.method === 'DELETE') {
      // Delete content history item from "generations" collection
      const { id, userId } = req.body;

      if (!id || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Verify ownership before deletion
      const doc = await db.collection('generations').doc(id).get();
      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({ error: 'Content not found or unauthorized' });
      }

      await db.collection('generations').doc(id).delete();

      return res.status(200).json({ success: true });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Content history error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
