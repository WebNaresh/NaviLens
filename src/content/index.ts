import html2canvas from 'html2canvas';

interface SelectionState {
  active: boolean;
  hoveredElement: HTMLElement | null;
}

const state: SelectionState = {
  active: false,
  hoveredElement: null,
};

// Styles for the highlighter
const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.pointerEvents = 'none';
overlay.style.border = '2px solid #4f46e5'; // Indigo-600
overlay.style.backgroundColor = 'rgba(79, 70, 229, 0.1)';
overlay.style.borderRadius = '4px';
overlay.style.zIndex = '999999';
overlay.style.display = 'none';
overlay.style.transition = 'all 0.1s ease';
document.body.appendChild(overlay);

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

const captureElement = async (element: HTMLElement) => {
  try {
    // Hide overlay before capture
    overlay.style.display = 'none';
    
    // Capture
    const canvas = await html2canvas(element, {
      useCORS: true,
      logging: false,
      allowTaint: true
    });
    
    const imageUri = canvas.toDataURL('image/png');
    console.log('Captured component:', imageUri.substring(0, 50) + '...');
    
    // TODO: Show results UI
    alert('Component captured! Check console.');
    
  } catch (error) {
    console.error('Capture failed:', error);
    alert('Failed to capture component.');
  } finally {
     // Show overlay again if we stay in selection mode (optional, but we usually toggle off)
  }
};

const handleClick = async (e: MouseEvent) => {
  if (!state.active || !state.hoveredElement) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const target = state.hoveredElement;
  toggleSelection(false); // Stop selection mode
  
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

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TOGGLE_SELECTION') {
    toggleSelection(true);
    sendResponse({ status: 'selection_active' });
  } else if (message.type === 'CAPTURE_FULL_PAGE') {
    // delay slightly to allow popup to close fully
    setTimeout(async () => {
        try {
            const canvas = await html2canvas(document.body, {
                useCORS: true,
                logging: false,
                allowTaint: true
            });
            const imageUri = canvas.toDataURL('image/png');
            console.log('Captured full page:', imageUri.substring(0, 50) + '...');
            alert('Full page captured! Check console.');
        } catch (error) {
            console.error('Full page capture failed:', error);
            alert('Full page capture failed.');
        }
    }, 500);
    sendResponse({ status: 'capturing' });
  }
});

console.log('NaviLens Content Script Loaded');
