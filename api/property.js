// Enhanced /api/property.js - Multi-Content Type API with Usage Tracking

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
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { propertyData, contentType, userId } = req.body;

    // Validate required fields
    if (!propertyData?.address || !propertyData?.price) {
      return res.status(400).json({ 
        error: 'Missing required fields: address and price are required' 
      });
    }

    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required' 
      });
    }

    console.log('🏠 Processing content generation:', {
      userId: userId,
      contentType: contentType || 'description',
      address: propertyData.address
    });

    // Check user's usage limits before generating content
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      // Create user document if it doesn't exist (new free user)
      console.log('🆕 Creating new user document:', userId);
      const defaultUserData = {
        plan: 'free',
        subscriptionStatus: 'inactive',
        usageLimit: 5,
        usageCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await db.collection('users').doc(userId).set(defaultUserData);
    }

    const userData = userDoc.exists ? userDoc.data() : {
      plan: 'free',
      usageLimit: 5,
      usageCount: 0
    };

    console.log('📊 User usage check:', {
      plan: userData.plan,
      usageCount: userData.usageCount,
      usageLimit: userData.usageLimit
    });

    // Check if user has exceeded their limits
    // Free: 5 limit, Professional: 100 limit, Agency: unlimited (-1)
    const hasUnlimitedUsage = userData.usageLimit === -1;
    const isWithinLimit = userData.usageCount < userData.usageLimit;
    
    if (!hasUnlimitedUsage && !isWithinLimit) {
      console.log('❌ Usage limit exceeded for user:', userId);
      return res.status(403).json({ 
        error: 'Usage limit exceeded. Please upgrade your plan to continue.',
        usageCount: userData.usageCount,
        usageLimit: userData.usageLimit
      });
    }

    // Default to 'description' if no contentType provided (backward compatibility)
    const selectedContentType = contentType || 'description';

    // Build content-specific prompt
    const prompt = buildContentPrompt(propertyData, selectedContentType);
    const systemMessage = getSystemMessage(selectedContentType);

    console.log('🤖 Calling OpenAI API for:', selectedContentType);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: getMaxTokens(selectedContentType),
        temperature: getTemperature(selectedContentType),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('No content generated');
    }

    console.log('✅ Content generated successfully');

    // Increment user's usage count
    await db.collection('users').doc(userId).update({
      usageCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`📈 Usage incremented for user ${userId}. Content type: ${selectedContentType}`);

    // Return with both 'description' (backward compatibility) and 'content' (new format)
    return res.status(200).json({ 
      description: content,  // For backward compatibility with existing app
      content: content       // For new multi-content interface
    });

  } catch (error) {
    console.error('Property API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate description. Please try again.' 
    });
  }
}

// Updated system messages with stronger factual focus
function getSystemMessage(contentType) {
  const systemMessages = {
    description: `You are a professional real estate copywriter. Create accurate, professional property descriptions based ONLY on the information provided. Do not make assumptions, add details not specified, or use exaggerated claims. Keep descriptions factual, compliant, and professional for potential buyers.`,
    
    social_listing: `You are creating social media posts for real estate listings. Use ONLY the provided property information. Create professional announcements that are factual and engaging without exaggeration. Include relevant hashtags but avoid hype or pressure language.`,
    
    email_alert: `You are writing professional email templates for real estate agents. Create clear, factual new listing alerts using only provided details. Use a professional tone and encourage action through factual presentation, not pressure tactics.`,
    
    marketing_flyer: `You are creating marketing content for property flyers. Focus on the actual features and details provided. Use professional language that highlights factual selling points without exaggerated claims or assumptions about value.`,
    
    just_listed: `You are creating professional "Just Listed" announcements. Use an upbeat but factual tone that announces the new listing based only on provided information. Avoid exaggerated claims or emotional manipulation.`,
    
    open_house: `You are writing open house invitations. Create welcoming, factual invitations using only the provided property details. Encourage attendance through professional presentation of actual features, not hype.`
  };

  return systemMessages[contentType] || systemMessages.description;
}

// Max tokens for different content types
function getMaxTokens(contentType) {
  const maxTokens = {
    description: 400,
    social_listing: 200,
    email_alert: 300,
    marketing_flyer: 250,
    just_listed: 150,
    open_house: 250
  };

  return maxTokens[contentType] || 400;
}

// Updated temperature settings for more consistent, factual output
function getTemperature(contentType) {
  const temperatures = {
    description: 0.6,      // Reduced from 0.7
    social_listing: 0.7,   // Reduced from 0.8  
    email_alert: 0.5,      // Reduced from 0.6
    marketing_flyer: 0.6,  // Reduced from 0.7
    just_listed: 0.7,      // Significantly reduced from 0.9
    open_house: 0.6        // Reduced from 0.7
  };

  return temperatures[contentType] || 0.6;
}

// Build content-specific prompts
function buildContentPrompt(data, contentType) {
  if (contentType === 'description') {
    // Use your existing buildPropertyPrompt for descriptions
    return buildPropertyPrompt(data);
  }
  
  // For other content types, use new specialized prompts
  const baseInfo = buildBasePropertyInfo(data);
  
  const contentPrompts = {
    social_listing: buildSocialListingPrompt(baseInfo),
    email_alert: buildEmailAlertPrompt(baseInfo),
    marketing_flyer: buildMarketingFlyerPrompt(baseInfo),
    just_listed: buildJustListedPrompt(baseInfo),
    open_house: buildOpenHousePrompt(baseInfo)
  };

  return contentPrompts[contentType] || buildPropertyPrompt(data);
}

// Your existing buildPropertyPrompt function (keeping it exactly as is)
function buildPropertyPrompt(data) {
  let prompt = `Create a professional property description for the following property:\n\n`;

  // Required information
  prompt += `Address: ${data.address}\n`;
  prompt += `Property Type: ${data.propertyType}\n`;
  prompt += `Price: $${data.price}\n`;

  // Basic details (if provided)
  if (data.bedrooms) prompt += `Bedrooms: ${data.bedrooms}\n`;
  if (data.bathrooms) prompt += `Bathrooms: ${data.bathrooms}\n`;
  if (data.sqft) prompt += `Square Feet: ${data.sqft}\n`;

  // Optional details (only include if provided)
  if (data.yearBuilt) {
    prompt += `Year Built: ${data.yearBuilt}\n`;
  }

  if (data.lotSize) {
    prompt += `Lot Size: ${data.lotSize}\n`;
  }

  if (data.parking) {
    prompt += `Parking: ${data.parking}\n`;
  }

  if (data.condition) {
    prompt += `Property Condition: ${data.condition}\n`;
  }

  if (data.schoolDistrict) {
    prompt += `School District: ${data.schoolDistrict}\n`;
  }

  // Features section
  const allFeatures = [];
  
  // Add manual features if provided
  if (data.features && data.features.trim()) {
    allFeatures.push(data.features.trim());
  }

  // Add selected special features
  if (data.specialFeatures) {
    const selectedFeatures = Object.entries(data.specialFeatures)
      .filter(([key, value]) => value)
      .map(([key, value]) => {
        // Convert camelCase to readable text
        return key.replace(/([A-Z])/g, ' $1')
                 .replace(/^./, str => str.toUpperCase())
                 .toLowerCase();
      });
    
    if (selectedFeatures.length > 0) {
      allFeatures.push(...selectedFeatures);
    }
  }

  if (allFeatures.length > 0) {
    prompt += `Key Features: ${allFeatures.join(', ')}\n`;
  }

  // Neighborhood information
  if (data.neighborhood && data.neighborhood.trim()) {
    prompt += `Neighborhood: ${data.neighborhood.trim()}\n`;
  }

  // Instructions for the AI
  prompt += `\nPlease create a compelling property description that:
1. Uses ONLY the information provided above
2. Highlights the most appealing aspects
3. Flows naturally and reads professionally
4. Is suitable for MLS listings or marketing materials
5. Stays factual and avoids speculation
6. Is approximately 100-200 words
7. Emphasizes location, value, and key selling points

Do not add details about schools, nearby amenities, or neighborhood characteristics unless specifically mentioned above.`;

  return prompt;
}

// New function to build base property info for other content types
function buildBasePropertyInfo(data) {
  let info = `Property: ${data.address}\n`;
  info += `Type: ${data.propertyType}\n`;
  info += `Price: $${data.price}\n`;

  if (data.bedrooms) info += `Bedrooms: ${data.bedrooms}\n`;
  if (data.bathrooms) info += `Bathrooms: ${data.bathrooms}\n`;
  if (data.sqft) info += `Square Feet: ${data.sqft}\n`;
  if (data.yearBuilt) info += `Year Built: ${data.yearBuilt}\n`;
  if (data.lotSize) info += `Lot Size: ${data.lotSize}\n`;
  if (data.parking) info += `Parking: ${data.parking}\n`;
  if (data.condition) info += `Condition: ${data.condition}\n`;
  if (data.schoolDistrict) info += `School District: ${data.schoolDistrict}\n`;

  // Add features
  const allFeatures = [];
  if (data.features && data.features.trim()) {
    allFeatures.push(data.features.trim());
  }
  
  if (data.specialFeatures) {
    const selectedFeatures = Object.entries(data.specialFeatures)
      .filter(([key, value]) => value)
      .map(([key, value]) => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()));
    
    allFeatures.push(...selectedFeatures);
  }

  if (allFeatures.length > 0) {
    info += `Features: ${allFeatures.join(', ')}\n`;
  }

  if (data.neighborhood && data.neighborhood.trim()) {
    info += `Neighborhood: ${data.neighborhood.trim()}\n`;
  }

  return info;
}

// Updated prompt builders with stronger factual focus
function buildSocialListingPrompt(baseInfo) {
  return `${baseInfo}

Create a professional social media post that:
1. Announces this new listing using only provided information
2. Lists 2-3 actual property features (no assumptions)
3. Uses professional, factual tone
4. Includes relevant hashtags (3-5)
5. Encourages engagement through facts, not hype
6. Is approximately 50-100 words
7. Stays compliant with real estate advertising standards

AVOID: Exaggerated claims, assumptions about value, pressure language`;
}

function buildEmailAlertPrompt(baseInfo) {
  return `${baseInfo}

Create a professional email template that:
1. Has a clear subject line approach
2. Provides key property details using only provided information
3. Highlights actual documented property features
4. Includes a professional call-to-action
5. Uses factual but warm tone
6. Is approximately 75-150 words
7. Encourages recipients to schedule a showing through facts

AVOID: Pressure tactics, exaggerated claims, false urgency`;
}

function buildMarketingFlyerPrompt(baseInfo) {
  return `${baseInfo}

Create marketing highlights that:
1. List actual selling points from provided information only
2. Use factual, professional language
3. Present features without exaggerated claims
4. Are suitable for compliant real estate marketing
5. Focus on documented property characteristics
6. Is approximately 50-100 words
7. Maintain professional credibility

AVOID: Superlatives, assumptions about investment potential, emotional appeals`;
}

function buildJustListedPrompt(baseInfo) {
  return `${baseInfo}

Create a professional "Just Listed" announcement that:
1. Announces the new listing factually
2. Uses provided information only
3. Maintains professional, compliant tone
4. Highlights 1-2 actual documented features
5. Includes relevant hashtags appropriately
6. Is approximately 30-75 words
7. Stays within real estate advertising guidelines

AVOID: Excessive excitement, pressure language, unsubstantiated claims`;
}

function buildOpenHousePrompt(baseInfo) {
  return `${baseInfo}

Create a professional open house invitation that:
1. Invites potential buyers using factual information
2. Highlights actual property features only
3. Uses welcoming but professional tone
4. Encourages attendance through facts, not pressure
5. Includes clear but non-aggressive call-to-action
6. Is approximately 75-125 words
7. Maintains compliance with advertising standards

AVOID: Pressure tactics, exaggerated claims, artificial urgency

Note: Do not include specific date/time details - focus on factual property presentation.`;
}

// Your existing helper function (keeping it exactly as is)
function formatFeatureName(camelCaseString) {
  return camelCaseString
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}
