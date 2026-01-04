import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { jsPDF } from 'jspdf';
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
  const [penColor, setPenColor] = useState('#ef4444'); 
  const [lineWidth, setLineWidth] = useState(3); // Default to a medium stroke
  
  // Crop State
  const [isCropActive, setIsCropActive] = useState(false);
  const [cropStart, setCropStart] = useState<{x: number, y: number} | null>(null);
  const [cropEnd, setCropEnd] = useState<{x: number, y: number} | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  
  // Undo History
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Sync canvas size to image
  useEffect(() => {
      if (imageUri && imageRef.current && canvasRef.current) {
          const img = imageRef.current;
          const canvas = canvasRef.current;
          
          const syncSize = () => {
              // Use NATURAL dimensions for full resolution
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              
              const ctx = canvas.getContext('2d');
              ctx?.clearRect(0, 0, canvas.width, canvas.height);
              
              // Reset history
              setHistory([]);
              setHistoryStep(-1);
              saveHistory(); 
          };

          if (img.complete) {
              syncSize();
          } else {
              img.onload = syncSize;
          }
      }
  }, [imageUri]);

  // History Helper
  const saveHistory = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      const newHistory = history.slice(0, historyStep + 1);
      newHistory.push(data);
      
      setHistory(newHistory);
      setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
      if (historyStep > 0) {
          const step = historyStep - 1;
          const data = history[step];
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx && data) {
              ctx.putImageData(data, 0, 0);
              setHistoryStep(step);
          }
      } else if (historyStep === 0) {
           // Clear to initial
           const ctx = canvasRef.current?.getContext('2d');
           if (ctx && canvasRef.current) {
               ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
               setHistoryStep(-1); // Go back to "nothing"
           }
      }
  };

  // Keyboard Shortcuts
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
              e.preventDefault();
              undo();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyStep, history]); // Re-bind on history change

  // Crop Handlers
  const startCrop = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isCropActive || !canvasRef.current) return;
      setIsCropping(true);
      
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
       
      // Calculate position relative to the Canvas's display size
      const xDisplay = clientX - rect.left;
      const yDisplay = clientY - rect.top;

      // Scale to Canvas's internal resolution (Natural Width)
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = xDisplay * scaleX;
      const y = yDisplay * scaleY;
      
      setCropStart({x, y});
      setCropEnd({x, y});
  };

  const doCrop = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isCropping || !cropStart) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      
      const xDisplay = clientX - rect.left;
      const yDisplay = clientY - rect.top;

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const x = xDisplay * scaleX;
      const y = yDisplay * scaleY;
      
      setCropEnd({x, y});
  };

  const endCrop = () => {
      if (isCropping) {
          setIsCropping(false);
      }
  };

  // Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isPenActive || !canvasRef.current) return;
      setIsDrawing(true);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      ctx.beginPath();
      ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
      ctx.strokeStyle = penColor;
      ctx.lineWidth = lineWidth * scaleX; // Scale line width to match resolution
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
         saveHistory(); // Save state after stroke
      }
  };

  // Helper to merge Image + Canvas (with crop) and Return JPEG
  const getMergedImageUri = (): Promise<string> => {
      return new Promise((resolve) => {
          if (!imageRef.current || !canvasRef.current) {
              resolve(imageUri || '');
              return;
          }

          const img = imageRef.current;
          const overlay = canvasRef.current;
          
          // Determine crop area - coordinates are already in Natural Scale
          let cropX = 0, cropY = 0, cropW = img.naturalWidth, cropH = img.naturalHeight;
          
          if (cropStart && cropEnd) {
             // If cropping was active, use the coordinates
              const x1 = Math.min(cropStart.x, cropEnd.x);
              const y1 = Math.min(cropStart.y, cropEnd.y);
              const x2 = Math.max(cropStart.x, cropEnd.x);
              const y2 = Math.max(cropStart.y, cropEnd.y);
              
              cropX = x1;
              cropY = y1;
              cropW = x2 - x1;
              cropH = y2 - y1;
          }

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          canvas.width = cropW;
          canvas.height = cropH;

          // Draw cropped base image
          ctx?.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          // Draw cropped annotations
          ctx?.drawImage(overlay, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

          // Return JPEG (0.8 quality) to keep size small for Storage
          resolve(canvas.toDataURL('image/jpeg', 0.8));
      });
  };

  // Helper: Convert Blob to PNG Blob (for Clipboard compatibility)
  const convertBlobToPng = (blob: Blob): Promise<Blob> => {
      return new Promise((resolve, reject) => {
          const img = new Image();
          const url = URL.createObjectURL(blob);
          img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0);
              canvas.toBlob((pngBlob) => {
                  if (pngBlob) resolve(pngBlob);
                  else reject(new Error('PNG conversion failed'));
                  URL.revokeObjectURL(url);
              }, 'image/png');
          };
          img.onerror = () => {
             reject(new Error('Image load failed'));
             URL.revokeObjectURL(url);
          };
          img.src = url;
      });
  };

  const performCopy = async (platform: string, targetUri: string = imageUri!) => {
      console.log(`[NaviLens] Starting Copy for platform: ${platform}`);
      
      try {
          const res = await fetch(targetUri);
          const blob = await res.blob();
          
          let item: ClipboardItem;

          // Always ensure PNG for Clipboard Compatibility
          // Some browsers/platforms reject image/jpeg in ClipboardItem
          const pngBlob = await convertBlobToPng(blob);
          const file = new File([pngBlob], "screenshot.png", { type: 'image/png' });
          item = new ClipboardItem({ 'image/png': file });
          
          await navigator.clipboard.write([item]);
          console.log('[NaviLens] Clipboard Write Success!');
      
      } catch (err) {
          console.error('[NaviLens] performCopy Error:', err);
          throw err;
      }
  };

  const handleDownloadPDF = async () => {
       if (!imageUri) return;
       setToast('Generating PDF...');
       
       try {
           const finalUri = await getMergedImageUri();
           const img = new Image();
           img.src = finalUri;
           
           img.onload = () => {
               const pdf = new jsPDF({
                   orientation: img.width > img.height ? 'l' : 'p',
                   unit: 'px',
                   format: [img.width, img.height]
               });
               
               pdf.addImage(finalUri, 'JPEG', 0, 0, img.width, img.height);
               pdf.save('capture.pdf');
               setToast('PDF Downloaded!');
               setTimeout(() => setToast(null), 2000);
           };
           
       } catch (err) {
           console.error('PDF generation failed', err);
           setError('Failed to generate PDF');
       }
  };

  const handleShare = async (platform: string, messageType?: string) => {
      if (!imageUri) {
          setError("No image to share");
          return;
      }

      setToast(`Preparing for ${platform}...`);

      try {
          // MERGE ANNOTATIONS before sharing
          // This returns a JPEG (Small Size)
          const finalUri = await getMergedImageUri();

          // 1. Copy to Clipboard (converts JPEG -> PNG for compatibility)
          await performCopy(platform, finalUri);

          // 2. Set "Pending Paste" flag WITH DATA (Uses JPEG URI for storage efficiency)
          if (platform === 'Gemini' || platform === 'ChatGPT') {
              await chrome.storage.local.set({ 
                  'navilens_pending_paste': {
                      platform: platform,
                      timestamp: Date.now(),
                      imageUri: finalUri 
                  }
              });
          }

          setToast(`Image Copied! Opening ${platform}...`);
          
          // 3. Launch App via Background Script
          if (messageType) {
               chrome.runtime.sendMessage({ type: messageType });
          }
          
          setTimeout(() => setToast(null), 4000);

      } catch (err: any) {
          console.error('Share failed', err);
          setError(`Copy failed: ${err.message || err}`);
          setToast(null);
      }
  };

  const handleCopyOnly = async () => {
       if (!imageUri) return;
       setToast('Copying to clipboard...');
       try {
           const finalUri = await getMergedImageUri();
           await performCopy('Generic', finalUri);
           setToast('Copied to Clipboard!');
           setTimeout(() => setToast(null), 2000);
       } catch (err) {
           setError('Failed to copy');
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

  // Update Crop Visuals to match the scaled canvas
  // We need to render the crop overlay relative to the DISPLAY size of the container, NOT the internal canvas resolution.
  // But wait, cropStart/End are now in Natural Coordinates.
  // We need to project them back to Display Coordinates for the <div> overlay.
  const getDisplayCropStyle = () => {
      if (!cropStart || !cropEnd || !canvasRef.current) return {};
      
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width / canvas.width;
      const scaleY = rect.height / canvas.height;

      const x1 = Math.min(cropStart.x, cropEnd.x) * scaleX;
      const y1 = Math.min(cropStart.y, cropEnd.y) * scaleY;
      const w = Math.abs(cropEnd.x - cropStart.x) * scaleX;
      const h = Math.abs(cropEnd.y - cropStart.y) * scaleY;

      return {
          left: `${x1}px`,
          top: `${y1}px`,
          width: `${w}px`,
          height: `${h}px`
      };
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6">
      <div className="w-full max-w-[95%] bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 flex flex-col h-[90vh]">
        
        {/* Header with Drawing Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap justify-between items-center sticky top-0 z-10 gap-4 shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-600 rounded-lg p-2">
                 {/* Logo Icon */}
                 <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
             </div>
             <h1 className="text-xl font-bold text-gray-900 hidden sm:block">NaviLens</h1>
          </div>
          
          {/* Drawing Controls */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-2 border border-gray-200 shadow-sm">
                <button
                    onClick={() => {
                        setIsPenActive(!isPenActive);
                        setIsCropActive(false);
                    }}
                    className={`p-2 rounded-md transition-colors ${isPenActive ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500' : 'text-gray-500 hover:bg-gray-200'}`}
                    title="Toggle Pen"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                
                <button
                    onClick={() => {
                        setIsCropActive(!isCropActive);
                        setIsPenActive(false);
                        if (!isCropActive) {
                            setCropStart(null);
                            setCropEnd(null);
                        }
                    }}
                    className={`p-2 rounded-md transition-colors ${isCropActive ? 'bg-green-100 text-green-700 ring-2 ring-green-500' : 'text-gray-500 hover:bg-gray-200'}`}
                    title="Crop Image"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>
                </button>
                
                {isPenActive && (
                    <>
                    <div className="h-6 w-px bg-gray-300 mx-1"></div>
                    
                    {/* Color Picker */}
                    <div className="flex items-center gap-1">
                        {['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#000000'].map(c => (
                            <button
                                key={c}
                                onClick={() => setPenColor(c)}
                                className={`w-5 h-5 rounded-full border border-gray-200 ${penColor === c ? 'ring-2 ring-offset-1 ring-gray-800 scale-110' : 'hover:scale-110'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>

                    <div className="h-6 w-px bg-gray-300 mx-1"></div>

                    {/* Width Slider */}
                    <div className="flex items-center gap-2 group relative">
                        <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/></svg>
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={lineWidth}
                            onChange={(e) => setLineWidth(parseInt(e.target.value))}
                            className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            title={`Stroke Width: ${lineWidth}px`}
                        />
                        <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
                    </div>
                    </>
                )}

                <div className="h-6 w-px bg-gray-300 mx-1"></div>

                {/* Draw Actions */}
                <button
                    onClick={undo}
                    disabled={historyStep < 0}
                    className={`p-2 rounded-md ${historyStep >= 0 ? 'text-gray-700 hover:bg-gray-200' : 'text-gray-300 cursor-not-allowed'}`}
                    title="Undo (Ctrl+Z)"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                </button>

                 <button
                    onClick={() => {
                        const ctx = canvasRef.current?.getContext('2d');
                        if(canvasRef.current) ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                        setHistoryStep(-1); // Reset
                    }}
                    className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-md"
                    title="Clear All"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
          </div>

          <div className="flex items-center gap-2">
                 <button
                    onClick={handleCopyOnly}
                    className="flex items-center gap-2 bg-gray-800 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition shadow-sm"
                    title="Copy to Clipboard"
                 >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                     <span>Copy</span>
                 </button>

                 <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition shadow-sm"
                    title="Download as PDF"
                 >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                     <span>PDF</span>
                 </button>

                 <div className="h-8 w-px bg-gray-300 mx-1"></div>

                 {/* Share buttons */}
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
            </div>
        </div>

        {/* Toast Notification */}
        {toast && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg z-50 flex items-center gap-3 animate-fade-in-up">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                <span className="font-medium">{toast}</span>
            </div>
        )}


        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
           {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <span className="block sm:inline">{error}</span>
              </div>
           )}
           <div className="relative shadow-lg border border-gray-300 bg-white inline-block max-w-full max-h-full">
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
                      onMouseDown={isCropActive ? startCrop : startDrawing}
                      onMouseMove={isCropActive ? doCrop : draw}
                      onMouseUp={isCropActive ? endCrop : stopDrawing}
                      onMouseLeave={isCropActive ? endCrop : stopDrawing}
                      onTouchStart={isCropActive ? startCrop : startDrawing}
                      onTouchMove={isCropActive ? doCrop : draw}
                      onTouchEnd={isCropActive ? endCrop : stopDrawing}
                      className={`absolute top-0 left-0 w-full h-full cursor-${isPenActive ? 'crosshair' : 'default'}`}
                  />
                  {/* Crop Overlay */}
                  {isCropActive && cropStart && cropEnd && (
                      <div 
                          className="absolute border-2 border-green-500 border-dashed bg-green-500 bg-opacity-10 pointer-events-none"
                          style={getDisplayCropStyle()}
                      >
                          <div className="absolute -top-6 left-0 bg-green-600 text-white text-xs px-2 py-1 rounded">
                              {(Math.round(Math.abs(cropEnd.x - cropStart.x)))} × {Math.round(Math.abs(cropEnd.y - cropStart.y))}
                          </div>
                      </div>
                  )}
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
