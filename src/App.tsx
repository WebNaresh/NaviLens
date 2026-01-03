import { useState, useEffect } from 'react';
import { getApiKey, setApiKey } from './lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Camera, MousePointerClick, Save, Check } from 'lucide-react';

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
    <div className="w-[350px] min-h-[450px] bg-background font-sans p-4">
      <Card className="border-none shadow-none">
        <CardHeader className="px-0 pt-0 pb-4">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            NaviLens
          </CardTitle>
          <CardDescription>AI-Powered Screen Assistant</CardDescription>
        </CardHeader>
        
        <Separator className="mb-6" />

        <CardContent className="px-0 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="api-key">Gemini API Key</Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type="password"
                placeholder="Paste your API Key"
                value={apiKey}
                onChange={(e) => {
                    setApiKeyValue(e.target.value);
                    setSaved(false);
                }}
                className="font-mono text-sm"
              />
              <Button 
                size="icon" 
                onClick={handleSave}
                variant={saved ? "default" : "secondary"}
                className={saved ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Your key is stored locally in your browser.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-indigo-500 hover:text-indigo-600 transition-all">
              <Camera className="h-6 w-6" />
              <span className="text-xs font-medium">Full Page</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-indigo-500 hover:text-indigo-600 transition-all">
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
