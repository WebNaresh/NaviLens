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
const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.pointerEvents = 'none';
overlay.style.border = '2px solid #4f46e5'; // Indigo-600
overlay.style.backgroundColor = 'rgba(79, 70, 229, 0.1)';
overlay.style.borderRadius = '4px';
overlay.style.zIndex = '2147483646'; // High but below panel
overlay.style.display = 'none';
overlay.style.transition = 'all 0.1s ease';
document.body.appendChild(overlay);

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

const showResults = (text: string) => {
  const panel = createFloatingPanel();
  const content = document.getElementById('navilens-content');
  if (content) {
    // Simple markdown-like parsing for bold text
    const formattedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    
    content.innerHTML = formattedText;
  }
  panel.style.display = 'block';
};

const showError = (error: string) => {
  const panel = createFloatingPanel();
  const content = document.getElementById('navilens-content');
  if (content) {
    content.innerHTML = `<p style="color: #ef4444; text-align: center;">Error: ${error}</p>`;
  }
  panel.style.display = 'block';
};

// --- Capture & Analysis ---

const processCapture = async (imageData: string) => {
  showLoading();
  
  try {
    const response = await chrome.runtime.sendMessage({ 
      type: 'ANALYZE_IMAGE', 
      imageBase64: imageData 
    });

    if (response && response.success) {
      showResults(response.data);
    } else {
      showError(response?.error || 'Unknown error');
    }
  } catch (error) {
    console.error("Message passing failed:", error);
    showError("Failed to communicate with the extension.");
  }
};

const captureElement = async (element: HTMLElement) => {
  try {
    overlay.style.display = 'none';
    
    const canvas = await html2canvas(element, {
      useCORS: true,
      logging: false,
      allowTaint: true
    });
    
    const imageUri = canvas.toDataURL('image/png');
    await processCapture(imageUri);
    
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
  overlay.style.top = `${rect.top}px`;
  overlay.style.left = `${rect.left}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.display = 'block';
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
    overlay.style.display = 'none';
    state.hoveredElement = null;
  }
};

// --- Message Listener ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Content] Message received:', message);
  if (message.type === 'TOGGLE_SELECTION') {
    toggleSelection(true);
    sendResponse({ status: 'selection_active' });
  } else if (message.type === 'CAPTURE_FULL_PAGE') {
    console.log('[Content] Starting Scroll & Stitch capture...');
    
    showLoading("Initializing scroll capture...<br><span style='font-size: 12px; color: #94a3b8;'>Please do not interact with the page.</span>");

    const scrollAndCapture = async () => {
        try {
            const tempCanvas = document.createElement('canvas');
            const context = tempCanvas.getContext('2d');
            
            // 1. Setup dimensions
            const fullHeight = Math.max(
                document.documentElement.scrollHeight, 
                document.body.scrollHeight,
                document.documentElement.offsetHeight
            );
            const fullWidth = document.documentElement.clientWidth;
            const viewportHeight = window.innerHeight;
            
            // Handle high DPI
            const devicePixelRatio = window.devicePixelRatio || 1;
            
            tempCanvas.width = fullWidth * devicePixelRatio;
            tempCanvas.height = fullHeight * devicePixelRatio;
            
            console.log(`[Content] Capture dimensions: ${fullWidth}x${fullHeight} (@${devicePixelRatio}x)`);

            let currentScroll = 0;
            const captures: { y: number, dataUrl: string, height: number }[] = [];

            // 2. Scroll Loop
            while (currentScroll < fullHeight) {
                // Scroll to position
                window.scrollTo(0, currentScroll);
                
                // Wait for scroll/render (dynamic wait could be better, but fixed is safer)
                await new Promise(r => setTimeout(r, 150)); 
                
                // Capture via background script (Native method)
                console.log(`[Content] Capturing at scroll Y: ${currentScroll}`);
                const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
                
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
            window.scrollTo(0, 0);
            
            showLoading("Stitching images...<br><span style='font-size: 12px; color: #94a3b8;'>Almost done</span>");

            // 3. Stitching
            if (context) {
                for (const capture of captures) {
                    const img = new Image();
                    img.src = capture.dataUrl;
                    await new Promise(resolve => img.onload = resolve);
                    
                    // Native capture is already scaled by dpr
                    // We draw it onto our canvas at the correct Y offset
                    // If it's the last chunk, we might need to crop it if it mimics "background-attachment: fixed" behavior?
                    // Actually, simple stacking usually works for normal pages.
                    // For the last chunk, if we simply over-scrolled, the browser handles it.
                   
                    context.drawImage(
                        img, 
                        0, 0, img.width, img.height, // Source
                        0, capture.y * devicePixelRatio, tempCanvas.width, img.height // Dest (y scaled)
                    );
                }
            }

            console.log('[Content] Stitching complete.');
            const finalImageUri = tempCanvas.toDataURL('image/png');
            
            // Preview
            const panel = document.getElementById('navilens-content');
            if (panel) {
                panel.innerHTML = `
                  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
                    <div style="border: 3px solid #f3f3f3; border-top: 3px solid #4f46e5; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 12px; color: #64748b; text-align: center;">Analyzing full page...</p>
                    <div style="margin-top: 16px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; max-height: 200px;">
                      <img src="${finalImageUri}" style="width: 100%; height: auto; display: block;" />
                    </div>
                  </div>
                `;
            }

            await processCapture(finalImageUri);

        } catch (error) {
            console.error('[Content] Scroll capture failed:', error);
            showError('Failed to capture full page.');
        }
    };

    // Small delay to ensure UI updates before starting work
    setTimeout(scrollAndCapture, 100);
    
    sendResponse({ status: 'capturing' });
  }
});

console.log('NaviLens Content Script V1 Loaded');
