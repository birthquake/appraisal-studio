// Enhanced /api/property.js - Multi-Content Type API (Backward Compatible)

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { propertyData, contentType } = req.body;

    // Validate required fields
    if (!propertyData?.address || !propertyData?.price) {
      return res.status(400).json({ 
        error: 'Missing required fields: address and price are required' 
      });
    }

    // Default to 'description' if no contentType provided (backward compatibility)
    const selectedContentType = contentType || 'description';

    // Build content-specific prompt
    const prompt = buildContentPrompt(propertyData, selectedContentType);
    const systemMessage = getSystemMessage(selectedContentType);

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

// System messages for different content types
function getSystemMessage(contentType) {
  const systemMessages = {
    description: `You are a professional real estate copywriter. Create compelling but factual property descriptions based ONLY on the information provided. Do not make assumptions or add details not specified. Keep descriptions professional, accurate, and engaging for potential buyers.`,
    
    social_listing: `You are a social media expert for real estate. Create engaging Facebook/Instagram posts that announce new listings. Use an excited but professional tone, include relevant hashtags, and make it shareable. Focus on what makes this property special.`,
    
    email_alert: `You are writing professional email templates for real estate agents to send to their client lists. Create clear, informative new listing alerts that provide key details and encourage action. Use a professional but friendly tone.`,
    
    marketing_flyer: `You are creating marketing highlights for property flyers and presentations. Focus on the key selling points and features that make this property stand out. Use bullet points and compelling language that emphasizes value.`,
    
    just_listed: `You are creating celebratory "Just Listed" social media posts. Use an exciting, congratulatory tone that builds anticipation. Make it feel like a special announcement that followers will want to share.`,
    
    open_house: `You are writing open house invitation posts. Create welcoming, informative invitations that provide key property highlights and encourage attendance. Include a clear call-to-action to attend.`
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

// Temperature settings for different content types
function getTemperature(contentType) {
  const temperatures = {
    description: 0.7,
    social_listing: 0.8,
    email_alert: 0.6,
    marketing_flyer: 0.7,
    just_listed: 0.9,
    open_house: 0.7
  };

  return temperatures[contentType] || 0.7;
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

// New prompt builders for different content types
function buildSocialListingPrompt(baseInfo) {
  return `${baseInfo}

Create an engaging social media post that:
1. Announces this new listing with excitement
2. Highlights 2-3 key selling points
3. Uses a friendly, professional tone
4. Includes relevant hashtags (3-5)
5. Encourages engagement and sharing
6. Is approximately 50-100 words
7. Makes followers want to learn more`;
}

function buildEmailAlertPrompt(baseInfo) {
  return `${baseInfo}

Create a professional email template that:
1. Has a clear subject line approach
2. Provides key property details
3. Highlights what makes this property special
4. Includes a clear call-to-action
5. Uses professional but warm tone
6. Is approximately 75-150 words
7. Encourages recipients to schedule a showing`;
}

function buildMarketingFlyerPrompt(baseInfo) {
  return `${baseInfo}

Create marketing highlights that:
1. List the key selling points in an organized way
2. Emphasize value and unique features
3. Use compelling but factual language
4. Are suitable for flyers or presentations
5. Focus on what buyers care most about
6. Is approximately 50-100 words
7. Make the property stand out from competition`;
}

function buildJustListedPrompt(baseInfo) {
  return `${baseInfo}

Create an exciting "Just Listed" announcement that:
1. Celebrates the new listing
2. Builds anticipation and excitement
3. Highlights 1-2 key features that wow
4. Uses an enthusiastic but professional tone
5. Includes relevant hashtags
6. Is approximately 30-75 words
7. Makes people want to see more immediately`;
}

function buildOpenHousePrompt(baseInfo) {
  return `${baseInfo}

Create an open house invitation that:
1. Welcomes potential buyers warmly
2. Highlights key property features
3. Creates urgency to attend
4. Uses an inviting, friendly tone
5. Includes a clear call-to-action to attend
6. Is approximately 75-125 words
7. Makes the open house sound unmissable

Note: Do not include specific date/time details - focus on the property appeal and invitation to attend.`;
}

// Your existing helper function (keeping it exactly as is)
function formatFeatureName(camelCaseString) {
  return camelCaseString
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}
