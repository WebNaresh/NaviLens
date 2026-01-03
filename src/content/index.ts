interface SelectionState {
  active: boolean;
  hoveredElement: HTMLElement | null;
}

let state: SelectionState = {
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
  if (target === document.body || target === document.documentElement) return;
  
  state.hoveredElement = target;
  
  const rect = target.getBoundingClientRect();
  overlay.style.top = `${rect.top}px`;
  overlay.style.left = `${rect.left}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.display = 'block';
};

const handleClick = (e: MouseEvent) => {
  if (!state.active || !state.hoveredElement) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  // Capture logic will go here
  console.log('Selected element:', state.hoveredElement);
  
  // Deactivate selection
  toggleSelection(false);
  
  // Send message to background/popup
  // chrome.runtime.sendMessage(...)
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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOGGLE_SELECTION') {
    toggleSelection(true); // Enable selection mode
    sendResponse({ status: 'active' });
  }
});

console.log('NaviLens Content Script Loaded');
