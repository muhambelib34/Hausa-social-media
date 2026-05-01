import { GoogleGenAI } from "@google/genai";

/**
 * Service to interact with Gemini AI for generating Hausa social media posts.
 */
export class GeminiService {
  private getAI(customKey?: string) {
    // Priority:
    // 1. Platform-selected key (process.env.API_KEY) - usually a paid key for Veo/Imagen
    // 2. User-entered custom key (customKey) - from settings
    // 3. Default platform key (process.env.GEMINI_API_KEY) - usually a free key
    const apiKey = process.env.API_KEY || customKey || process.env.GEMINI_API_KEY || "";
    return new GoogleGenAI({ apiKey });
  }

  private handleError(error: any) {
    console.error("Gemini API Error:", error);
    
    let errorObj = error;
    
    // Handle stringified error objects
    if (typeof error === 'string') {
      try {
        errorObj = JSON.parse(error);
      } catch (e) {
        // Check if it's a string that contains JSON
        const jsonMatch = error.match(/\{.*\}/);
        if (jsonMatch) {
          try {
            errorObj = JSON.parse(jsonMatch[0]);
          } catch (e2) {}
        }
      }
    }

    const errorStr = typeof error === 'string' ? error : JSON.stringify(error);

    // Extract status and message from various possible error structures
    const innerError = errorObj?.error || errorObj;
    const status = innerError?.status || innerError?.code || errorObj?.status || errorObj?.code;
    const message = innerError?.message || errorObj?.message || (typeof errorObj === 'string' ? errorObj : "");

    if (status === 'NOT_FOUND' || status === 404) {
      throw new Error("Ba a sami model din ba ko kuma API Key din ba shi da izini. (Model not found or API Key lacks permission.)");
    }

    if (status === 'PERMISSION_DENIED' || status === 403 || status === 'UNAUTHENTICATED' || status === 401) {
      if (message.includes("The caller does not have permission") || message.includes("permission")) {
        throw new Error("PERMISSION_DENIED: API Key dinka ba shi da izinin amfani da wannan model din ko kuma wannan tool din (kamar Google Search). Don Allah a sake zabar API Key a Settings ko a duba idan an kunna Gemini API a Google Cloud. (API Key lacks permission for this model or tool. Please re-select key or check if Gemini API is enabled.)");
      }
      throw new Error("API Key dinka bai yi daidai ba ko kuma ba ka da izini. (Invalid API Key or permission denied.)");
    }

    if (status === 'RESOURCE_EXHAUSTED' || status === 429) {
      throw new Error("Ka wuce iyakar kiran API na dan lokaci. Don Allah a jira kadan kafin ka sake gwadawa. (You have exceeded the API rate limit. Please wait a moment before trying again.)");
    }

    // Handle Proxy/XHR errors specially as transient
    if (errorStr.includes("ProxyUnaryCall") || errorStr.includes("xhr error") || errorStr.includes("error code: 6")) {
      throw new Error("An samu matsalar sadarwa da Gemini API (Proxy Error). Don Allah a sake gwadawa, wannan matsalar za ta iya gushewa da kanta. (A communication error occurred with the Gemini API (Proxy Error). Please try again, this issue may resolve itself.)");
    }

    if (status === 'INTERNAL' || status === 500 || status === 'UNAVAILABLE' || status === 503) {
      throw new Error("Gemini API yana fuskantar matsala a halin yanzu. Don Allah a sake gwadawa an jima. (Gemini API is currently experiencing internal issues. Please try again later.)");
    }

    if (message.includes("API key not valid")) {
      throw new Error("API Key dinka bai yi daidai ba. Don Allah a duba Settings. (Your API Key is invalid. Please check your Settings.)");
    }
    
    throw new Error("An samu matsala wajen kiran Gemini API. Don Allah a duba documentation don karin bayani: https://ai.google.dev/gemini-api/docs (Error calling Gemini API. Please consult the documentation for more details.)");
  }

  /**
   * Helper to execute API calls with retry logic for transient errors.
   */
  private async executeWithRetry<T>(fn: () => Promise<T>, retries: number = 2): Promise<T> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const errorStr = typeof error === 'string' ? error : JSON.stringify(error);
        const status = error?.error?.status || error?.status || error?.code;
        
        const isTransient = 
          status === 500 || status === 'INTERNAL' || 
          status === 503 || status === 'UNAVAILABLE' ||
          errorStr.includes("ProxyUnaryCall") || 
          errorStr.includes("xhr error") || 
          errorStr.includes("error code: 6");

        if (isTransient && i < retries - 1) {
          console.warn(`Transient error detected on attempt ${i + 1}, retrying...`, errorStr);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  /**
   * Generates a social media post based on a topic and language.
   * @param topic The user's input topic or prompt.
   * @param platform The target platform (Facebook, X, Instagram).
   * @param language The target language (Hausa, English, Yoruba, Igbo).
   * @param tone The desired tone for the post.
   * @param length The desired length of the post (Short, Medium, Long).
   * @param strictMode Whether to enforce strict language mode (no loanwords).
   */
  async generatePost(topic: string, platform: string = 'Facebook', language: string = 'Hausa', tone: string = 'Professional', length: string = 'Medium', strictMode: boolean = true, customKey?: string) {
    const systemInstruction = `You are an expert Social Media Manager fluent in ${language}. Your goal is to generate engaging, viral-ready posts based on user topics.

Guidelines:
- Language: Use standard ${language} that is widely understood.
- Tone: Adapt the tone based on the topic.
- Length: The post should be ${length.toLowerCase()} in length.
  * Short: 1-2 sentences, very concise.
  * Medium: 3-5 sentences, balanced.
  * Long: Detailed explanation, multiple paragraphs if needed.
- Platform Specifics: 
  * X (Twitter): Short, punchy, and engaging. Use threads if the topic is long.
  * Facebook: Conversational and community-focused.
  * Instagram: Visual descriptions, heavy on relevant emojis and hashtags at the end.
  * LinkedIn: Professional, structured, and insightful.
  * WhatsApp: Direct, informative, and easy to share.
- Formatting: Use emojis relevant to the ${language}-speaking community's digital culture.
- Constraint: Do not provide translations unless asked. Focus purely on high-quality ${language} prose.
${strictMode ? `- Strict Mode: Ensure no loanwords from other languages are used in the post body unless absolutely necessary for the context.` : ""}

Output Format:
You MUST return a JSON object with the following structure:
{
  "post": "The generated ${language} post text",
  "nativeHashtags": ["#hashtag1", "#hashtag2", ...],
  "englishHashtags": ["#hashtag1", "#hashtag2", ...]
}`;

    const prompt = `Generate a creative and engaging social media post for ${platform} in ${language} about the following topic: "${topic}". 
    The tone of the post should be ${tone} and the length should be ${length}.
    Make sure it follows the cultural nuances of the ${language}-speaking community. 
    Also suggest 5 relevant hashtags in ${language} and 5 in English.`;

    // --- Gemini API Call Structure ---
    // 1. Model Selection: Using 'gemini-3-flash-preview' for optimal balance of speed and quality.
    // 2. System Instruction: Sets the persona of a Hausa Social Media Manager with specific cultural guidelines.
    // 3. Contents: The user's prompt wrapped in the standard message format.
    // 4. Config: Parameters like temperature (creativity) and topP (diversity) to fine-tune the output.
    try {
      const ai = this.getAI(customKey);
      
      const response = await this.executeWithRetry(async () => {
        try {
          return await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.7,
              topP: 0.95,
              responseMimeType: "application/json"
            },
          });
        } catch (error: any) {
          // Handle stringified error objects for status check
          let errorObj = error;
          if (typeof error === 'string') {
            try { errorObj = JSON.parse(error); } catch (e) {}
          }
          const innerError = errorObj?.error || errorObj;
          const status = innerError?.status || innerError?.code || errorObj?.status || errorObj?.code;
          
          if (status === 'PERMISSION_DENIED' || status === 403) {
            console.warn("Permission denied for gemini-3-flash-preview, retrying with gemini-3.1-flash-lite-preview...");
            return await ai.models.generateContent({
              model: "gemini-3.1-flash-lite-preview",
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
                topP: 0.95,
                responseMimeType: "application/json"
              },
            });
          } else {
            throw error;
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      return {
        post: result.post || "Ba a iya samar da sakamako ba.",
        nativeHashtags: result.nativeHashtags || [],
        englishHashtags: result.englishHashtags || []
      };
    } catch (error: any) {
      this.handleError(error);
      return { post: "", nativeHashtags: [], englishHashtags: [] }; // Unreachable but for TS
    }
  }

  /**
   * Generates a descriptive image prompt based on the post text.
   * @param postText The generated post text.
   */
  async generateImagePrompt(postText: string, customKey?: string) {
    try {
      const ai = this.getAI(customKey);
      const prompt = `Based on the following social media post text, generate a highly descriptive, artistic, and visually appealing image generation prompt (in English). 
      The prompt should capture the essence, mood, and key subjects of the post. 
      Avoid using text or words in the image. Focus on the visual composition, lighting, and style.
      
      Post Text: "${postText}"
      
      Return only the descriptive prompt text.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: "You are an expert at creating highly descriptive and artistic prompts for AI image generators like Midjourney or DALL-E. Your prompts are vivid, detailed, and focus on visual storytelling.",
          temperature: 0.7,
        },
      });

      return response.text || postText.substring(0, 100);
    } catch (error: any) {
      console.error("Error generating image prompt:", error);
      // We don't want to crash the whole generation if just the prompt fails,
      // but we should still log it properly and maybe use a simpler fallback.
      try {
        this.handleError(error);
      } catch (e) {
        console.warn("Handled error in generateImagePrompt:", e);
      }
      return postText.substring(0, 100);
    }
  }

  /**
   * Generates an image based on a prompt.
   * @param prompt The prompt for image generation.
   * @param aspectRatio The aspect ratio of the image.
   * @param style The artistic style of the image.
   */
  async generateImage(prompt: string, aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1", style: string = "realistic", customKey?: string) {
    try {
      let finalStyle = style;
      if (style === 'human made') {
        finalStyle = "hand-drawn, organic textures, human touch, slightly imperfect but artistic, authentic manual creation, non-AI aesthetic";
      }
      const styledPrompt = `Style: ${finalStyle}. ${prompt}`;
      const ai = this.getAI(customKey);
      
      const response = await this.executeWithRetry(async () => {
        try {
          return await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: [{ role: "user", parts: [{ text: styledPrompt }] }],
            config: {
              imageConfig: {
                aspectRatio: aspectRatio
              }
            }
          });
        } catch (error: any) {
          // Fallback for image generation if 403
          let errorObj = error;
          if (typeof error === 'string') {
            try { errorObj = JSON.parse(error); } catch (e) {
              const jsonMatch = error.match(/\{.*\}/);
              if (jsonMatch) try { errorObj = JSON.parse(jsonMatch[0]); } catch (e2) {}
            }
          }
          const innerError = errorObj?.error || errorObj;
          const status = innerError?.status || innerError?.code || errorObj?.status || errorObj?.code;

          if (status === 'PERMISSION_DENIED' || status === 403) {
            console.warn("Permission denied for gemini-2.5-flash-image, retrying with gemini-3.1-flash-image-preview...");
            return await ai.models.generateContent({
              model: "gemini-3.1-flash-image-preview",
              contents: [{ role: "user", parts: [{ text: styledPrompt }] }],
              config: {
                imageConfig: {
                  aspectRatio: aspectRatio
                }
              }
            });
          } else {
            throw error;
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error: any) {
      this.handleError(error);
      return null;
    }
  }

  /**
   * Fetches latest breaking news related to Northern Nigeria and general topics.
   */
  async getBreakingNews(customKey?: string, retries = 2) {
    try {
      const ai = this.getAI(customKey);
      
      const response = await this.executeWithRetry(async () => {
        let useTools = true; 
        
        try {
          const config: any = {
            responseMimeType: "application/json",
            tools: [{ googleSearch: {} }]
          };
          
          return await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ 
              role: "user", 
              parts: [{ 
                text: "Samar da gajerun labarai 5 na yanzu-yanzu (breaking news) da suka shafi Najeriya da duniya a harshen Hausa. Koma da sakamakon a matsayin JSON: { \"news\": [ { \"title\": \"...\", \"category\": \"...\" } ] }" 
              }] 
            }],
            config: config,
          });
        } catch (error: any) {
          const errorStr = typeof error === 'string' ? error : JSON.stringify(error);
          const status = error?.error?.status || error?.status || error?.code;
          
          if (status === 'PERMISSION_DENIED' || status === 403) {
            console.warn("Permission denied for news tools, retrying without tools...");
            return await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: [{ 
                role: "user", 
                parts: [{ 
                  text: "Samar da gajerun labarai 5 na yanzu-yanzu (breaking news) da suka shafi Najeriya da duniya a harshen Hausa. Koma da sakamakon a matsayin JSON: { \"news\": [ { \"title\": \"...\", \"category\": \"...\" } ] }" 
                }] 
              }],
              config: { responseMimeType: "application/json" },
            });
          }
          throw error;
        }
      }, retries);

      const text = response.text || "{}";
      const result = JSON.parse(text);
      return result.news || [];
    } catch (error: any) {
      console.error("Failed to fetch news after retries:", error);
      return [];
    }
  }

  /**
   * Translates text between supported Nigerian languages and English.
   * @param text The text to translate.
   * @param targetLanguage The language to translate into.
   */
  async translateText(text: string, targetLanguage: string, customKey?: string) {
    try {
      const ai = this.getAI(customKey);
      const prompt = `Translate the following text into ${targetLanguage}. 
      If the text is already in ${targetLanguage}, return it as is.
      Text: "${text}"`;
      
      const response = await this.executeWithRetry(async () => {
        try {
          return await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              systemInstruction: `You are a professional translator specializing in Nigerian languages (Hausa, Yoruba, Igbo, Pidgin) and English. 
              Provide only the translated text accurately, capturing the cultural nuances. No explanations.`,
              temperature: 0.3,
            },
          });
        } catch (error: any) {
          // Handle stringified error objects for status check
          let errorObj = error;
          if (typeof error === 'string') {
            try { errorObj = JSON.parse(error); } catch (e) {}
          }
          const innerError = errorObj?.error || errorObj;
          const status = innerError?.status || innerError?.code || errorObj?.status || errorObj?.code;
          
          if (status === 'PERMISSION_DENIED' || status === 403) {
            console.warn("Permission denied for gemini-3-flash-preview, retrying with gemini-3.1-flash-lite-preview...");
            return await ai.models.generateContent({
              model: "gemini-3.1-flash-lite-preview",
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              config: {
                systemInstruction: `You are a professional translator between Nigerian languages. 
                Provide only the translated text without any explanations or additional content.`,
                temperature: 0.3,
              },
            });
          } else {
            throw error;
          }
        }
      });

      return response.text || "";
    } catch (error: any) {
      this.handleError(error);
      return "";
    }
  }

  /**
   * Generates content ideas based on trending topics or user interests.
   * @param interests User-defined interests or keywords.
   * @param trendingTopics Array of current trending news/topics.
   * @param language Target language for the ideas.
   */
  async generateContentIdeas(interests: string, trendingTopics: any[], language: string = 'Hausa', customKey?: string) {
    const topicsStr = trendingTopics.map(t => t.title).join(", ");
    const systemInstruction = `You are a creative Content Strategist and Social Media Consultant specialized in the ${language}-speaking market. 
    Your goal is to provide high-potential content ideas that drive engagement and growth.`;

    const prompt = `Generate 5 unique and engaging content ideas for social media based on the following:
    
    User's Interests: ${interests || "General trending topics and community interests"}
    Current Trending Topics: ${topicsStr || "Latest news in Nigeria and globally"}
    Preferred Language: ${language}
    
    For each idea, you MUST provide:
    1. A catchy title (Hausa & English)
    2. A brief description of the content idea (in ${language})
    3. The best social media platform for this content
    4. The "Angle" - why this will work (in ${language})
    
    Output Format:
    Return a JSON object with the following structure:
    {
      "ideas": [
        {
          "title": "Hausa Title | English Title",
          "description": "...",
          "platform": "Facebook/X/Instagram/TikTok/LinkedIn",
          "angle": "..."
        }
      ]
    }`;

    try {
      const ai = this.getAI(customKey);
      
      const response = await this.executeWithRetry(async () => {
        try {
          return await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.8,
              topP: 0.9,
              responseMimeType: "application/json"
            },
          });
        } catch (error: any) {
          let errorObj = error;
          if (typeof error === 'string') {
            try { errorObj = JSON.parse(error); } catch (e) {}
          }
          const status = errorObj?.error?.status || errorObj?.status || errorObj?.code;
          
          if (status === 'PERMISSION_DENIED' || status === 403) {
            return await ai.models.generateContent({
              model: "gemini-3.1-flash-lite-preview",
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              config: {
                systemInstruction: systemInstruction,
                temperature: 0.8,
                topP: 0.9,
                responseMimeType: "application/json"
              },
            });
          } else {
            throw error;
          }
        }
      });

      const text = response.text || "{}";
      const result = JSON.parse(text);
      return result.ideas || [];
    } catch (error: any) {
      this.handleError(error);
      return [];
    }
  }
}
