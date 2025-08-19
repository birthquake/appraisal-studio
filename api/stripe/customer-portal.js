// api/stripe/customer-portal.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, returnUrl } = req.body;

    // Debug logging
    console.log('Environment check:', {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length,
      privateKeyStart: process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50),
      appsLength: admin.apps.length
    });

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      console.log('Initializing Firebase Admin...');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      console.log('Firebase Admin initialized successfully');
    } else {
      console.log('Firebase Admin already initialized, apps count:', admin.apps.length);
    }

    const db = admin.firestore();

    // Get user data from Firebase
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const customerId = userData.stripeCustomerId;

    if (!customerId) {
      return res.status(400).json({ 
        error: 'No Stripe customer found. User must subscribe first.' 
      });
    }

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${returnUrl || process.env.VERCEL_URL || 'http://localhost:3000'}/account`,
    });

    // Log portal access
    await db.collection('stripe_events').add({
      type: 'customer_portal_accessed',
      userId: userId,
      customerId: customerId,
      sessionId: session.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ 
      portalUrl: session.url 
    });

  } catch (error) {
    console.error('Customer portal error:', error);
    res.status(500).json({ 
      error: 'Failed to create customer portal session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
