
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

  if (message.type === 'OPEN_GEMINI_TAB') {
    chrome.tabs.create({ url: 'https://gemini.google.com/app' });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'OPEN_CHATGPT_TAB') {
    chrome.tabs.create({ url: 'https://chatgpt.com/' });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'OPEN_ANTIGRAVITY_TAB') {
    // Navigate current tab to cursor:// (often works better than iframes for focus)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
            chrome.tabs.update(tabs[0].id, { url: 'cursor://file/C:/' });
        }
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'OPEN_VSCODE') {
    // Navigate current tab to vscode://
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
            chrome.tabs.update(tabs[0].id, { url: 'vscode://file/C:/' });
        }
    });
    sendResponse({ success: true });
    return true;
  }
});

