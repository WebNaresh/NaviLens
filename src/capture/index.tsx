import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';


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
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleShare = async (platform: string, messageType?: string) => {
      if (!imageUri) {
          setError("No image to share");
          return;
      }

      setToast(`Copying for ${platform}...`);

      try {
          // 1. ALWAYS Copy Image First (Await it!)
          await performCopy(platform);

          // 2. Set "Pending Paste" flag for the content script to pick up
          if (platform === 'Gemini' || platform === 'ChatGPT') {
              await chrome.storage.local.set({ 
                  'navilens_pending_paste': {
                      platform: platform,
                      timestamp: Date.now()
                  }
              });
          }

          setToast(`Image Copied! Opening ${platform}...`);
          
          // 3. THEN Launch App/URL
          if (messageType === 'OPEN_VSCODE') {
               window.location.href = 'vscode://';
          } else if (messageType === 'OPEN_ANTIGRAVITY_TAB') {
               window.location.href = 'antigravity://';
          } else if (messageType) {
               // For Web Apps (Gemini/ChatGPT)
               chrome.runtime.sendMessage({ type: messageType });
          }
          
          // Clear toast after a delay
          setTimeout(() => setToast(null), 4000);

      } catch (err: any) {
          console.error('Share failed', err);
          setError(`Copy failed: ${err.message || err}`);
          setToast(null);
      }
  };

  const performCopy = async (platform: string) => {
      console.log(`[NaviLens] Starting Copy for platform: ${platform}`);
      if (!imageUri) {
          console.error('[NaviLens] No imageUri present');
          throw new Error("No image data");
      }
      
      try {
          // Use fetch to get buffer
          console.log('[NaviLens] Fetching image blob...');
          const res = await fetch(imageUri);
          const blob = await res.blob();
          console.log(`[NaviLens] Blob created. Size: ${blob.size}, Type: ${blob.type}`);
          
          let item: ClipboardItem;

          // Web Apps (ChatGPT) often prefer a named File (simulates upload)
          // Gemini works better with a standard Blob (raw image)
          if (platform === 'ChatGPT') {
              console.log('[NaviLens] Wrapping as named File (screenshot.png) for ChatGPT');
              const file = new File([blob], "screenshot.png", { type: 'image/png' });
              item = new ClipboardItem({ 'image/png': file });
          } else {
              // Gemini, VS Code, etc prefer standard Blob
              console.log('[NaviLens] Using standard Blob (Gemini/Native)');
              const cleanBlob = new Blob([blob], { type: 'image/png' });
              item = new ClipboardItem({ 'image/png': cleanBlob });
          }
          
          console.log('[NaviLens] Writing to navigator.clipboard...');
          await navigator.clipboard.write([item]);
          console.log('[NaviLens] Clipboard Write Success!');
      
      } catch (err) {
          console.error('[NaviLens] performCopy Error:', err);
          throw err;
      }
  };

  useEffect(() => {
    // Load captured data
    chrome.storage.local.get('navilens_current_capture', async (result) => {
      const data = result['navilens_current_capture'] as CaptureData | undefined;
      if (data && data.imageUri) {
        setImageUri(data.imageUri);
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 rounded-lg p-2">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">NaviLens Capture</h1>
          </div>
          
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
                    onClick={() => handleShare('VS Code', 'OPEN_VSCODE')}
                />
                <ShareButton 
                    label="Antigravity" 
                    icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} 
                    onClick={() => handleShare('Antigravity', 'OPEN_ANTIGRAVITY_TAB')}
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


        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 min-h-[500px]">
           {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <span className="block sm:inline">{error}</span>
              </div>
           )}
           {imageUri ? (
              <img src={imageUri} alt="Captured Screenshot" className="max-w-full h-auto shadow-sm border border-gray-200 rounded-lg" />
            ) : (
                <div className="text-gray-400">No image</div>
            )}
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
