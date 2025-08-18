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

    // 🐛 DEBUG: Log incoming request
    console.log('💡 Checkout session request:', { planId, userId, userEmail, returnUrl });

    // 🐛 DEBUG: Check environment variables
    console.log('🔐 Environment check:', {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasProfessionalPrice: !!process.env.STRIPE_PROFESSIONAL_PRICE_ID,
      hasAgencyPrice: !!process.env.STRIPE_AGENCY_PRICE_ID,
      hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
      professionalPriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
      agencyPriceId: process.env.STRIPE_AGENCY_PRICE_ID
    });

    // Validate required fields
    if (!planId || !userId || !userEmail) {
      console.log('❌ Missing required fields:', { planId, userId, userEmail });
      return res.status(400).json({ 
        error: 'Missing required fields: planId, userId, userEmail' 
      });
    }

    // Validate plan exists
    if (!PRICE_IDS[planId]) {
      console.log('❌ Invalid plan ID:', planId, 'Available plans:', Object.keys(PRICE_IDS));
      return res.status(400).json({ 
        error: 'Invalid plan ID. Must be "professional" or "agency"' 
      });
    }

    // Check if price ID is actually set
    const priceId = PRICE_IDS[planId];
    if (!priceId) {
      console.log('❌ Price ID not found for plan:', planId);
      return res.status(500).json({ 
        error: `Price ID not configured for ${planId} plan. Please check environment variables.` 
      });
    }

    console.log('✅ Using price ID:', priceId, 'for plan:', planId);

    // Get user data from Firebase to ensure they exist
    console.log('🔍 Looking up user in Firebase:', userId);
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log('❌ User not found in Firebase:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    console.log('✅ User found:', { email: userData.email, hasCustomerId: !!userData.stripeCustomerId });

    // Create or retrieve Stripe customer
    let customerId = userData.stripeCustomerId;
    
    if (!customerId) {
      console.log('🆕 Creating new Stripe customer for:', userEmail);
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          firebaseUserId: userId,
          planType: planId
        }
      });
      
      customerId = customer.id;
      console.log('✅ Created Stripe customer:', customerId);
      
      // Save customer ID to Firebase
      await db.collection('users').doc(userId).update({
        stripeCustomerId: customerId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Saved customer ID to Firebase');
    } else {
      console.log('✅ Using existing Stripe customer:', customerId);
    }

    // Create Checkout Session
    console.log('🛒 Creating Stripe checkout session...');
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

    console.log('✅ Checkout session created:', session.id);

    // Log checkout attempt
    await db.collection('stripe_events').add({
      type: 'checkout_session_created',
      userId: userId,
      planId: planId,
      sessionId: session.id,
      customerId: customerId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Logged checkout attempt to Firebase');

    // 🔧 FIX: Return 'url' instead of 'checkoutUrl' to match frontend expectation
    res.status(200).json({ 
      url: session.url,        // ← FIXED: Frontend expects 'url'
      sessionId: session.id 
    });

    console.log('✅ Checkout session response sent successfully');

  } catch (error) {
    console.error('💥 Stripe checkout error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
