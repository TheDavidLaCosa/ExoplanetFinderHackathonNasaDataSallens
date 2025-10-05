import Groq from "groq-sdk";

// Initialize Groq client
// Note: In production, use environment variables for the API key
const groq = new Groq({
  apiKey: process.env.REACT_APP_GROQ_API_KEY,
  dangerouslyAllowBrowser: true // Only for development
});

/**
 * System prompt for NASA DataPilot
 */
const SYSTEM_PROMPT = `You are NASA DataPilot, an AI assistant specialized in NASA data analysis and space science. You help users:

1. Understand NASA datasets (Kepler, TESS, exoplanets, climate data, etc.)
2. Learn about exoplanet detection methods (transit, radial velocity, microlensing)
3. Train neural networks on NASA data
4. Explore space missions and discoveries

Key knowledge areas:
- Exoplanet science and detection methods
- NASA missions (Kepler, TESS, Hubble, JWST, etc.)
- Machine learning for astronomy
- Data analysis techniques
- Space exploration history

Be conversational, educational, and enthusiastic about space science. When users ask about specific exoplanets, provide real information. If you don't know something specific, acknowledge it and suggest where they might find the information (like the Dashboard or Data sections).

Keep responses concise but informative (2-4 paragraphs unless asked for more detail).`;

/**
 * Chat with Groq AI
 * @param {Array} messages - Array of message objects with {role, content}
 * @returns {Promise<string>} AI response
 */
export async function chatWithGroq(messages) {
  try {
    // Add system prompt
    const messagesWithSystem = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
    ];

    const completion = await groq.chat.completions.create({
      messages: messagesWithSystem,
      model: "llama-3.3-70b-versatile", // Fast and powerful model
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
      stream: false
    });

    return completion.choices[0]?.message?.content || "I apologize, I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Groq API error:", error);
    
    if (error.message?.includes('API key')) {
      return "⚠️ Groq API key not configured. Please set REACT_APP_GROQ_API_KEY in your .env file. Get your free API key at https://console.groq.com/";
    }
    
    throw error;
  }
}

/**
 * Stream chat with Groq AI (for real-time responses)
 * @param {Array} messages - Array of message objects
 * @param {Function} onChunk - Callback for each chunk of text
 * @returns {Promise<string>} Complete response
 */
export async function chatWithGroqStream(messages, onChunk) {
  try {
    const messagesWithSystem = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
    ];

    const stream = await groq.chat.completions.create({
      messages: messagesWithSystem,
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024,
      stream: true
    });

    let fullResponse = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullResponse += content;
      if (onChunk && content) {
        onChunk(content);
      }
    }

    return fullResponse;
  } catch (error) {
    console.error("Groq streaming error:", error);
    
    if (error.message?.includes('API key')) {
      const errorMsg = "⚠️ Groq API key not configured. Please set REACT_APP_GROQ_API_KEY in your .env file.";
      if (onChunk) onChunk(errorMsg);
      return errorMsg;
    }
    
    throw error;
  }
}

/**
 * Analyze features using Groq AI for unknown/generic datasets
 * @param {Array} features - Array of feature objects with {name, type, sample}
 * @param {Array} sampleRows - Sample data rows (first 5 rows)
 * @returns {Promise<Object>} Feature analysis with recommendations
 */
export async function analyzeFeatures(features, sampleRows = []) {
  try {
    const featureList = features.map(f => `${f.name} (${f.type})`).join(', ');
    
    // Handle null or empty sampleRows
    const validSampleRows = Array.isArray(sampleRows) && sampleRows.length > 0 ? sampleRows : [];
    const sampleData = validSampleRows.length > 0 
      ? validSampleRows.slice(0, 3).map((row, i) => `Row ${i + 1}: ${JSON.stringify(row)}`).join('\n')
      : 'No sample data available';
    
    const prompt = `Analyze this dataset and provide feature recommendations for machine learning:

FEATURES: ${featureList}

SAMPLE DATA:
${sampleData}

Provide a JSON response with this structure:
{
  "features": [
    {
      "name": "feature_name",
      "description": "brief description",
      "importance": "high|medium|low",
      "recommendFor": "target|feature|exclude",
      "reason": "why it's useful or not"
    }
  ],
  "recommendedTarget": "best_target_column_name",
  "recommendedFeatures": ["feature1", "feature2", "feature3", "feature4", "feature5"]
}

Focus on:
1. Which column is best for prediction (target)
2. Which features are most predictive (input features)
3. Which features to exclude (IDs, redundant data)

Respond ONLY with valid JSON, no markdown or explanation.`;

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('GROQ request timeout after 10 seconds')), 10000)
    );
    
    const completionPromise = groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a data science expert specializing in feature engineering and ML model design. Respond only with valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3, // Lower temperature for more consistent JSON
      max_tokens: 2048,
      top_p: 1,
      stream: false
    });
    
    const completion = await Promise.race([completionPromise, timeoutPromise]);

    const response = completion.choices[0]?.message?.content || "{}";
    
    // Try to parse JSON, handling potential markdown wrapping
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }
    
    const analysis = JSON.parse(jsonStr);
    return analysis;
  } catch (error) {
    console.error("Groq feature analysis error:", error);
    
    // Return empty analysis on error
    return {
      features: [],
      recommendedTarget: null,
      recommendedFeatures: []
    };
  }
}

export default {
  chatWithGroq,
  chatWithGroqStream,
  analyzeFeatures
};

