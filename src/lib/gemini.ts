import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GeminiResponse {
  text: string;
  error?: string;
}

export const analyzeImageWithGemini = async (
  apiKey: string,
  modelName: string,
  imageBase64: string,
  prompt: string = "Analyze this UI component. Suggest improvements for design, accessibility, and user experience. Be concise."
): Promise<GeminiResponse> => {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Remove header if present to get pure base64
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/png",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    return { text };
  } catch (error: any) {
    console.error("Gemini SDK Error:", error);
    let errorMessage = error.message || "Unknown error occurred";
    
    // Improve error message if possible
    if (errorMessage.includes("404")) {
      errorMessage = `Model '${modelName}' not found or not available for your API key.`;
    } else if (errorMessage.includes("400")) {
      errorMessage = "Bad Request. Please check your image or prompt.";
    }

    return { 
      text: "", 
      error: errorMessage 
    };
  }
};

export interface GeminiModel {
  name: string; // e.g., "models/gemini-1.5-pro"
  displayName: string;
  supportedGenerationMethods: string[];
}

export const fetchGeminiModels = async (apiKey: string): Promise<GeminiModel[]> => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Filter for models that support content generation and remove raw 'models/' prefix for simpler ID usage if needed
    // But the API expects 'models/...' or just the id. Let's keep the name as the ID.
    // The previous code used just "gemini-1.5-flash", but the SDK might accept either.
    // The REST API returns "models/gemini-1.5-flash". 
    // We will clean it up for the dropdown ID to match what the SDK expects (which is flexible)
    
    return (data.models || []).filter((m: GeminiModel) => 
      m.supportedGenerationMethods.includes("generateContent") &&
      m.name.includes("gemini") // Filter for Gemini models generally
    );
  } catch (error) {
    console.error("Failed to list models:", error);
    return [];
  }
};
