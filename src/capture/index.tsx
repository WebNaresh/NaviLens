import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getApiKey, getModel } from '../lib/storage';

interface CaptureData {
  imageUri: string;
  timestamp: number;
}

const CaptureResult = () => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load captured data
    chrome.storage.local.get('navilens_current_capture', async (result) => {
      const data = result['navilens_current_capture'] as CaptureData | undefined;
      if (data && data.imageUri) {
        setImageUri(data.imageUri);
        analyzeImage(data.imageUri);
      } else {
        setError('No capture found. Please try again.');
        setLoading(false);
      }
    });
  }, []);

  const analyzeImage = async (base64Image: string) => {
    try {
      const apiKey = await getApiKey();
      const modelName = await getModel();

      if (!apiKey) {
        setError('API Key not found. Please set it in the extension popup.');
        setLoading(false);
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const cleanModelName = modelName.replace(/^models\//, '');
      const model = genAI.getGenerativeModel({ model: cleanModelName });

      const prompt = `
        Analyze this UI screenshot. 
        1. Identify the key elements and functionality.
        2. Suggest 3 specific design improvements or UX enhancements.
        3. Rate the visual aesthetics from 1-10.
        Format as clear Markdown.
      `;

      const imagePart = {
        inlineData: {
          data: base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, ''),
          mimeType: "image/png",
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      setAnalysis(response.text());
    } catch (err: any) {
      console.error('Analysis Error:', err);
      let errorMessage = err.message || "Unknown error";
      if (errorMessage.includes("404")) errorMessage = "Model not found (404). Check API key or Model selection.";
      if (errorMessage.includes("403")) errorMessage = "Access Forbidden (403). Check API key permissions.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 rounded-lg p-2">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">NaviLens Analysis</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {loading && <span className="text-indigo-600 font-medium text-sm animate-pulse mr-2">Analyzing...</span>}
            
            <button 
              onClick={() => {
                if (!imageUri) return;
                
                // Set pending paste flag for Gemini content script
                chrome.storage.local.set({
                    'pending_gemini_paste': {
                        imageUri: imageUri,
                        text: "How can we enhance this component?",
                        timestamp: Date.now()
                    }
                }, () => {
                     // Open Gemini
                     chrome.runtime.sendMessage({ type: 'OPEN_GEMINI_TAB' });
                });
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all font-medium shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              <span>Open with Gemini</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-200">
          
          {/* Image Column */}
          <div className="flex-1 p-8 bg-gray-50 flex justify-center items-start min-h-[500px]">
            {imageUri ? (
              <img src={imageUri} alt="Captured Screenshot" className="max-w-full h-auto shadow-sm border border-gray-200 rounded-lg" />
            ) : (
                <div className="text-gray-400">No image</div>
            )}
          </div>

          {/* Analysis Column */}
          <div className="w-full md:w-[450px] p-8 bg-white overflow-y-auto max-h-[80vh]">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}
            
            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-32 bg-gray-100 rounded mt-6"></div>
              </div>
            ) : analysis ? (
              <div className="prose prose-indigo prose-sm text-gray-600">
                {/* Simple Markdown Rendering */}
                {analysis.split('\n').map((line, i) => {
                    if (line.startsWith('###')) return <h3 key={i} className="text-lg font-semibold text-gray-900 mt-4 mb-2">{line.replace('###', '')}</h3>;
                    if (line.startsWith('**')) return <p key={i} className="font-bold text-gray-800 mb-2">{line.replace(/\*\*/g, '')}</p>;
                    if (line.startsWith('-')) return <li key={i} className="ml-4 mb-1">{line.replace('-', '')}</li>;
                    return <p key={i} className="mb-2">{line}</p>;
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CaptureResult />
  </React.StrictMode>
);
