
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

// --- Scroll Capture Helper ---

const performScrollCapture = async () => {
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
  if (message.type === 'CAPTURE_FULL_PAGE') {
    console.log('[Content] Starting Scroll & Stitch capture (Internal)...');
    showLoading("Initializing scroll capture...<br><span style='font-size: 12px; color: #94a3b8;'>Please do not interact with the page.</span>");

    setTimeout(() => performScrollCapture(), 100);
    sendResponse({ status: 'capturing' });
  }
});


// --- Auto-Paste Logic ---


// Helper to check if we just opened this tab to paste
const checkForPendingPaste = async () => {
    try {
        const result = await chrome.storage.local.get('navilens_current_capture');
        const navilens_current_capture = result.navilens_current_capture as { imageUri?: string; timestamp?: number } | undefined;
        
        if (!navilens_current_capture || !navilens_current_capture.imageUri || !navilens_current_capture.timestamp) return;

        // Check if this is a target specific URL (Gemini or ChatGPT)
        const isGemini = window.location.href.includes('gemini.google.com');
        const isChatGPT = window.location.href.includes('chatgpt.com');
        const isClaude = window.location.href.includes('claude.ai');

        if (isGemini || isChatGPT || isClaude) {
             // Check timestamp to avoid pasting old captures? 
             // Ideally we might clear storage after paste, but keeping it allows re-paste.
             // We could check if the capture was recent (< 1 min).
             const now = Date.now();
             if (now - navilens_current_capture.timestamp < 60000) { // 1 minute window
                 console.log('[Content] Detected recent capture, attempting auto-paste...');
                 attemptAutoPaste(navilens_current_capture.imageUri);
             }
        }
    } catch (e) {
        console.error('[Content] Error checking for pending paste:', e);
    }
};


const dataURItoBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
};

const waitForElement = (selector: string, timeout = 5000): Promise<Element | null> => {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver((_mutations) => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, timeout);
    });
};

const attemptAutoPaste = async (imageUri: string) => {
    try {
        const blob = dataURItoBlob(imageUri);
        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);
        console.log('[Content] Image copied to clipboard!');

        // Try to focus the input area and paste
        // Selectors might change, this is best-effort
        let inputSelector = 'div[contenteditable="true"]'; // Generic rich text
        if (window.location.href.includes('gemini')) {
             inputSelector = 'div[contenteditable="true"]'; // Gemini usually uses this
        } else if (window.location.href.includes('chatgpt')) {
             inputSelector = '#prompt-textarea'; 
        }

        const inputEl = await waitForElement(inputSelector) as HTMLElement;
        if (inputEl) {
            console.log('[Content] Found input element, focusing...', inputEl);
            inputEl.focus();
            
            // Note: We cannot programmatically trigger 'paste' event with clipboard data due to security.
            // But we have copied it to clipboard. 
            // We can show a toast telling user to press "Ctrl+V".
            
            const toast = document.createElement('div');
            toast.textContent = 'Image Copied! Press Ctrl+V to paste.';
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.backgroundColor = '#10b981'; // Green
            toast.style.color = '#fff';
            toast.style.padding = '10px 20px';
            toast.style.borderRadius = '8px';
            toast.style.zIndex = '999999';
            toast.style.fontFamily = 'system-ui';
            toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            document.body.appendChild(toast);
            
            setTimeout(() => toast.remove(), 4000);
        }

    } catch (e) {
        console.error('[Content] Auto-paste failed:', e);
    }
};

// Check on load
checkForPendingPaste();

console.log('NaviLens Content Script V1 Loaded');





