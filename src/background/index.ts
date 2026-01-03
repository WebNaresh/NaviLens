import { getApiKey, getModel } from '../lib/storage';
import { analyzeImageWithGemini } from '../lib/gemini';

console.log('NaviLens Background Service Worker Loaded');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Return true to indicate we will send a response asynchronously
  
  if (message.type === 'ANALYZE_IMAGE') {
    handleAnalysis(message.imageBase64, sendResponse);
    return true; 
  }

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
    // Attempt to open usage via custom protocol, falling back if not supported is tricky in background, 
    // but typically we just attempt the protocol launch.
    chrome.tabs.create({ url: 'antigravity://' });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'OPEN_VSCODE') {
    chrome.tabs.create({ url: 'vscode://' });
    sendResponse({ success: true });
    return true;
  }
});

const handleAnalysis = async (imageBase64: string, sendResponse: (response: any) => void) => {
  try {
    const apiKey = await getApiKey();
    const model = await getModel();
    
    if (!apiKey) {
      sendResponse({ success: false, error: 'API Key not found. Please set it in the extension popup.' });
      return;
    }

    // Call Gemini API
    const result = await analyzeImageWithGemini(apiKey, model, imageBase64);

    if (result.error) {
      sendResponse({ success: false, error: result.error });
    } else {
      sendResponse({ success: true, data: result.text });
    }
  } catch (error) {
    console.error('Background Analysis Error:', error);
    sendResponse({ success: false, error: 'Internal extension error during analysis.' });
  }
};
