// Enhanced /api/property.js - Handles optional fields for richer descriptions

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { propertyData } = req.body;

    // Validate required fields
    if (!propertyData?.address || !propertyData?.price) {
      return res.status(400).json({ 
        error: 'Missing required fields: address and price are required' 
      });
    }

    // Build dynamic prompt based on provided data
    const prompt = buildPropertyPrompt(propertyData);

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
            content: `You are a professional real estate copywriter. Create compelling but factual property descriptions based ONLY on the information provided. Do not make assumptions or add details not specified. Keep descriptions professional, accurate, and engaging for potential buyers.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const description = data.choices[0]?.message?.content?.trim();

    if (!description) {
      throw new Error('No description generated');
    }

    return res.status(200).json({ description });

  } catch (error) {
    console.error('Property API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate description. Please try again.' 
    });
  }
}

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

// Helper function to format special features for readability
function formatFeatureName(camelCaseString) {
  return camelCaseString
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}
