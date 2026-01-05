
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

// --- Clipboard Helper ---

const copyToClipboardAndToast = async (dataUri: string, toastMessage: string = "Image copied to clipboard!") => {
    try {
        const blob = dataURItoBlob(dataUri);
        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);
        
        // Show Toast
        const toast = document.createElement('div');
        toast.textContent = toastMessage;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = '#10b981'; // Green
        toast.style.color = '#fff';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '8px';
        toast.style.zIndex = '2147483647';
        toast.style.fontFamily = 'Inter, system-ui, sans-serif';
        toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        toast.style.fontWeight = '500';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        
        document.body.appendChild(toast);
        
        // Fade in
        requestAnimationFrame(() => toast.style.opacity = '1');
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);

    } catch (e) {
        console.error('[Content] Clipboard write failed:', e);
        showError(`Failed to copy to clipboard. ${e instanceof Error ? e.message : String(e)}`);
    }
};

const performViewportCapture = async () => {
    try {
        // Flash effect
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100vw';
        flash.style.height = '100vh';
        flash.style.backgroundColor = '#fff';
        flash.style.zIndex = '2147483647';
        flash.style.opacity = '0.5';
        flash.style.pointerEvents = 'none';
        flash.style.transition = 'opacity 0.2s ease-out';
        document.body.appendChild(flash);
        
        requestAnimationFrame(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 200);
        });

        // Hide UI briefly
        const panel = document.getElementById('navilens-panel');
        if (panel) panel.style.opacity = '0';

        // Wait a tick for UI to hide
        await new Promise(r => setTimeout(r, 50));

        const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
        
        if (panel) panel.style.opacity = '1';

        if (response.success && response.dataUrl) {
            await copyToClipboardAndToast(response.dataUrl, "Viewport copied to clipboard!");
        } else {
             throw new Error(response.error || "Unknown capture error");
        }
    } catch (e) {
        console.error('[Content] Viewport capture failed:', e);
        showError(`Failed to capture viewport. ${e instanceof Error ? e.message : String(e)}`);
    }
};

// --- Scroll Capture Helper ---

const performScrollCapture = async (options: { copyToClipboard: boolean } = { copyToClipboard: false }) => {
    try {
        const tempCanvas = document.createElement('canvas');
        const context = tempCanvas.getContext('2d');
        
        // Helper to find the main scrollable element
        const getScroller = () => {
            // 0. PDF Special Case
            if (document.contentType === 'application/pdf') {
                 console.log('[Content] PDF Detected. Forcing window/scrollingElement capture.');
                 const scroller = document.scrollingElement || document.documentElement;
                 return { 
                     element: null, // Null implies window/documentElement scroll
                     height: scroller.scrollHeight, 
                     viewHeight: window.innerHeight 
                 };
            }

            // 1. Check if window itself scrolls deeply (prefer document.scrollingElement)
            const docEl = document.scrollingElement || document.documentElement;
            const docHeight = docEl.scrollHeight;
            
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
                // Enhanced check: Include 'hidden' if it has scrollable content (e.g. custom scrollbars like PerfectScrollbar)
                // But ensure it's not just a small hidden element.
                const isScrollableStyle = ['auto', 'scroll'].includes(style.overflowY) || 
                                          (style.overflowY === 'hidden' && el.scrollHeight > el.clientHeight);

                if (isScrollableStyle) {
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
            
            // Fallback to window/doc
            return { element: null, height: docHeight, viewHeight: window.innerHeight };
        };

        const scroller = getScroller();
        console.log(`[Content] capturing target: ${scroller.element ? scroller.element.tagName : 'WINDOW'}, height: ${scroller.height}`);

        const fullHeight = scroller.height;
        const fullWidth = document.documentElement.clientWidth;
        const viewportHeight = scroller.viewHeight;
        
        // Handle PDF Viewer Edge Case (Plugin hides real height)
        const isPDF = document.contentType === 'application/pdf';
        
        // If content is PDF, we cannot scroll it using DOM.
        // Solution: Fetch data HERE (Content Script has access) and pass to Renderer
        if (isPDF) {
             showLoading("PDF Detected...<br><span style='font-size: 12px; color: #94a3b8;'>Reading file data...</span>");
             
             try {
                 const response = await fetch(window.location.href);
                 const blob = await response.blob();
                 
                 // Check size (Limit ~9MB for Chrome Storage Local safely, ideally <5MB but let's try)
                 if (blob.size > 9 * 1024 * 1024) {
                     showError("PDF is too large to capture directly (>9MB). Download it to view.");
                     return;
                 }

                 const reader = new FileReader();
                 reader.onloadend = async () => {
                     const base64data = reader.result as string;
                     
                     await chrome.storage.local.set({ 
                        'navilens_target_pdf': {
                            dataUri: base64data, // Pass DATA, not URL
                            timestamp: Date.now()
                        }
                    });
                    
                    await chrome.runtime.sendMessage({ type: 'OPEN_RESULT_TAB' });
                    
                    // Close panel
                    const panel = document.getElementById('navilens-panel');
                    if(panel) panel.style.display = 'none';
                 };
                 reader.readAsDataURL(blob);

             } catch (err) {
                 console.error('PDF Read Failed:', err);
                 // Fallback to URL method (might work for http, fail for file)
                 await chrome.storage.local.set({ 
                    'navilens_target_pdf': {
                        url: window.location.href,
                        timestamp: Date.now()
                    }
                });
                await chrome.runtime.sendMessage({ type: 'OPEN_RESULT_TAB' });
                
                // Close panel (Cleanup for fallback path)
                const panel = document.getElementById('navilens-panel');
                if(panel) panel.style.display = 'none';
             }
            return; 
        }

        // Handle high DPI
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Initialize with extra buffer in case content grows or measurements are off
        // We will crop it at the end.
        tempCanvas.width = fullWidth * devicePixelRatio;
        tempCanvas.height = (fullHeight + 2000) * devicePixelRatio; // +2000px buffer in case of dynamic growth
        
        let currentScroll = 0;
        let actualScrollY = 0; // The true position from the browser
        let maxCapturedY = 0; // Track the bottom-most pixel we captured
        
        const captures: { y: number, dataUrl: string, height: number }[] = [];

        // Helper: Hide fixed/sticky elements to prevent "stuttering" (repeated headers)
        // We act conservatively: only hide things that are actually fixed/sticky and visible
        const fixedElements: { el: HTMLElement, originalVisibility: string }[] = [];
        const allNodes = document.querySelectorAll('*'); // checking all nodes is heavy but necessary
        
        // Optimization: Only check once
        allNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
                const style = window.getComputedStyle(node);
                if ((style.position === 'fixed' || style.position === 'sticky') && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                    // Don't hide the scrolling container itself if it happens to be fixed
                    if (node !== scroller.element) {
                        fixedElements.push({ el: node, originalVisibility: node.style.visibility });
                    }
                }
            }
        });

        const toggleFixedElements = (hide: boolean) => {
            fixedElements.forEach(item => {
                item.el.style.visibility = hide ? 'hidden' : item.originalVisibility;
            });
        };

        // State to track fixed element visibility
        let areFixedElementsHidden = false;

        // Loop until we have covered the original estimated height
        // OR we detect we are at the bottom (cannot scroll further)
        while (true) {
            
            // 1. Calculate Target Scroll
            let targetScroll = currentScroll;
            let isFinalScroll = false;

            // Check if this step would exceed our estimated bounds
            if (currentScroll + viewportHeight >= fullHeight) {
                // We are near the end. Force scroll to the very bottom to catch the footer.
                 if (scroller.element) {
                     targetScroll = scroller.element.scrollHeight; // Max generic
                 } else {
                     targetScroll = document.body.scrollHeight; // Max window
                 }
                 isFinalScroll = true;
            }

            // 2. Hide/Show Fixed Elements
            // Keep visible for the very top (y=0)
            if (currentScroll > 0 && !areFixedElementsHidden) {
                 toggleFixedElements(true);
                 areFixedElementsHidden = true;
                 await new Promise(r => requestAnimationFrame(() => setTimeout(r, 50)));
            } else if (currentScroll === 0 && areFixedElementsHidden) {
                 toggleFixedElements(false);
                 areFixedElementsHidden = false;
                 await new Promise(r => requestAnimationFrame(() => setTimeout(r, 50)));
            }

            // 3. Perform Scroll
            if (scroller.element) {
                scroller.element.scrollTo(0, targetScroll);
            } else {
                window.scrollTo(0, targetScroll);
            }
            
            // Wait for scroll/render
            await new Promise(r => setTimeout(r, 800)); 

            // 4. READ actual position (Truth)
            // We use this for stitching, not the 'targetScroll'
            if (scroller.element) {
                actualScrollY = scroller.element.scrollTop;
            } else {
                actualScrollY = window.scrollY;
            }
            
            console.log(`[Content] Target: ${targetScroll}, Actual: ${actualScrollY}`);

            // 5. Capture
            // Hide panel briefly
            const panel = document.getElementById('navilens-panel');
            const overlay = document.querySelector('div[style*="rgba(79, 70, 229, 0.1)"]') as HTMLElement;
            if (panel) panel.style.opacity = '0'; 
            if (overlay) overlay.style.opacity = '0';
            await new Promise(r => requestAnimationFrame(() => setTimeout(r, 50)));

            const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
            
            if (panel) panel.style.opacity = '1';
            if (overlay) overlay.style.opacity = '0'; 

            if (!response.success) { 
                 toggleFixedElements(false);
                 throw new Error(response.error);
            }
            
            // 6. Store
            const capturedHeight = Math.min(viewportHeight, fullHeight + 2000 - actualScrollY); // Sanity cap
            captures.push({ 
                y: actualScrollY, 
                dataUrl: response.dataUrl,
                height: capturedHeight 
            });
            
            // Track total area covered
            const bottomOfThisCapture = actualScrollY + viewportHeight;
            if (bottomOfThisCapture > maxCapturedY) {
                maxCapturedY = bottomOfThisCapture;
            }

            // Update UI
            const progress = Math.min(Math.round((actualScrollY / fullHeight) * 100), 99);
            showLoading(`Scanning page... ${progress}%<br><span style='font-size: 12px; color: #94a3b8;'>Scrolling and stitching</span>`);

            // 7. Break Logic
            // If we are at the bottom (scrolled less than we requested, or fulfilled the final step)
            // Or if we have covered the full estimated height
            if (isFinalScroll || Math.ceil(bottomOfThisCapture) >= fullHeight || (actualScrollY < targetScroll && Math.abs(actualScrollY - targetScroll) > 10)) {
                // If we tried to scroll to X but stuck at Y < X, we hit bottom.
                // Or if we explicitly did the "Final Scroll".
                console.log('[Content] Reached bottom or covered full height.');
                break;
            }
            
            // Next step
            currentScroll = actualScrollY + viewportHeight;
        }

        // Restore fixed elements
        toggleFixedElements(false);

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
                    0, 0, img.width, img.height, 
                    0, capture.y * devicePixelRatio, tempCanvas.width, img.height 
                );
            }
        }

        console.log('[Content] Stitching complete.');
        
        // 4. Final Crop (Crucial! Remove the empty buffer)
        const finalCanvas = document.createElement('canvas'); // Create a fresh tailored canvas
        const finalContentHeight = maxCapturedY * devicePixelRatio;
        finalCanvas.width = tempCanvas.width;
        finalCanvas.height = finalContentHeight;
        
        const finalContext = finalCanvas.getContext('2d');
        if (finalContext) {
            finalContext.drawImage(tempCanvas, 0, 0, tempCanvas.width, finalContentHeight, 0, 0, tempCanvas.width, finalContentHeight);
        }

        const finalImageUri = finalCanvas.toDataURL('image/png'); // Use the cropped one
        
        if (options.copyToClipboard) {
            await copyToClipboardAndToast(finalImageUri, "Full Page Copied!");
            
            // Close panel immediately
            const panel = document.getElementById('navilens-panel');
            if (panel) panel.style.display = 'none';
        } else {
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
        }

    } catch (error) {
        console.error('[Content] Scroll capture failed:', error);
        showError(`Failed to capture full page. ${error instanceof Error ? error.message : String(error)}`);
    }
};

// --- Message Listener ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Content] Message received:', message);
  if (message.type === 'CAPTURE_FULL_PAGE') {
    console.log('[Content] Starting Scroll & Stitch capture (Internal)...');
    showLoading("Initializing scroll capture...<br><span style='font-size: 12px; color: #94a3b8;'>Please do not interact with the page.</span>");

    setTimeout(() => performScrollCapture({ copyToClipboard: false }), 100);
    sendResponse({ status: 'capturing' });
  }

  if (message.type === 'CAPTURE_FULL_PAGE_CLIPBOARD') {
    console.log('[Content] Starting Scroll & Stitch capture (Clipboard)...');
    showLoading("Initializing scroll capture...<br><span style='font-size: 12px; color: #94a3b8;'>Image will be copied to your clipboard.</span>");

    setTimeout(() => performScrollCapture({ copyToClipboard: true }), 100);
    sendResponse({ status: 'capturing' });
  }

  if (message.type === 'CAPTURE_VIEWPORT_CLIPBOARD') {
    console.log('[Content] Starting Viewport capture (Clipboard)...');
    // No loading UI for viewport (instant flash)
    setTimeout(() => performViewportCapture(), 50);
    sendResponse({ status: 'capturing' });
  }
});


// --- Auto-Paste Logic ---


// Helper to check if we just opened this tab to paste
const checkForPendingPaste = async () => {
    try {
        const result = await chrome.storage.local.get('navilens_pending_paste');
        const pendingData = result.navilens_pending_paste as { imageUri?: string; timestamp?: number } | undefined;
        
        if (!pendingData || !pendingData.imageUri || !pendingData.timestamp) return;

        const isGemini = window.location.href.includes('gemini.google.com');
        const isChatGPT = window.location.href.includes('chatgpt.com');
        const isClaude = window.location.href.includes('claude.ai');

        if (isGemini || isClaude) {
            const now = Date.now();
            if (now - pendingData.timestamp < 300000) { 
                console.log('[Content] Detected recent capture, attempting auto-paste...');
                attemptAutoPaste(pendingData.imageUri);
            }
        } else if (isChatGPT) {
             // Ghost Mode for ChatGPT: Silent check
             const now = Date.now();
             if (now - pendingData.timestamp < 300000) {
                 // Use smart waitForElement which handles Cloudflare backoff
                 console.log('[Content] Ghost Mode: Waiting for input...');
                 waitForElement('#prompt-textarea', 60000).then((el) => {
                     if (el) {
                         console.log('[Content] Target found, pasting...');
                         attemptAutoPaste(pendingData.imageUri!);
                     } else {
                         console.log('[Content] Input never appeared.');
                     }
                 });
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


const waitForElement = (selector: string, timeout = 30000): Promise<Element | null> => {
    return new Promise(resolve => {
        const startTime = Date.now();

        const check = () => {
            // 1. Found it?
            const el = document.querySelector(selector);
            if (el) {
                return resolve(el);
            }

            // 2. Timeout?
            if (Date.now() - startTime > timeout) {
                return resolve(null);
            }

            // 3. Cloudflare detection (Adaptive Backoff)
            const isCloudflare = document.title.includes('Just a moment') || 
                                 document.querySelector('#challenge-form') !== null;
            
            let nextDelay = 1000;
            
            if (isCloudflare) {
                // If we are in the "Just a moment" screen, BACK OFF significantly
                // Checking too often here flags us as a bot
                nextDelay = 5000; 
            } else {
                // Faster polling when safe (non-Cloudflare) to feel snappy
                nextDelay = 300 + Math.random() * 400; 
            }

            setTimeout(check, nextDelay);
        };

        check();
    });
};


const attemptAutoPaste = async (imageUri: string) => {
    try {
        const blob = dataURItoBlob(imageUri);
        
        if (window.location.href.includes('chatgpt')) {

            // --- ChatGPT Logic (Simplified) ---
            // Note: We are guaranteed to have the input here because checkForPendingPaste waited for it.
            const inputSelector = '#prompt-textarea';
            const inputEl = document.querySelector(inputSelector) as HTMLElement; 
            
            if (inputEl) {
                console.log('[Content] Ghost Mode: Target verified. Executing paste sequence.');

                 // 2. Attempt Clipboard Write
                try {
                    const item = new ClipboardItem({ [blob.type]: blob });
                    await navigator.clipboard.write([item]);
                    console.log('[Content] Image copied to clipboard!');
                } catch (clipboardError) {
                    console.warn('[Content] Clipboard write failed, proceeding with synthetic drop:', clipboardError);
                }

                // 3. Short Stabilization (2s) just to be safe for hydration
                await new Promise(r => setTimeout(r, 2000));

                // 4. Simulate Drag and Drop
                const file = new File([blob], "screenshot.png", { type: blob.type });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                Object.defineProperty(dataTransfer, "files", {
                    get: () => [file]
                });

                const events = ['dragenter', 'dragover', 'drop'];
                for (const type of events) {
                    const event = new DragEvent(type, {
                        bubbles: true,
                        cancelable: true,
                        dataTransfer: dataTransfer,
                        // @ts-ignore
                        clientX: inputEl.getBoundingClientRect().left + 10,
                        clientY: inputEl.getBoundingClientRect().top + 10,
                        view: window
                    });
                    inputEl.dispatchEvent(event);
                    await new Promise(r => setTimeout(r, 50));
                }
                console.log('[Content] Dispatched synthetic DROP event for ChatGPT');
            } else {
                console.log('[Content] ChatGPT input lost during handoff? Aborting.');
            }


        } else {
            // --- Default Strategy (Gemini/Claude) ---
            console.log('[Content] Using default Synthetic Paste strategy');

            // 1. Attempt Clipboard Write Immediately
            try {
                const item = new ClipboardItem({ [blob.type]: blob });
                await navigator.clipboard.write([item]);
                console.log('[Content] Image copied to clipboard!');
            } catch (clipboardError) {
                console.warn('[Content] Clipboard write failed, proceeding with synthetic paste:', clipboardError);
            }

            // 2. Find Input
            let inputSelector = 'div[contenteditable="true"]'; 
            if (window.location.href.includes('gemini')) {
                 inputSelector = 'rich-textarea > div, div[contenteditable="true"]';
            }
    
            const inputEl = await waitForElement(inputSelector) as HTMLElement;
            if (inputEl) {
                inputEl.focus();
                
                // 3. Synthetic Paste
                try {
                    const file = new File([blob], "screenshot.png", { type: blob.type });
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
    
                    const pasteEvent = new ClipboardEvent('paste', {
                        bubbles: true,
                        cancelable: true,
                        clipboardData: dataTransfer
                    });
    
                    inputEl.dispatchEvent(pasteEvent);
                    console.log('[Content] Dispatched synthetic paste event');
                } catch (dispatchError) {
                    console.error('[Content] Failed to dispatch paste event:', dispatchError);
                }
            }
        }


        // Always show the backup toast
        const toast = document.createElement('div');
        toast.textContent = 'Image Ready! (Press Ctrl+V if not pasted)';
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

        // CONSUME the capture so it doesn't trigger again on reload (Cloudflare protection)
        await chrome.storage.local.remove('navilens_pending_paste');
        console.log('[Content] Capture consumed. Will not auto-paste on reload.');

    } catch (e) {

        console.error('[Content] Auto-paste failed:', e);
    }
};






const init = () => {
    // Ultra-Stealth Mode: Check for Cloudflare title
    const isCloudflare = document.title.includes('Just a moment') || document.querySelector('#challenge-form');
    
    if (isCloudflare) {
        console.log('[Content] Cloudflare detected. Waiting for title change (Event-driven)...');
        // We are in a challenge. 
        // Do NOT poll. Use MutationObserver to wait for the title to change.
        const titleEl = document.querySelector('title');
        if (titleEl) {
            const observer = new MutationObserver(() => {
                if (!document.title.includes('Just a moment')) {
                    console.log('[Content] Title changed! Cloudflare passed. Starting...');
                    observer.disconnect();
                    checkForPendingPaste();
                }
            });
            observer.observe(titleEl, { childList: true, subtree: true });
        } else {
             // Fallback if no title tag (rare)
             // Try body observer
             const observer = new MutationObserver(() => {
                 if (!document.title.includes('Just a moment')) {
                    observer.disconnect();
                    checkForPendingPaste();
                 }
             });
             observer.observe(document.body, { childList: true, subtree: true });
        }
        return;
    }

    // Safe to proceed
    checkForPendingPaste();
};


// "Dead Start" Strategy: Wait for window load + 4 seconds buffer
// This ensures we are completely inert during Cloudflare's initial fingerprinting
const deadStart = () => {
    setTimeout(() => {
        init();
    }, 500); 
};

if (document.readyState === 'complete') {
    deadStart();
} else {
    window.addEventListener('load', deadStart);
}







