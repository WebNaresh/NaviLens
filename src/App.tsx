import { useState, useEffect } from 'react';
import { getApiKey, setApiKey, getModel, setModel } from './lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Camera, MousePointerClick, Save, Check } from 'lucide-react';

function App() {
  const [apiKey, setApiKeyValue] = useState('');
  const [model, setModelValue] = useState('gemini-1.5-flash');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load saved settings
    getApiKey().then((key) => {
      if (key) setApiKeyValue(key);
    });
    getModel().then((m) => {
      if (m) setModelValue(m);
    });
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    await setApiKey(apiKey);
    await setModel(model);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
// ... (keep handleFullPageCapture and handleComponentSelect) ...

  const MODELS = [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Exp)' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro-002', name: 'Gemini 1.5 Pro (002)' },
    { id: 'gemini-1.5-flash-002', name: 'Gemini 1.5 Flash (002)' },
  ];

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
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
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
