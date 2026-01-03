import { useState, useEffect } from 'react';
import { getApiKey, setApiKey, getModel, setModel } from './lib/storage';
import { fetchGeminiModels, GeminiModel } from './lib/gemini';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
// import { Camera, MousePointerClick, Save, Check, RefreshCw } from 'lucide-react'; // Added RefreshCw if needed, but keeping existing imports for now
import { Camera, MousePointerClick, Save, Check, Loader2 } from 'lucide-react';

function App() {
  const [apiKey, setApiKeyValue] = useState('');
  const [model, setModelValue] = useState('gemini-1.5-flash');
  const [saved, setSaved] = useState(false);
  const [availableModels, setAvailableModels] = useState<GeminiModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    // Load saved settings
    const loadSettings = async () => {
      const key = await getApiKey();
      if (key) {
        setApiKeyValue(key);
        fetchModels(key);
      }
      
      const m = await getModel();
      if (m && m !== 'gemini-3-pro') {
          setModelValue(m);
      } else {
          // Reset if invalid/legacy model found
          console.log("Resetting invalid model to default");
          setModelValue('gemini-1.5-flash');
          setModel('gemini-1.5-flash');
      }
    };
    loadSettings();
  }, []);

  const fetchModels = async (key: string) => {
    setLoadingModels(true);
    const models = await fetchGeminiModels(key);
    setAvailableModels(models);
    setLoadingModels(false);
  };

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    await setApiKey(apiKey);
    await setModel(model);
    setSaved(true);
    
    // Refresh models on save in case key changed
    fetchModels(apiKey);
    
    setTimeout(() => setSaved(false), 2000);
  };

  const handleFullPageCapture = async () => {
    console.log('[Popup] Full Page capture initiated');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('[Popup] Active tab found:', tab);
    if (tab.id) {
      window.close();
      console.log('[Popup] Sending CAPTURE_FULL_PAGE to tab', tab.id);
      await chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_FULL_PAGE' });
      console.log('[Popup] Message sent');
    } else {
        console.error('[Popup] No active tab found');
    }
  };

  const handleComponentSelect = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      window.close();
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SELECTION' });
    }
  };

  // Fallback models if fetch fails or key is invalid
  const defaultModels = [
    { name: 'models/gemini-1.5-flash', displayName: 'Gemini 1.5 Flash (Default)' },
    { name: 'models/gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
    { name: 'models/gemini-2.0-flash-exp', displayName: 'Gemini 2.0 Flash (Exp)' },
  ];

  const displayModels = availableModels.length > 0 ? availableModels : defaultModels;

  return (
    <div className="w-[350px] min-h-[500px] bg-background font-sans p-4">
      <Card className="border-none shadow-none">
        <CardHeader className="px-0 pt-0 pb-4">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            NaviLens
          </CardTitle>
          <CardDescription>AI-Powered Screen Assistant</CardDescription>
        </CardHeader>
        
        <Separator className="mb-6" />

        <CardContent className="px-0 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Gemini API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Paste your API Key"
                value={apiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setApiKeyValue(e.target.value);
                    setSaved(false);
                }}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model-select">AI Model</Label>
              <select
                id="model-select"
                value={model}
                onChange={(e) => {
                  setModelValue(e.target.value);
                  setSaved(false);
                }}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {displayModels.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.displayName}
                  </option>
                ))}
              </select>
              {loadingModels && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Fetching models...</p>}
            </div>

            <Button 
              onClick={handleSave}
              className={`w-full ${saved ? "bg-green-600 hover:bg-green-700" : ""}`}
            >
              {saved ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Settings Saved
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save Settings
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-24 flex flex-col gap-2 hover:border-indigo-500 hover:text-indigo-600 transition-all"
              onClick={handleFullPageCapture}
            >
              <Camera className="h-6 w-6" />
              <span className="text-xs font-medium">Full Page</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex flex-col gap-2 hover:border-indigo-500 hover:text-indigo-600 transition-all"
              onClick={handleComponentSelect}
            >
              <MousePointerClick className="h-6 w-6" />
              <span className="text-xs font-medium">Select Component</span>
            </Button>
          </div>
        </CardContent>

        <CardFooter className="px-0 pt-2 flex justify-center">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            Powered by Google Gemini <span className="text-xs">✨</span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default App;
