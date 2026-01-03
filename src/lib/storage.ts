// Basic polyfill/mock for development outside extension
if (typeof chrome === 'undefined' || !chrome.storage) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).chrome = {
    storage: {
      local: {
        get: (key: string) => Promise.resolve({ [key]: localStorage.getItem(key) }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set: (items: Record<string, any>) => {
          Object.entries(items).forEach(([k, v]) => localStorage.setItem(k, v));
          return Promise.resolve();
        },
      },
    },
  };
}

export const STORAGE_KEYS = {
  GEMINI_API_KEY: 'gemini_api_key',
  GEMINI_MODEL: 'gemini_model',
};

export const getApiKey = async (): Promise<string | null> => {
  const result = await chrome.storage.local.get(STORAGE_KEYS.GEMINI_API_KEY);
  const key = result[STORAGE_KEYS.GEMINI_API_KEY];
  return typeof key === 'string' ? key : null;
};

export const setApiKey = async (key: string): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.GEMINI_API_KEY]: key });
};

export const getModel = async (): Promise<string> => {
  const result = await chrome.storage.local.get(STORAGE_KEYS.GEMINI_MODEL);
  return result[STORAGE_KEYS.GEMINI_MODEL] || 'gemini-1.5-flash';
};

export const setModel = async (model: string): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.GEMINI_MODEL]: model });
};
