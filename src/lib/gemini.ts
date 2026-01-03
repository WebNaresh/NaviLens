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
    return { text };
  } catch (error: any) {
    console.error("Gemini SDK Error:", error);
    let errorMessage = error.message || "Unknown error occurred";
    
    // Detailed error diagnostics
    if (errorMessage.includes("404")) {
      errorMessage = `Model '${modelName}' not found (404). \n\nPossible causes:\n1. This model version might be deprecated.\n2. Your API Key might not have access to this model.\n3. The model might not be available in your region.`;
    } else if (errorMessage.includes("403")) {
      errorMessage = "Access Forbidden (403). Your API Key is valid but lacks permission for this action (or quota exceeded).";
    } else if (errorMessage.includes("400") && errorMessage.includes("API key")) {
      errorMessage = "Invalid API Key (400). Please check your key.";
    } else if (errorMessage.includes("400")) {
      errorMessage = "Bad Request (400). The image validation failed or prompt is invalid.";
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
