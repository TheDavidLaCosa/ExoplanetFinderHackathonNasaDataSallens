import Groq from "groq-sdk";

// Initialize Groq client
// Note: In production, use environment variables for the API key
const apiKey = process.env.REACT_APP_GROQ_API_KEY || process.env.GROQ_API_KEY || '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';

// Debug logging
console.log('Environment variables check:');
console.log('REACT_APP_GROQ_API_KEY:', process.env.REACT_APP_GROQ_API_KEY);
console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY);
console.log('Final apiKey:', apiKey);

const groq = apiKey ? new Groq({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true // Only for development
}) : null;

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
    if (!groq) {
      return "⚠️ Groq API key not configured. Please set REACT_APP_GROQ_API_KEY or GROQ_API_KEY in your .env file. Get your free API key at https://console.groq.com/";
    }

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
      return "⚠️ Groq API key not configured. Please set REACT_APP_GROQ_API_KEY or GROQ_API_KEY in your .env file. Get your free API key at https://console.groq.com/";
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
    if (!groq) {
      const errorMsg = "⚠️ Groq API key not configured. Please set REACT_APP_GROQ_API_KEY or GROQ_API_KEY in your .env file. Get your free API key at https://console.groq.com/";
      if (onChunk) onChunk(errorMsg);
      return errorMsg;
    }

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
      const errorMsg = "⚠️ Groq API key not configured. Please set REACT_APP_GROQ_API_KEY or GROQ_API_KEY in your .env file. Get your free API key at https://console.groq.com/";
      if (onChunk) onChunk(errorMsg);
      return errorMsg;
    }
    
    throw error;
  }
}

export default {
  chatWithGroq,
  chatWithGroqStream
};

