
console.log('NaviLens Background Service Worker Loaded');


chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    console.log('[Background] Action clicked, sending CAPTURE_FULL_PAGE to tab', tab.id);
    // Inject content script if needed (optional, but good practice if not already present)
    // For now we assume activeTab permission and content script loaded via manifest
    try {
        await chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_FULL_PAGE' });
    } catch (e) {
        console.error('[Background] Failed to send message:', e);
    }
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  // Return true to indicate we will send a response asynchronously
  
  if (message.type === 'CAPTURE_VISIBLE_TAB') {
    chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Capture failed:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, dataUrl });
      }
    });
    return true; // Async response
  }

  if (message.type === 'OPEN_RESULT_TAB') {
    chrome.tabs.create({ url: 'capture.html' });
    sendResponse({ success: true });
    return true;
  }
});
