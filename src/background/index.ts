
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

chrome.commands.onCommand.addListener(async (command) => {
  console.log('[Background] Command received:', command);
  if (command === 'capture_full_page') {
    handleCaptureCommand(command, 'CAPTURE_FULL_PAGE');
  } else if (command === 'capture_full_page_clipboard') {
    console.log('[Background] MATCH: capture_full_page_clipboard');
    handleCaptureCommand(command, 'CAPTURE_FULL_PAGE_CLIPBOARD');
  } else if (command === 'capture_viewport_clipboard') {
      handleCaptureCommand(command, 'CAPTURE_VIEWPORT_CLIPBOARD');
  } else if (command === 'capture_crop_clipboard') {
      handleCaptureCommand(command, 'CAPTURE_CROP_CLIPBOARD');
  } else {
      console.warn('[Background] Unknown command:', command);
  }
});

async function handleCaptureCommand(commandName: string, messageType: string) {
    console.log(`[Background] ${commandName} command triggered`);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        console.log(`[Background] Sending ${messageType} to tab`, tab.id);
        await chrome.tabs.sendMessage(tab.id, { type: messageType });
      } catch (e) {
        console.error('[Background] Failed to send message:', e);
      }
    } else {
        console.log('[Background] No active tab found for capture command');
    }
}

