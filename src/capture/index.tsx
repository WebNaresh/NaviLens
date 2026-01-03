import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getApiKey, getModel } from '../lib/storage';

interface CaptureData {
  imageUri: string;
  timestamp: number;
}

const ShareButton = ({ label, icon, onClick }: { label: string, icon: React.ReactNode, onClick: () => void }) => (
    <button 
        onClick={onClick}
        className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-300 transition-all text-sm font-medium shadow-sm group"
        title={`Share to ${label}`}
    >
        <span className="text-gray-500 group-hover:text-indigo-500">{icon}</span>
        <span>{label}</span>
    </button>
);

const CaptureResult = () => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleShare = (platform: string, messageType?: string) => {
      if (!imageUri) return;

      // 1. Copy Image & Text to Clipboard
      fetch(imageUri)
        .then(res => res.blob())
        .then(blob => {
            const promptText = "How can we enhance this component?";
            
            // Try to write both text and image
            try {
                // Note: Writing multiple types to clipboard is supported in modern browsers
                // We create a ClipboardItem with both types if possible, or just image and assume user will type text, or text and image.
                // Actually, standard ClipboardItem usage for both:
                const data = [new ClipboardItem({ 
                    [blob.type]: blob,
                    'text/plain': new Blob([promptText], { type: 'text/plain' })
                })];
                
                return navigator.clipboard.write(data);
            } catch (e) {
                console.warn('Advanced clipboard write failed, falling back to just image', e);
                const data = [new ClipboardItem({ [blob.type]: blob })];
                return navigator.clipboard.write(data);
            }
        })
        .then(() => {
            // 2. Show Toast
            let msg = `Copied! Paste into ${platform}`;
            if (platform === 'Gemini' || platform === 'ChatGPT') msg += ' (Ctrl+V)';
            setToast(msg);
            setTimeout(() => setToast(null), 3000);

            // 3. Open URL if needed
            if (messageType) {
                 setTimeout(() => {
                     chrome.runtime.sendMessage({ type: messageType });
                 }, 500); // Small delay to let user see the toast
            }
        })
        .catch(err => {
            console.error('Share failed', err);
            setError('Failed to copy to clipboard');
        });
  };

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
          
            {loading && <span className="text-indigo-600 font-medium text-sm animate-pulse mr-4">Analyzing...</span>}
            
            <div className="flex items-center gap-2">
                <ShareButton 
                    label="Gemini" 
                    icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41C17.92 5.77 20 8.65 20 12c0 2.08-.81 3.98-2.11 5.4l-.99-.01z"/></svg>} // Simple Globe icon replacement
                    onClick={() => handleShare('Gemini', 'OPEN_GEMINI_TAB')}
                />
                <ShareButton 
                    label="ChatGPT" 
                    icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>} // Chat bubble
                    onClick={() => handleShare('ChatGPT', 'OPEN_CHATGPT_TAB')}
                />
                <ShareButton 
                    label="VS Code" 
                    icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>} 
                    onClick={() => handleShare('VS Code')}
                />
                <ShareButton 
                    label="Antigravity" 
                    icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} 
                    onClick={() => handleShare('Antigravity')}
                />
            </div>
        </div>

        {/* Toast Notification */}
        {toast && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg z-50 flex items-center gap-3 animate-fade-in-up">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                <span className="font-medium">{toast}</span>
            </div>
        )}

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
