import { GoogleGenAI } from "@google/genai";

/**
 * Service to interact with Gemini AI for generating Hausa social media posts.
 */
export class GeminiService {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Generates a social media post in Hausa based on a topic.
   * @param topic The user's input topic or prompt.
   * @param platform The target platform (Facebook, X, Instagram).
   * @param strictHausa Whether to enforce strict Hausa mode.
   */
  async generatePost(topic: string, platform: string = 'Facebook', strictHausa: boolean = true) {
    const systemInstruction = `You are an expert Social Media Manager fluent in Hausa. Your goal is to generate engaging, viral-ready posts based on user topics.

Guidelines:
- Dialect: Use standard Hausa (Kano dialect) that is widely understood.
- Tone: Adapt the tone based on the topic (e.g., mai ban dariya for humor, mai sosa rai for emotional, or na ilmantarwa for educational).
- Formatting: Use emojis and hashtags relevant to Northern Nigerian digital culture (e.g., #Hausa, #Arewa, #Nijeriya).
- Constraint: Do not provide English translations unless asked. Focus purely on high-quality Hausa prose.
${strictHausa ? "- Strict Mode: Ensure no English loanwords are used unless absolutely necessary for the context." : ""}`;

    const prompt = `Generate a creative and engaging social media post for ${platform} about the following topic: "${topic}". 
    Make sure it follows the cultural nuances of the Hausa-speaking community.`;

    // --- Gemini API Call Structure ---
    // 1. Model Selection: Using 'gemini-3-flash-preview' for optimal balance of speed and quality.
    // 2. System Instruction: Sets the persona of a Hausa Social Media Manager with specific cultural guidelines.
    // 3. Contents: The user's prompt wrapped in the standard message format.
    // 4. Config: Parameters like temperature (creativity) and topP (diversity) to fine-tune the output.
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          topP: 0.95,
        },
      });

      return response.text || "Ba a iya samar da sakamako ba. (Could not generate result.)";
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      
      // Check for 404 Not Found error specifically
      const isNotFound = 
        error?.status === 'NOT_FOUND' || 
        error?.code === 404 || 
        error?.error?.status === 'NOT_FOUND' || 
        error?.error?.code === 404;

      if (isNotFound) {
        throw new Error("Ba a sami model din da aka nema ba. Don Allah a duba sunan model din ko a tuntubi documentation na Gemini API. (The requested model was not found. Please check the model name or consult the Gemini API documentation for available models.)");
      }
      
      throw new Error("An samu matsala wajen kiran Gemini API. (Error calling Gemini API.)");
    }
  }
}
