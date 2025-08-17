// api/stripe/create-checkout-session.js
// Creates Stripe checkout sessions for AppraisalStudio subscriptions

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// Price IDs from Stripe Dashboard (you'll update these with your actual IDs)
const PRICE_IDS = {
  professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID, // $49/month
  agency: process.env.STRIPE_AGENCY_PRICE_ID // $99/month
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { planId, userId, userEmail, returnUrl } = req.body;

    // Validate required fields
    if (!planId || !userId || !userEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields: planId, userId, userEmail' 
      });
    }

    // Validate plan exists
    if (!PRICE_IDS[planId]) {
      return res.status(400).json({ 
        error: 'Invalid plan ID. Must be "professional" or "agency"' 
      });
    }

    // Get user data from Firebase to ensure they exist
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const priceId = PRICE_IDS[planId];

    // Create or retrieve Stripe customer
    let customerId = userData.stripeCustomerId;
    
    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          firebaseUserId: userId,
          planType: planId
        }
      });
      
      customerId = customer.id;
      
      // Save customer ID to Firebase
      await db.collection('users').doc(userId).update({
        stripeCustomerId: customerId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      billing_address_collection: 'auto',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${returnUrl || process.env.VERCEL_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl || process.env.VERCEL_URL || 'http://localhost:3000'}/pricing`,
      metadata: {
        firebaseUserId: userId,
        planType: planId
      },
      subscription_data: {
        metadata: {
          firebaseUserId: userId,
          planType: planId
        }
      },
      // Enable customer portal access
      customer_update: {
        address: 'auto',
        name: 'auto'
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Custom branding
      custom_text: {
        submit: {
          message: 'Start generating professional real estate content instantly!'
        }
      }
    });

    // Log checkout attempt
    await db.collection('stripe_events').add({
      type: 'checkout_session_created',
      userId: userId,
      planId: planId,
      sessionId: session.id,
      customerId: customerId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Return checkout URL
    res.status(200).json({ 
      checkoutUrl: session.url,
      sessionId: session.id 
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
