// /api/content-history.js
import { db } from '../../firebase/firebase-admin';

export default async function handler(req, res) {
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
    const { userId, limit = '50', offset = '0', contentType, search } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('🔍 Fetching content history for user:', userId);
    console.log('📊 Query params:', { limit, offset, contentType, search });

    // Build the query
    let query = db.collection('generations').where('userId', '==', userId);

    // Filter by content type if specified
    if (contentType && contentType !== 'all') {
      query = query.where('contentType', '==', contentType);
    }

    // Order by creation time (most recent first)
    query = query.orderBy('timestamp', 'desc');

    // Apply pagination
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);
    
    if (offsetNum > 0) {
      // For pagination, we need to skip documents
      query = query.offset(offsetNum);
    }
    
    query = query.limit(limitNum);

    // Execute the query
    const snapshot = await query.get();
    console.log('📄 Found documents:', snapshot.size);

    if (snapshot.empty) {
      console.log('📭 No documents found for user:', userId);
      return res.status(200).json({ 
        history: [],
        total: 0,
        message: 'No content history found'
      });
    }

    // Process documents and map to frontend format
    let history = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('📝 Processing document:', doc.id, data);

      // Calculate word count
      const wordCount = data.content ? data.content.split(/\s+/).filter(word => word.length > 0).length : 0;
      
      // Extract property address from propertyData
      const propertyAddress = data.propertyData?.address || 'Unknown Address';
      
      // Handle timestamp - it might be a Firestore Timestamp or already a date
      let createdAt;
      if (data.timestamp) {
        if (data.timestamp.toDate) {
          // It's a Firestore Timestamp
          createdAt = data.timestamp.toDate().toISOString();
        } else if (data.timestamp.seconds) {
          // It's a Firestore Timestamp object
          createdAt = new Date(data.timestamp.seconds * 1000).toISOString();
        } else {
          // It's already a date string
          createdAt = data.timestamp;
        }
      } else {
        // Fallback to current time if no timestamp
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

    console.log('✅ Mapped history items:', history.length);

    // Apply search filter if provided (client-side filtering for now)
    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      history = history.filter(item => 
        item.content.toLowerCase().includes(searchTerm) ||
        item.propertyAddress.toLowerCase().includes(searchTerm)
      );
      console.log('🔍 After search filter:', history.length, 'items');
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
    const { id, userId } = req.body;

    if (!id || !userId) {
      return res.status(400).json({ error: 'Document ID and User ID are required' });
    }

    console.log('🗑️ Deleting content history item:', id, 'for user:', userId);

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
    console.log('✅ Successfully deleted document:', id);

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
