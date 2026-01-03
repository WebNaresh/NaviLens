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
    console.log('[Content] Starting full page capture...');
    
    // IMMEDIATE FEEDBACK: Show loading state with explicit message
    showLoading("Capturing full page...<br><span style='font-size: 12px; color: #94a3b8;'>(This may take a few seconds)</span>");

    setTimeout(async () => {
        try {
            const startTime = performance.now();
            console.log('[Content] Executing html2canvas...');
            
            const canvas = await html2canvas(document.body, {
                useCORS: true,
                logging: true, // Enable html2canvas logs
                allowTaint: true,
                ignoreElements: (element) => {
                    // Ignore our own panel/overlay to avoid recursive capture issues or visual clutter
                    return element.id === 'navilens-panel' || element === overlay; 
                }
            });
            const captureEndTime = performance.now();
            console.log(`[Content] html2canvas finished in ${Math.round(captureEndTime - startTime)}ms`);

            console.log('[Content] Canvas created, converting to data URL...');
            const imageUri = canvas.toDataURL('image/png');
            const conversionEndTime = performance.now();
            console.log(`[Content] Data URL conversion finished in ${Math.round(conversionEndTime - captureEndTime)}ms`);
            console.log(`[Content] Total capture time: ${Math.round(conversionEndTime - startTime)}ms`);
            console.log('[Content] Data URL created, length:', imageUri.length);
            
            // Show preview before sending
            const panel = document.getElementById('navilens-content');
            if (panel) {
                panel.innerHTML = `
                  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
                    <div style="border: 3px solid #f3f3f3; border-top: 3px solid #4f46e5; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 12px; color: #64748b; text-align: center;">Analyzing captured content...</p>
                    <div style="margin-top: 16px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; max-height: 200px;">
                      <img src="${imageUri}" style="width: 100%; height: auto; display: block;" />
                    </div>
                  </div>
                `;
            }

            await processCapture(imageUri);
        } catch (error) {
            console.error('[Content] Full page capture failed:', error);
            showError('Full page capture failed.');
        }
    }, 100);
    sendResponse({ status: 'capturing' });
  }
});

console.log('NaviLens Content Script V1 Loaded');
