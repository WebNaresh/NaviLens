import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Camera } from 'lucide-react';

function App() {
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


  return (
    <div className="w-[350px] min-h-[300px] bg-background font-sans p-4">
      <Card className="border-none shadow-none">
        <CardHeader className="px-0 pt-0 pb-4">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            NaviLens
          </CardTitle>
          <CardDescription>AI-Powered Screen Assistant</CardDescription>
        </CardHeader>
        
        <Separator className="mb-6" />

        <CardContent className="px-0 space-y-6">
          <div className="flex flex-col gap-3">
            <Button 
              variant="outline" 
              className="h-24 flex flex-col gap-2 hover:border-indigo-500 hover:text-indigo-600 transition-all w-full"
              onClick={handleFullPageCapture}
            >
              <Camera className="h-8 w-8" />
              <div className="flex flex-col items-center">
                <span className="text-sm font-medium">Capture Full Page</span>
                <span className="text-[10px] text-muted-foreground">Scans entire page content</span>
              </div>
            </Button>
          </div>
        </CardContent>

        <CardFooter className="px-0 pt-2 flex justify-center">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            NaviLens Intelligent Capture
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default App;
