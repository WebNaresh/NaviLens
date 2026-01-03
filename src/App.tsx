import React, { useState, useEffect } from 'react';
import { getApiKey, setApiKey } from './lib/storage';
import { Input } from './components/Input';

function App() {
  const [apiKey, setApiKeyValue] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getApiKey().then((key) => {
      if (key) setApiKeyValue(key);
    });
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    await setApiKey(apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="w-[350px] min-h-[400px] p-4 bg-gray-50 flex flex-col font-sans">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-indigo-600 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
          NaviLens
        </h1>
        <p className="text-xs text-gray-500">AI Screen Assistant</p>
      </header>

      <main className="flex-1 flex flex-col gap-4">
        <section className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <Input
            label="Gemini API Key"
            type="password"
            placeholder="Enter your API Key"
            value={apiKey}
            onChange={(e) => {
                setApiKeyValue(e.target.value);
                setSaved(false);
            }}
          />
          <button
            onClick={handleSave}
            className={`mt-3 w-full py-2 px-4 rounded-md text-white font-medium transition-colors ${
              saved ? 'bg-green-500 hover:bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {saved ? 'Saved!' : 'Save Key'}
          </button>
        </section>

        <section className="flex flex-col gap-2 mt-2">
            <button className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-indigo-100 hover:border-indigo-300 rounded-lg shadow-sm text-gray-700 hover:text-indigo-600 transition-all group">
                <span className="text-lg">📸</span>
                <span className="font-medium">Capture Full Page</span>
            </button>
            <button className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-indigo-100 hover:border-indigo-300 rounded-lg shadow-sm text-gray-700 hover:text-indigo-600 transition-all group">
                <span className="text-lg">🖱️</span>
                <span className="font-medium">Select Component</span>
            </button>
        </section>
      </main>

      <footer className="mt-6 text-center text-[10px] text-gray-400">
        Powered by Google Gemini
      </footer>
    </div>
  );
}

export default App;
