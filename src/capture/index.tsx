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

  /* Drawing State */
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPenActive, setIsPenActive] = useState(false);
  const [penColor, setPenColor] = useState('#ef4444'); // Red default

  // Sync canvas size to image
  useEffect(() => {
      if (imageUri && imageRef.current && canvasRef.current) {
          const img = imageRef.current;
          const canvas = canvasRef.current;
          
          img.onload = () => {
              canvas.width = img.width;
              canvas.height = img.height;
              // Clear on new image load
              const ctx = canvas.getContext('2d');
              ctx?.clearRect(0, 0, canvas.width, canvas.height);
          };
      }
  }, [imageUri]);

  // Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isPenActive || !canvasRef.current) return;
      setIsDrawing(true);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      // Handle Mouse vs Touch
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

      // Scale coordinates to internal canvas resolution
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      ctx.beginPath();
      ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
      ctx.strokeStyle = penColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !isPenActive || !canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
      ctx.stroke();
  };

  const stopDrawing = () => {
      if (isDrawing) {
         setIsDrawing(false);
         const ctx = canvasRef.current?.getContext('2d');
         ctx?.closePath();
      }
  };

  // Helper to merge Image + Canvas
  const getMergedImageUri = (): Promise<string> => {
      return new Promise((resolve) => {
          if (!imageRef.current || !canvasRef.current) {
              resolve(imageUri || '');
              return;
          }

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = imageRef.current;
          const overlay = canvasRef.current;

          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          // Draw base image
          ctx?.drawImage(img, 0, 0);
          // Draw annotations
          ctx?.drawImage(overlay, 0, 0);

          resolve(canvas.toDataURL('image/png'));
      });
  };

  const handleShare = async (platform: string, messageType?: string) => {
      if (!imageUri) {
          setError("No image to share");
          return;
      }

      setToast(`Preparing for ${platform}...`);

      try {
          // MERGE ANNOTATIONS before sharing
          const finalUri = await getMergedImageUri();

          // 1. ALWAYS Copy Image First (use merged URI)
          // Refactored functionality to accept URI arg (see below)
          await performCopy(platform, finalUri);

          // 2. Set "Pending Paste" flag WITH DATA
          if (platform === 'Gemini' || platform === 'ChatGPT') {
              await chrome.storage.local.set({ 
                  'navilens_pending_paste': {
                      platform: platform,
                      timestamp: Date.now(),
                      imageUri: finalUri // Pass MERGED data
                  }
              });
          }

          setToast(`Image Copied! Opening ${platform}...`);
          
          // 3. Launch App
          if (messageType === 'OPEN_VSCODE') {
               window.location.href = 'vscode://';
          } else if (messageType === 'OPEN_ANTIGRAVITY_TAB') {
               window.location.href = 'antigravity://';
          } else if (messageType) {
               chrome.runtime.sendMessage({ type: messageType });
          }
          
          setTimeout(() => setToast(null), 4000);

      } catch (err: any) {
          console.error('Share failed', err);
          setError(`Copy failed: ${err.message || err}`);
          setToast(null);
      }
  };

  const performCopy = async (platform: string, targetUri: string = imageUri!) => {
      console.log(`[NaviLens] Starting Copy for platform: ${platform}`);
      
      try {
          const res = await fetch(targetUri);
          const blob = await res.blob();
          
          let item: ClipboardItem;

          if (platform === 'ChatGPT') {
              const file = new File([blob], "screenshot.png", { type: 'image/png' });
              item = new ClipboardItem({ 'image/png': file });
          } else {
              const cleanBlob = new Blob([blob], { type: 'image/png' });
              item = new ClipboardItem({ 'image/png': cleanBlob });
          }
          
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
        
        {/* Header with Drawing Toolbar */}
        <div className="bg-white border-b border-gray-200 px-8 py-6 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 rounded-lg p-2">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">NaviLens Capture</h1>
          </div>
          
            {/* Drawing Controls */}
            <div className="flex items-center gap-2 px-4 border-l border-r border-gray-200 mx-4">
                <button
                    onClick={() => setIsPenActive(!isPenActive)}
                    className={`p-2 rounded-lg transition-colors ${isPenActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    title="Toggle Pen"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                
                {isPenActive && (
                    <div className="flex items-center gap-1 animate-fade-in">
                        {['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#000000'].map(c => (
                            <button
                                key={c}
                                onClick={() => setPenColor(c)}
                                className={`w-6 h-6 rounded-full border-2 ${penColor === c ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                )}
                 <button
                    onClick={() => {
                        const ctx = canvasRef.current?.getContext('2d');
                        if(canvasRef.current) ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    }}
                    className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-lg"
                    title="Clear Annotations"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>

            <div className="flex items-center gap-2">
                 {/* Share buttons ... (kept same but passed through) */}
                <ShareButton 
                    label="Gemini" 
                    icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41C17.92 5.77 20 8.65 20 12c0 2.08-.81 3.98-2.11 5.4l-.99-.01z"/></svg>}
                    onClick={() => handleShare('Gemini', 'OPEN_GEMINI_TAB')}
                />
                <ShareButton 
                    label="ChatGPT" 
                    icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>}
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
           <div className="relative shadow-sm border border-gray-200 rounded-lg overflow-hidden group">
               {imageUri ? (
                  <>
                  <img 
                      ref={imageRef}
                      src={imageUri} 
                      alt="Captured Screenshot" 
                      className="max-w-full h-auto block select-none" 
                  />
                  <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className={`absolute top-0 left-0 w-full h-full cursor-${isPenActive ? 'crosshair' : 'default'}`}
                  />
                  </>
                ) : (
                    <div className="text-gray-400 p-12">No image</div>
                )}
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
