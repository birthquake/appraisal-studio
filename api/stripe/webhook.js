// api/stripe/webhook.js
// Handles Stripe webhook events to sync subscription status with Firebase

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  // 🔧 FIX: Use individual environment variables (same as checkout session)
  const privateKey = process.env.FIREBASE_PRIVATE_KEY_RAW 
    ? process.env.FIREBASE_PRIVATE_KEY_RAW.replace(/\\n/g, '\n')
    : process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      type: process.env.FIREBASE_TYPE || 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: process.env.FIREBASE_PROVIDER_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    }),
  });
}

const db = admin.firestore();

// Webhook endpoint secret from Stripe Dashboard
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Plan mapping
const PLAN_MAPPING = {
  [process.env.STRIPE_PROFESSIONAL_PRICE_ID]: {
    plan: 'professional',
    usageLimit: 100
  },
  [process.env.STRIPE_AGENCY_PRICE_ID]: {
    plan: 'agency', 
    usageLimit: -1 // unlimited
  }
};

// Disable body parsing to get raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to read raw body
const getRawBody = (req) => {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', err => {
      reject(err);
    });
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let event;

  try {
    // Get raw body for signature verification
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];

    // 🐛 DEBUG: Enhanced webhook debugging
    console.log('🎣 Webhook received:', {
      hasSignature: !!sig,
      hasSecret: !!endpointSecret,
      bodyLength: rawBody.length
    });

    // Verify webhook signature
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    console.log('✅ Webhook signature verified:', event.type);

  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  // Handle the event
  try {
    console.log('📥 Processing webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    // Log webhook event
    await db.collection('stripe_events').add({
      type: 'webhook_received',
      eventType: event.type,
      eventId: event.id,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      data: event.data.object
    });

    console.log('✅ Webhook processed successfully:', event.type);
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('💥 Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// Handle successful checkout
async function handleCheckoutCompleted(session) {
  const firebaseUserId = session.metadata?.firebaseUserId;
  
  console.log('🎉 Processing checkout completion:', {
    sessionId: session.id,
    userId: firebaseUserId,
    customer: session.customer
  });
  
  if (!firebaseUserId) {
    console.error('❌ No Firebase user ID in checkout session metadata');
    return;
  }

  try {
    // Update user with successful checkout
    await db.collection('users').doc(firebaseUserId).update({
      stripeCustomerId: session.customer,
      lastCheckoutSessionId: session.id,
      checkoutCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Checkout completed for user: ${firebaseUserId}`);
  } catch (error) {
    console.error('💥 Error updating user after checkout:', error);
  }
}

// Handle subscription creation
async function handleSubscriptionCreated(subscription) {
  const firebaseUserId = subscription.metadata?.firebaseUserId;
  
  console.log('🆕 Processing subscription creation:', {
    subscriptionId: subscription.id,
    userId: firebaseUserId,
    status: subscription.status
  });
  
  if (!firebaseUserId) {
    console.error('❌ No Firebase user ID in subscription metadata');
    return;
  }

  try {
    const priceId = subscription.items.data[0]?.price?.id;
    const planInfo = PLAN_MAPPING[priceId];
    
    console.log('📊 Plan mapping:', {
      priceId: priceId,
      planInfo: planInfo
    });
    
    if (!planInfo) {
      console.error('❌ Unknown price ID:', priceId);
      return;
    }

    // Update user subscription status
    const updateData = {
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      plan: planInfo.plan, // 🔧 FIX: Use 'plan' not 'currentPlan'
      usageLimit: planInfo.usageLimit,
      subscriptionCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      subscriptionCurrentPeriodStart: new Date(subscription.current_period_start * 1000),
      subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Reset usage count for new subscription
      usageCount: 0
    };

    await db.collection('users').doc(firebaseUserId).update(updateData);

    console.log(`✅ Subscription created for user: ${firebaseUserId}, plan: ${planInfo.plan}`);
  } catch (error) {
    console.error('💥 Error updating user subscription:', error);
  }
}

// Handle subscription updates (plan changes, renewals)
async function handleSubscriptionUpdated(subscription) {
  const firebaseUserId = subscription.metadata?.firebaseUserId;
  
  console.log('📝 Processing subscription update:', {
    subscriptionId: subscription.id,
    userId: firebaseUserId,
    status: subscription.status
  });
  
  if (!firebaseUserId) {
    console.error('❌ No Firebase user ID in subscription metadata');
    return;
  }

  try {
    const priceId = subscription.items.data[0]?.price?.id;
    const planInfo = PLAN_MAPPING[priceId];
    
    if (!planInfo) {
      console.error('❌ Unknown price ID:', priceId);
      return;
    }

    // Update subscription info
    const updateData = {
      subscriptionStatus: subscription.status,
      plan: planInfo.plan, // 🔧 FIX: Use 'plan' not 'currentPlan'
      usageLimit: planInfo.usageLimit,
      subscriptionCurrentPeriodStart: new Date(subscription.current_period_start * 1000),
      subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Handle cancellation
    if (subscription.cancel_at_period_end) {
      updateData.cancelAtPeriodEnd = true;
      updateData.cancellationDate = new Date(subscription.current_period_end * 1000);
    } else {
      updateData.cancelAtPeriodEnd = false;
      updateData.cancellationDate = admin.firestore.FieldValue.delete();
    }

    await db.collection('users').doc(firebaseUserId).update(updateData);

    console.log(`✅ Subscription updated for user: ${firebaseUserId}, status: ${subscription.status}`);
  } catch (error) {
    console.error('💥 Error updating subscription:', error);
  }
}

// Handle subscription deletion/cancellation
async function handleSubscriptionDeleted(subscription) {
  const firebaseUserId = subscription.metadata?.firebaseUserId;
  
  console.log('🗑️ Processing subscription deletion:', {
    subscriptionId: subscription.id,
    userId: firebaseUserId
  });
  
  if (!firebaseUserId) {
    console.error('❌ No Firebase user ID in subscription metadata');
    return;
  }

  try {
    // Revert to free plan
    await db.collection('users').doc(firebaseUserId).update({
      subscriptionStatus: 'canceled',
      plan: 'free', // 🔧 FIX: Use 'plan' not 'currentPlan'
      usageLimit: 5,
      subscriptionCanceledAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelAtPeriodEnd: false,
      cancellationDate: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Subscription canceled for user: ${firebaseUserId}`);
  } catch (error) {
    console.error('💥 Error handling subscription cancellation:', error);
  }
}

// Handle successful payment
async function handlePaymentSucceeded(invoice) {
  const customerId = invoice.customer;
  
  console.log('💰 Processing payment success:', {
    invoiceId: invoice.id,
    customerId: customerId
  });
  
  try {
    // Find user by customer ID
    const userQuery = await db.collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (userQuery.empty) {
      console.error('❌ No user found for customer:', customerId);
      return;
    }

    const userDoc = userQuery.docs[0];
    const firebaseUserId = userDoc.id;

    // Update payment info
    await db.collection('users').doc(firebaseUserId).update({
      lastPaymentSucceeded: admin.firestore.FieldValue.serverTimestamp(),
      lastInvoiceId: invoice.id,
      subscriptionStatus: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Reset usage count for new billing period
      usageCount: 0
    });

    console.log(`✅ Payment succeeded for user: ${firebaseUserId}`);
  } catch (error) {
    console.error('💥 Error handling payment success:', error);
  }
}

// Handle failed payment
async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;
  
  console.log('❌ Processing payment failure:', {
    invoiceId: invoice.id,
    customerId: customerId
  });
  
  try {
    // Find user by customer ID
    const userQuery = await db.collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (userQuery.empty) {
      console.error('❌ No user found for customer:', customerId);
      return;
    }

    const userDoc = userQuery.docs[0];
    const firebaseUserId = userDoc.id;

    // Update payment failure info
    await db.collection('users').doc(firebaseUserId).update({
      lastPaymentFailed: admin.firestore.FieldValue.serverTimestamp(),
      lastFailedInvoiceId: invoice.id,
      paymentFailureCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Payment failure recorded for user: ${firebaseUserId}`);
  } catch (error) {
    console.error('💥 Error handling payment failure:', error);
  }
}
