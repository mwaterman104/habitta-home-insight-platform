import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useServiceWorker } from "@/hooks/useServiceWorker";

export const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { isInstallable, installApp, isInstalled } = useServiceWorker();

  useEffect(() => {
    // Check if user previously dismissed the prompt
    const wasDismissed = localStorage.getItem("install-prompt-dismissed") === "true";
    
    if (isInstallable && !isInstalled && !wasDismissed) {
      // Show prompt after a delay
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("install-prompt-dismissed", "true");
    
    // Auto-show again after 7 days
    setTimeout(() => {
      localStorage.removeItem("install-prompt-dismissed");
    }, 7 * 24 * 60 * 60 * 1000);
  };

  if (!showPrompt || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-fade-in">
      <Card className="bg-primary text-primary-foreground border-primary">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary-foreground/10 rounded-lg flex-shrink-0">
              <Smartphone className="h-5 w-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm mb-1">Install Habitta</h4>
              <p className="text-xs opacity-90 mb-3">
                Get the best experience with our mobile app. Access your home intelligence offline.
              </p>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleInstall}
                  className="flex-1 h-8 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Install
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-8 w-8 p-0 hover:bg-primary-foreground/10"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};