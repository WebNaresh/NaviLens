import html2canvas from 'html2canvas';

interface SelectionState {
  active: boolean;
  hoveredElement: HTMLElement | null;
}

const state: SelectionState = {
  active: false,
  hoveredElement: null,
};

// --- Styles for the highlighter ---
// --- Styles for the highlighter ---
let overlay: HTMLElement | null = null;

const createOverlay = () => {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.pointerEvents = 'none';
  overlay.style.border = '2px solid #4f46e5'; // Indigo-600
  overlay.style.backgroundColor = 'rgba(79, 70, 229, 0.1)';
  overlay.style.borderRadius = '4px';
  overlay.style.zIndex = '2147483646'; // High but below panel
  overlay.style.display = 'none';
  overlay.style.transition = 'all 0.1s ease';
  document.body.appendChild(overlay);
  return overlay;
};

// --- UI Helpers ---

const createFloatingPanel = () => {
  let panel = document.getElementById('navilens-panel');
  if (panel) return panel;

  panel = document.createElement('div');
  panel.id = 'navilens-panel';
  panel.style.position = 'fixed';
  panel.style.top = '20px';
  panel.style.right = '20px';
  panel.style.width = '350px';
  panel.style.maxHeight = '90vh';
  panel.style.backgroundColor = '#ffffff';
  panel.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
  panel.style.borderRadius = '12px';
  panel.style.zIndex = '2147483647'; // Max z-index
  panel.style.fontFamily = 'Inter, system-ui, sans-serif';
  panel.style.display = 'none';
  panel.style.overflow = 'hidden';
  panel.style.border = '1px solid #e2e8f0';
  
  // Header
  const header = document.createElement('div');
  header.style.padding = '16px';
  header.style.borderBottom = '1px solid #e2e8f0';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.innerHTML = `
    <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1e293b;">NaviLens Suggestions</h3>
    <button id="navilens-close" style="background: none; border: none; cursor: pointer; color: #64748b; font-size: 20px;">×</button>
  `;
  panel.appendChild(header);

  // Content Area
  const content = document.createElement('div');
  content.id = 'navilens-content';
  content.style.padding = '16px';
  content.style.overflowY = 'auto';
  content.style.maxHeight = 'calc(90vh - 60px)';
  content.style.fontSize = '14px';
  content.style.lineHeight = '1.5';
  content.style.color = '#334155';
  panel.appendChild(content);

  document.body.appendChild(panel);

  document.getElementById('navilens-close')?.addEventListener('click', () => {
    panel!.style.display = 'none';
  });

  return panel;
};

const showLoading = (message: string = "Analyzing UI component...") => {
  const panel = createFloatingPanel();
  const content = document.getElementById('navilens-content');
  if (content) {
    content.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
        <div style="border: 3px solid #f3f3f3; border-top: 3px solid #4f46e5; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite;"></div>
        <p style="margin-top: 12px; color: #64748b; text-align: center;">${message}</p>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
      </div>
    `;
  }
  panel.style.display = 'block';
};


const showError = (error: string, imageUri?: string) => {
  const panel = createFloatingPanel();
  const content = document.getElementById('navilens-content');
  if (content) {
    let html = `<p style="color: #ef4444; text-align: center; font-weight: 500;">AI Analysis Failed</p>`;
    html += `<p style="color: #64748b; font-size: 13px; margin-top: 8px; text-align: center;">${error}</p>`;
    
    if (imageUri) {
        html += `
            <div id="navilens-error-preview" style="margin-top: 16px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; max-height: 200px; cursor: pointer; transition: transform 0.1s;">
                <p style="background: #f1f5f9; padding: 4px 8px; font-size: 11px; color: #64748b; text-align: center; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <span>Captured Screenshot</span>
                    <span style="color: #4f46e5; font-weight: 500;">Click to open ↗</span>
                </p>
                <img src="${imageUri}" style="width: 100%; height: auto; display: block;" />
            </div>
        `;
    }
    content.innerHTML = html;

    // Add click listener
    const preview = document.getElementById('navilens-error-preview');
    if (preview) {
        preview.addEventListener('click', async () => {
             // Save to storage first just in case (though it should be there)
             if (imageUri) {
                 await chrome.storage.local.set({ 
                    'navilens_current_capture': {
                        imageUri: imageUri,
                        timestamp: Date.now()
                    }
                });
             }
             await chrome.runtime.sendMessage({ type: 'OPEN_RESULT_TAB' });
        });
    }
  }
  panel.style.display = 'block';
};

// --- Capture & Analysis ---


const captureElement = async (element: HTMLElement) => {
  try {
    // 1. UI Feedback
    showLoading("Capturing component...<br><span style='font-size: 12px; color: #94a3b8;'>Rendering element</span>");
    
    // Hide overlay for clean capture
    const overlay = createOverlay();
    overlay.style.display = 'none';
    
    // Give UI a moment to update
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 50)));

    const canvas = await html2canvas(element, {
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: null, // Transparent background if possible
      scale: window.devicePixelRatio // Better quality
    });
    
    const imageUri = canvas.toDataURL('image/png');
    
    // 2. Save to storage
    await chrome.storage.local.set({ 
        'navilens_current_capture': {
            imageUri: imageUri,
            timestamp: Date.now()
        }
    });

    showLoading("Done! Opening result...<br><span style='font-size: 12px; color: #94a3b8;'>Redirecting to analysis page</span>");

    // 3. Open Result Tab
    await chrome.runtime.sendMessage({ type: 'OPEN_RESULT_TAB' });
    
    // Close panel
    setTimeout(() => {
        const panel = document.getElementById('navilens-panel');
        if (panel) panel.style.display = 'none';
    }, 1000);
    
  } catch (error) {
    console.error('Capture failed:', error);
    showError('Failed to capture component.');
  }
};

// --- Event Handlers ---

const handleMouseMove = (e: MouseEvent) => {
  if (!state.active) return;
  
  const target = e.target as HTMLElement;
  if (target === document.body || target === document.documentElement || target === overlay) return;
  
  state.hoveredElement = target;
  
  const rect = target.getBoundingClientRect();
  const ov = createOverlay();
  ov.style.top = `${rect.top}px`;
  ov.style.left = `${rect.left}px`;
  ov.style.width = `${rect.width}px`;
  ov.style.height = `${rect.height}px`;
  ov.style.display = 'block';
};

const handleClick = async (e: MouseEvent) => {
  if (!state.active || !state.hoveredElement) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const target = state.hoveredElement;
  toggleSelection(false); 
  
  await captureElement(target);
};

const toggleSelection = (active: boolean) => {
  state.active = active;
  if (active) {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);
    document.body.style.cursor = 'crosshair';
  } else {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleClick, true);
    document.body.style.cursor = 'default';
    if (overlay) overlay.style.display = 'none';
    state.hoveredElement = null;
  }
};

// --- Scroll Capture Helper ---

const performScrollCapture = async (mode: 'internal' | 'clipboard') => {
    try {
        const tempCanvas = document.createElement('canvas');
        const context = tempCanvas.getContext('2d');
        
        // Helper to find the main scrollable element
        const getScroller = () => {
            // 1. Check if window itself scrolls deeply
            const docHeight = Math.max(
                document.documentElement.scrollHeight, 
                document.body.scrollHeight
            );
            
            // Heuristic: If doc is significantly larger than viewport, assume window scroll
            if (docHeight > window.innerHeight + 50 && 
                window.getComputedStyle(document.body).overflowY !== 'hidden' &&
                window.getComputedStyle(document.documentElement).overflowY !== 'hidden') {
                return { element: null, height: docHeight, viewHeight: window.innerHeight };
            }

            // 2. Find largest scrollable element
            let maxArea = 0;
            let bestEl: HTMLElement | null = null;
            
            const allElements = document.querySelectorAll('*');
            for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i] as HTMLElement;
                // Optimization: skip hidden or small elements
                if (el.scrollHeight <= el.clientHeight) continue;
                
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) continue;

                const style = window.getComputedStyle(el);
                if (['auto', 'scroll'].includes(style.overflowY)) {
                     const area = rect.width * rect.height;
                     if (area > maxArea && area > 50000) { // arbitrary min size
                         maxArea = area;
                         bestEl = el;
                     }
                }
            }

            if (bestEl) {
                console.log('[Content] Found active inner scroller:', bestEl);
                return { element: bestEl, height: bestEl.scrollHeight, viewHeight: bestEl.clientHeight };
            }
            
            // Fallback to window
            return { element: null, height: docHeight, viewHeight: window.innerHeight };
        };

        const scroller = getScroller();
        console.log(`[Content] capturing target: ${scroller.element ? scroller.element.tagName : 'WINDOW'}, height: ${scroller.height}`);

        const fullHeight = scroller.height;
        const fullWidth = document.documentElement.clientWidth;
        const viewportHeight = scroller.viewHeight; // Use scroller's viewport height for stepping
        
        // Handle high DPI
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        tempCanvas.width = fullWidth * devicePixelRatio;
        tempCanvas.height = fullHeight * devicePixelRatio;
        
        let currentScroll = 0;
        const captures: { y: number, dataUrl: string, height: number }[] = [];

        // 2. Scroll Loop
        while (currentScroll < fullHeight) {
            // Scroll to position
            if (scroller.element) {
                scroller.element.scrollTo(0, currentScroll);
            } else {
                window.scrollTo(0, currentScroll);
            }
            
            // Wait for scroll/render AND respect Chrome's capture quota
            await new Promise(r => setTimeout(r, 800)); 
            
            // Hide panel before capture to avoid artifacts
            const panel = document.getElementById('navilens-panel');
            const overlay = document.querySelector('div[style*="rgba(79, 70, 229, 0.1)"]') as HTMLElement;
            
            if (panel) panel.style.opacity = '0'; 
            if (overlay) overlay.style.opacity = '0';

            // Small layout/paint wait
            await new Promise(r => requestAnimationFrame(() => setTimeout(r, 50)));

            // Capture via background script (Native method)
            console.log(`[Content] Capturing at scroll Y: ${currentScroll}`);
            const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
            
            // Restore visibility
            if (panel) panel.style.opacity = '1';
            if (overlay) overlay.style.opacity = '0'; 

            if (!response.success) throw new Error(response.error);
            
            captures.push({ 
                y: currentScroll, 
                dataUrl: response.dataUrl,
                height: Math.min(viewportHeight, fullHeight - currentScroll)
            });

            // Update UI
            const progress = Math.min(Math.round((currentScroll / fullHeight) * 100), 99);
            showLoading(`Scanning page... ${progress}%<br><span style='font-size: 12px; color: #94a3b8;'>Scrolling and stitching</span>`);
            
            currentScroll += viewportHeight;
        }

        // Restore scroll
        if (scroller.element) {
            scroller.element.scrollTo(0, 0);
        } else {
            window.scrollTo(0, 0);
        }
        
        showLoading("Stitching images...<br><span style='font-size: 12px; color: #94a3b8;'>Processing...</span>");

        // 3. Stitching
        if (context) {
            for (const capture of captures) {
                const img = new Image();
                img.src = capture.dataUrl;
                await new Promise(resolve => img.onload = resolve);
                
                context.drawImage(
                    img, 
                    0, 0, img.width, img.height, // Source full capture
                    0, capture.y * devicePixelRatio, tempCanvas.width, img.height // Dest
                );
            }
        }

        console.log('[Content] Stitching complete.');
        const finalImageUri = tempCanvas.toDataURL('image/png');
        
        if (mode === 'internal') {
            // Save to storage
            await chrome.storage.local.set({ 
                'navilens_current_capture': {
                    imageUri: finalImageUri,
                    timestamp: Date.now()
                }
            });

            showLoading("Done! Opening result...<br><span style='font-size: 12px; color: #94a3b8;'>Redirecting to analysis page</span>");

            // Open Result Tab
            await chrome.runtime.sendMessage({ type: 'OPEN_RESULT_TAB' });
            
        } else if (mode === 'clipboard') {
            // Clipboard mode
            showLoading("Copying to clipboard...<br><span style='font-size: 12px; color: #94a3b8;'>Preparing for Gemini</span>");
            
            // Convert to blob for clipboard
            tempCanvas.toBlob(async (blob) => {
                if (!blob) {
                    showError("Failed to create image blob.");
                    return;
                }
                
                try {
                    const item = new ClipboardItem({ "image/png": blob });
                    await navigator.clipboard.write([item]);
                    
                    showLoading("Copied! Opening Gemini...<br><span style='font-size: 12px; color: #94a3b8;'>Press Ctrl+V when it opens</span>");
                    
                    await new Promise(r => setTimeout(r, 1000));
                    await chrome.runtime.sendMessage({ type: 'OPEN_GEMINI_TAB' });

                } catch (err) {
                    console.error('Clipboard write failed:', err);
                    showError("Failed to copy to clipboard. Permission denied?");
                }
            });
        }
        
        // Close panel after short delay
        setTimeout(() => {
            const panel = document.getElementById('navilens-panel');
            if (panel) panel.style.display = 'none';
        }, 1000);

    } catch (error) {
        console.error('[Content] Scroll capture failed:', error);
        showError('Failed to capture full page.');
    }
};

// --- Message Listener ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Content] Message received:', message);
  if (message.type === 'TOGGLE_SELECTION') {
    toggleSelection(true);
    sendResponse({ status: 'selection_active' });
  } else if (message.type === 'CAPTURE_FULL_PAGE') {
    console.log('[Content] Starting Scroll & Stitch capture (Internal)...');
    showLoading("Initializing scroll capture...<br><span style='font-size: 12px; color: #94a3b8;'>Please do not interact with the page.</span>");

    setTimeout(() => performScrollCapture('internal'), 100);
    sendResponse({ status: 'capturing' });
  } else if (message.type === 'CAPTURE_TO_GEMINI') {
    console.log('[Content] Starting Scroll & Stitch capture (Clipboard)...');
    showLoading("Initializing scroll capture...<br><span style='font-size: 12px; color: #94a3b8;'>Please do not interact with the page.</span>");

    setTimeout(() => performScrollCapture('clipboard'), 100);
    sendResponse({ status: 'capturing' });
  }
});

console.log('NaviLens Content Script V1 Loaded');

// --- Auto-Paste Logic ---

let hasRunAutoPaste = false;

const checkForPendingPaste = async () => {
    if (hasRunAutoPaste) return;
    
    const data = await chrome.storage.local.get('navilens_pending_paste');
    const pending = data.navilens_pending_paste as { platform: string, timestamp: number, imageUri?: string } | undefined;

    if (pending && (Date.now() - pending.timestamp < 15000)) { 
        hasRunAutoPaste = true;
        console.log('[NaviLens] Found pending paste task for:', pending.platform);
        
        await chrome.storage.local.remove('navilens_pending_paste');

        if (window.location.host.includes('gemini.google.com') || window.location.host.includes('chatgpt.com')) {
            // Pass the image data if available
            attemptAutoPaste(pending.platform, pending.imageUri);
        }
    }
};

const attemptAutoPaste = async (platform: string, imageUri?: string) => {
    const selector = platform === 'Gemini' ? 'div[contenteditable="true"]' : '#prompt-textarea';
    const input = await waitForElement(selector);

    if (input) {
        console.log('[NaviLens] Target input found. Focusing...');
        (input as HTMLElement).focus();
        
        await new Promise(r => setTimeout(r, 800));

        console.log('[NaviLens] Triggering synthetic paste...');
        
        if (imageUri) {
            try {
                // 1. Synthetic Event with Data (The Magic Fix)
                const blob = dataURItoBlob(imageUri);
                const file = new File([blob], "screenshot.png", { type: 'image/png' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);

                const pasteEvent = new ClipboardEvent('paste', {
                    bubbles: true,
                    cancelable: true,
                    clipboardData: dataTransfer
                });

                input.dispatchEvent(pasteEvent);
                console.log('[NaviLens] Synthetic paste event dispatched!');
                return; // Success (hopefully)
            } catch (e) {
                console.error('[NaviLens] Synthetic paste failed:', e);
            }
        }

        // 2. Fallback to standard execCommand
        try {
            document.execCommand('paste');
        } catch (e) {}
    }
};

// Helper for Blob conversion (Needed in content script context)
const dataURItoBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], {type: mimeString});
};

const waitForElement = (selector: string): Promise<Element | null> => {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Timeout after 10s
        setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, 10000);
    });
};

// Check on load
checkForPendingPaste();



