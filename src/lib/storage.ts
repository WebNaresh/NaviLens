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
};

export const getApiKey = async (): Promise<string | null> => {
  const result = await chrome.storage.local.get(STORAGE_KEYS.GEMINI_API_KEY);
  return result[STORAGE_KEYS.GEMINI_API_KEY] || null;
};

export const setApiKey = async (key: string): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.GEMINI_API_KEY]: key });
};
