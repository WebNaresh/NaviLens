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
