// /api/user/account.js
// Fetches user account data including subscription status and usage stats

const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
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

export default async function handler(req, res) {
  // Add CORS headers
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
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('🔍 Fetching account data for user:', userId);

    // Get user document from Firebase
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      // User doesn't exist in users collection yet - create default entry
      console.log('🆕 Creating default user entry for:', userId);
      
      const defaultUserData = {
        plan: 'free',
        subscriptionStatus: 'inactive',
        usageLimit: 5,
        usageCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('users').doc(userId).set(defaultUserData);
      
      return res.status(200).json({
        accountType: 'Free Plan',
        plan: 'free',
        subscriptionStatus: 'inactive',
        usageLimit: 5,
        usageCount: 0,
        remainingCredits: 5,
        hasActiveSubscription: false,
        hasStripeCustomer: false,
        billingPeriodStart: null,
        billingPeriodEnd: null,
        cancelAtPeriodEnd: false
      });
    }

    const userData = userDoc.data();
    console.log('📊 User data retrieved:', {
      plan: userData.plan,
      subscriptionStatus: userData.subscriptionStatus,
      usageCount: userData.usageCount,
      usageLimit: userData.usageLimit
    });

    // Calculate account details
    const plan = userData.plan || 'free';
    const usageLimit = userData.usageLimit || 5;
    const usageCount = userData.usageCount || 0;
    const remainingCredits = usageLimit === -1 ? 'Unlimited' : Math.max(0, usageLimit - usageCount);

    // Determine account type display name
    const accountTypeMap = {
      'free': 'Free Plan',
      'professional': 'Professional Plan',
      'agency': 'Agency Plan'
    };

    const accountType = accountTypeMap[plan] || 'Free Plan';

    // Check subscription status
    const hasActiveSubscription = userData.subscriptionStatus === 'active';
    const hasStripeCustomer = !!userData.stripeCustomerId;

    // Get this month's usage for "This Month" stat
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Query generations for this month
    let thisMonthCount = 0;
    try {
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

      const generationsQuery = db.collection('generations')
        .where('userId', '==', userId)
        .where('timestamp', '>=', startOfMonth)
        .where('timestamp', '<=', endOfMonth);

      const generationsSnapshot = await generationsQuery.get();
      thisMonthCount = generationsSnapshot.size;
      
      console.log('📅 This month usage:', thisMonthCount);
    } catch (error) {
      console.error('⚠️ Error calculating monthly usage:', error);
      // Fall back to usageCount if monthly calculation fails
      thisMonthCount = usageCount;
    }

    // Get total generations ever
    let totalGenerations = 0;
    try {
      const totalQuery = db.collection('generations').where('userId', '==', userId);
      const totalSnapshot = await totalQuery.get();
      totalGenerations = totalSnapshot.size;
      
      console.log('📊 Total generations:', totalGenerations);
    } catch (error) {
      console.error('⚠️ Error calculating total usage:', error);
      totalGenerations = usageCount;
    }

    // Format billing period dates
    let billingPeriodStart = null;
    let billingPeriodEnd = null;

    if (userData.subscriptionCurrentPeriodStart) {
      billingPeriodStart = userData.subscriptionCurrentPeriodStart.toDate?.() || userData.subscriptionCurrentPeriodStart;
    }

    if (userData.subscriptionCurrentPeriodEnd) {
      billingPeriodEnd = userData.subscriptionCurrentPeriodEnd.toDate?.() || userData.subscriptionCurrentPeriodEnd;
    }

    const accountData = {
      accountType,
      plan,
      subscriptionStatus: userData.subscriptionStatus || 'inactive',
      usageLimit,
      usageCount,
      remainingCredits,
      totalGenerations,
      thisMonth: thisMonthCount,
      hasActiveSubscription,
      hasStripeCustomer,
      stripeCustomerId: userData.stripeCustomerId || null,
      subscriptionId: userData.subscriptionId || null,
      billingPeriodStart,
      billingPeriodEnd,
      cancelAtPeriodEnd: userData.cancelAtPeriodEnd || false,
      lastPaymentSucceeded: userData.lastPaymentSucceeded,
      memberSince: userData.createdAt?.toDate?.() || new Date()
    };

    console.log('✅ Account data prepared:', {
      accountType: accountData.accountType,
      remainingCredits: accountData.remainingCredits,
      hasActiveSubscription: accountData.hasActiveSubscription
    });

    return res.status(200).json(accountData);

  } catch (error) {
    console.error('❌ Error fetching account data:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch account data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
