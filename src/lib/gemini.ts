
export interface GeminiResponse {
  text: string;
  error?: string;
}

export const analyzeImageWithGemini = async (
  apiKey: string,
  imageBase64: string,
  prompt: string = "Analyze this UI component. Suggest improvements for design, accessibility, and user experience. Be concise."
): Promise<GeminiResponse> => {
  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "image/png",
                    data: cleanBase64
                  }
                }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to communicate with Gemini API');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No suggestions generated');
    }

    return { text };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { 
      text: "", 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
};
