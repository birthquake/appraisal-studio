// api/stripe/customer-portal.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Debug environment variables FIRST - before any Firebase calls
    console.log('=== ENVIRONMENT DEBUG ===');
    console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
    console.log('FIREBASE_TYPE:', process.env.FIREBASE_TYPE);
    console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
    console.log('FIREBASE_PRIVATE_KEY_ID exists:', !!process.env.FIREBASE_PRIVATE_KEY_ID);
    console.log('FIREBASE_PRIVATE_KEY_RAW exists:', !!process.env.FIREBASE_PRIVATE_KEY_RAW);
    console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
    console.log('FIREBASE_CLIENT_ID exists:', !!process.env.FIREBASE_CLIENT_ID);
    console.log('FIREBASE_AUTH_URI exists:', !!process.env.FIREBASE_AUTH_URI);
    console.log('FIREBASE_TOKEN_URI exists:', !!process.env.FIREBASE_TOKEN_URI);
    console.log('FIREBASE_PROVIDER_CERT_URL exists:', !!process.env.FIREBASE_PROVIDER_CERT_URL);
    console.log('Admin apps count:', admin.apps.length);

    const { userId, returnUrl } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    // Check if private key exists before trying to use it
    if (!process.env.FIREBASE_PRIVATE_KEY_RAW) {
      console.log('ERROR: FIREBASE_PRIVATE_KEY_RAW is undefined');
      return res.status(500).json({ error: 'Firebase private key not found' });
    }

    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      console.log('Initializing Firebase Admin...');
      
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
      console.log('Firebase Admin initialized successfully');
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
