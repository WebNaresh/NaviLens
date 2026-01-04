import React, { useEffect, useState, useRef } from 'react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  // Drawing Tools
  const [isPenActive, setIsPenActive] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#ef4444'); 
  const [lineWidth, setLineWidth] = useState(3);
  
  // Crop State (Interactive)
  const [isCropActive, setIsCropActive] = useState(false);
  const [cropStart, setCropStart] = useState<{x: number, y: number} | null>(null);
  const [cropEnd, setCropEnd] = useState<{x: number, y: number} | null>(null);
  // Unused but kept for strict state tracking if needed
  // const [isDraggingCrop, setIsDraggingCrop] = useState(false); 
  const [dragMode, setDragMode] = useState<'create' | 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState<{x: number, y: number} | null>(null);
  
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

  // History Helper - Defined cleanly
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
  }, [historyStep, history]);

  // --- CROP HANDLERS ---
  const getCropRect = () => {
    if (!cropStart || !cropEnd) return null;
    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const w = Math.abs(cropEnd.x - cropStart.x);
    const h = Math.abs(cropEnd.y - cropStart.y);
    return { x, y, w, h };
  };

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
       
      const xDisplay = clientX - rect.left;
      const yDisplay = clientY - rect.top;

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return { x: xDisplay * scaleX, y: yDisplay * scaleY };
  };

  const startCrop = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isCropActive || !canvasRef.current) return;
      
      const pos = getPointerPos(e, canvasRef.current);
      const rect = getCropRect();
      
      // Check for handle interaction first
      if (rect) {
          const handleSize = 20 * (canvasRef.current.width / canvasRef.current.clientWidth);
          
          const near = (px: number, py: number, tx: number, ty: number) => 
               Math.abs(px - tx) < handleSize && Math.abs(py - ty) < handleSize;

          if (near(pos.x, pos.y, rect.x, rect.y)) { setDragMode('resize-tl'); return; }
          if (near(pos.x, pos.y, rect.x + rect.w, rect.y)) { setDragMode('resize-tr'); return; }
          if (near(pos.x, pos.y, rect.x, rect.y + rect.h)) { setDragMode('resize-bl'); return; }
          if (near(pos.x, pos.y, rect.x + rect.w, rect.y + rect.h)) { setDragMode('resize-br'); return; }
          
          if (pos.x > rect.x && pos.x < rect.x + rect.w && pos.y > rect.y && pos.y < rect.y + rect.h) {
              setDragMode('move');
              setDragStartOffset({ x: pos.x - rect.x, y: pos.y - rect.y });
              return;
          }
      }

      // Default: Create new crop
      // setIsDraggingCrop(true);
      setDragMode('create');
      setCropStart(pos);
      setCropEnd(pos);
  };

  const doCrop = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isCropActive || !dragMode || !canvasRef.current) return;
      const pos = getPointerPos(e, canvasRef.current);

      if (dragMode === 'create') {
          setCropEnd(pos);
      } else if (dragMode === 'move' && cropStart && cropEnd && dragStartOffset) {
          const rect = getCropRect();
          if(!rect) return;
          const w = rect.w;
          const h = rect.h;
          
          const newX = pos.x - dragStartOffset.x;
          const newY = pos.y - dragStartOffset.y;
          
          setCropStart({ x: newX, y: newY });
          setCropEnd({ x: newX + w, y: newY + h });
      } else if (cropStart && cropEnd) {
          // Resize Logic
          const currentRect = getCropRect()!;
          const { x, y, w, h } = currentRect;
          
          switch(dragMode) {
              case 'resize-tl': 
                  setCropStart({ x: pos.x, y: pos.y }); 
                  setCropEnd({ x: x + w, y: y + h }); 
                  break;
              case 'resize-tr':
                  setCropStart({ x: x, y: pos.y }); 
                  setCropEnd({ x: pos.x, y: y + h });
                  break;
              case 'resize-bl':
                  setCropStart({ x: pos.x, y: y });
                  setCropEnd({ x: x + w, y: pos.y });
                  break;
              case 'resize-br':
                  setCropStart({ x: x, y: y });
                  setCropEnd(pos);
                  break;
          }
      }
  };

  const endCrop = () => {
      // setIsDraggingCrop(false);
      setDragMode(null);
      // Normalize rect
      if (cropStart && cropEnd) {
          const rect = getCropRect();
          if (rect && rect.w > 5 && rect.h > 5) {
              setCropStart({ x: rect.x, y: rect.y });
              setCropEnd({ x: rect.x + rect.w, y: rect.y + rect.h });
          } else {
              setCropStart(null);
              setCropEnd(null);
          }
      }
  };

  // --- DRAW HANDLERS ---
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
      ctx.lineWidth = lineWidth * scaleX; 
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
         saveHistory(); 
      }
  };

  // Helper to merge Image + Canvas (with crop)
  const getMergedImageUri = (): Promise<string> => {
      return new Promise((resolve) => {
          if (!imageRef.current || !canvasRef.current) {
              resolve(imageUri || '');
              return;
          }

          const img = imageRef.current;
          const overlay = canvasRef.current;
          
          let cropX = 0, cropY = 0, cropW = img.naturalWidth, cropH = img.naturalHeight;
          
          if (cropStart && cropEnd) {
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

          ctx?.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          ctx?.drawImage(overlay, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

          resolve(canvas.toDataURL('image/jpeg', 0.8));
      });
  };

  const applyCrop = async () => {
      if (!cropStart || !cropEnd || !imageRef.current || !canvasRef.current) return;
      
      const rect = getCropRect();
      if (!rect || rect.w < 10 || rect.h < 10) return;
      
      setToast('Applying Crop...');
      const newUri = await getMergedImageUri(); 
      setImageUri(newUri);
      
      setCropStart(null); 
      setCropEnd(null);
      setHistory([]); 
      setIsCropActive(false); // OPTIONAL: Exit crop mode after apply
      setTimeout(() => setToast(null), 1000);
  };

  // --- RENDERING HELPERS ---
  const getDisplayCropStyle = () => {
      if (!cropStart || !cropEnd || !canvasRef.current) return {};
      const rect = getCropRect();
      if (!rect) return {};

      const canvas = canvasRef.current;
      const domRect = canvas.getBoundingClientRect();
      const scaleX = domRect.width / canvas.width;
      const scaleY = domRect.height / canvas.height;

      return {
          left: `${rect.x * scaleX}px`,
          top: `${rect.y * scaleY}px`,
          width: `${rect.w * scaleX}px`,
          height: `${rect.h * scaleY}px`
      };
  };

  const getHandleStyle = (pos: 'tl'|'tr'|'bl'|'br') => {
      const base = { position: 'absolute' as 'absolute', width: '12px', height: '12px', backgroundColor: '#3b82f6', border: '2px solid white', borderRadius: '50%', pointerEvents: 'auto' as 'auto', zIndex: 20 };
      switch(pos) {
          case 'tl': return { ...base, left: '-6px', top: '-6px', cursor: 'nwse-resize' };
          case 'tr': return { ...base, right: '-6px', top: '-6px', cursor: 'nesw-resize' };
          case 'bl': return { ...base, left: '-6px', bottom: '-6px', cursor: 'nesw-resize' };
          case 'br': return { ...base, right: '-6px', bottom: '-6px', cursor: 'nwse-resize' };
      }
      return base;
  };

  const renderCropOverlay = () => {
    if (!isCropActive || !cropStart || !cropEnd) return null;
    return (
        <div 
            className="absolute border-2 border-indigo-500 bg-indigo-500 bg-opacity-10"
            style={getDisplayCropStyle()}
        >
            <div style={getHandleStyle('tl')} />
            <div style={getHandleStyle('tr')} />
            <div style={getHandleStyle('bl')} />
            <div style={getHandleStyle('br')} />
            
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white text-xs px-2 py-1 rounded shadow flex gap-2 pointer-events-auto">
                 <span>{Math.round(Math.abs(cropEnd.x - cropStart.x))} × {Math.round(Math.abs(cropEnd.y - cropStart.y))}</span>
            </div>

            <div className="absolute -bottom-10 right-0 pointer-events-auto">
                 <button 
                    onClick={(e) => { e.stopPropagation(); applyCrop(); }}
                    className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded-full shadow hover:bg-green-700 transition"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    <span className="text-xs font-bold">Apply Crop</span>
                 </button>
            </div>
        </div>
    );
  };

  // --- Sharing & PDF Utils ---
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
          const finalUri = await getMergedImageUri();
          await performCopy(platform, finalUri);

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

  // --- PDF Rendering Logic (Data URI Support) ---
  useEffect(() => {
    const checkPDF = async () => {
        const result = await chrome.storage.local.get('navilens_target_pdf');
        const pdfData = result.navilens_target_pdf as { url?: string, dataUri?: string } | undefined;
        
        if (pdfData && (pdfData.dataUri || pdfData.url)) {
            setToast('Rendering PDF Document...');
            try {
                // Dynamic import to avoid build weighting if unused
                const pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.mjs');

                const source = pdfData.dataUri ? pdfData.dataUri : pdfData.url!;
                const loadingTask = pdfjsLib.getDocument(source);
                const pdf = await loadingTask.promise;
                
                const numPages = pdf.numPages;
                const canvasPages: HTMLCanvasElement[] = [];
                let totalHeight = 0;
                let maxWidth = 0;

                for (let i = 1; i <= numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 }); // 1.5x scale
                    
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    const renderContext = {
                        canvasContext: context!,
                        viewport: viewport
                    };
                    // @ts-ignore
                    await page.render(renderContext).promise;
                    
                    canvasPages.push(canvas);
                    totalHeight += canvas.height;
                    maxWidth = Math.max(maxWidth, canvas.width);
                }

                // Stitch
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = maxWidth;
                finalCanvas.height = totalHeight;
                const ctx = finalCanvas.getContext('2d');
                
                let yOffset = 0;
                for (const pCanvas of canvasPages) {
                    ctx?.drawImage(pCanvas, 0, yOffset);
                    yOffset += pCanvas.height;
                }

                const finalUri = finalCanvas.toDataURL('image/jpeg', 0.85);
                setImageUri(finalUri);
                setToast('PDF Capture Complete');
                await chrome.storage.local.remove('navilens_target_pdf');

            } catch (err) {
                console.error('PDF Rendering Failed:', err);
                setError('Failed to render PDF. It might be password protected or local file access is denied.');
            }
        }
    };
    checkPDF();

    // Load captured data
    chrome.storage.local.get('navilens_current_capture', async (result) => {
      const data = result['navilens_current_capture'] as CaptureData | undefined;
      // Only set if we didn't just render a PDF (race condition check priority)
      // Actually simpler: checkPDF handles its key. standard handles its key.
      if (data && data.imageUri) {
         const pdfRes = await chrome.storage.local.get('navilens_target_pdf');
         if (!pdfRes.navilens_target_pdf) {
             setImageUri(data.imageUri);
         }
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6">
      <div className="w-full max-w-[95%] bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap justify-between items-center sticky top-0 z-10 gap-4 shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-600 rounded-lg p-2">
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
                        setHistoryStep(-1);
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

        {/* Content */}
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
                      className={`absolute top-0 left-0 w-full h-full cursor-${isCropActive ? 'crosshair' : (isPenActive ? 'crosshair' : 'default')}`}
                  />
                  {/* Interactive Crop Overlay */}
                  {renderCropOverlay()}
                  </>
                ) : (
                    <div className="text-gray-400 p-12">No image</div>
                )}
           </div>
        </div>
        
        {/* Toast */}
        {toast && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg z-50 flex items-center gap-3 animate-fade-in-up">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                <span className="font-medium">{toast}</span>
            </div>
        )}
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CaptureResult />
  </React.StrictMode>
);
