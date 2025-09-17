import { useState, useEffect } from "react";
import { ArrowLeftRight, ArrowDown, Hand } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GestureHint {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  gesture: string;
}

const gestureHints: GestureHint[] = [
  {
    id: "pull-refresh",
    icon: <ArrowDown className="h-5 w-5" />,
    title: "Pull to Refresh",
    description: "Pull down on any page to refresh your data",
    gesture: "Pull down"
  },
  {
    id: "swipe-cards",
    icon: <ArrowLeftRight className="h-5 w-5" />,
    title: "Swipe Cards",
    description: "Swipe left/right to navigate between system health cards",
    gesture: "Swipe left/right"
  },
  {
    id: "swipe-delete",
    icon: <Hand className="h-5 w-5" />,
    title: "Swipe Actions",
    description: "Swipe left on tasks to reveal quick actions",
    gesture: "Swipe left"
  }
];

export const GestureHints = () => {
  const [currentHint, setCurrentHint] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has seen gesture hints before
    const hasSeenHints = localStorage.getItem("gesture-hints-seen") === "true";
    
    if (!hasSeenHints && !dismissed) {
      // Show hints after user has been on the app for a bit
      const timer = setTimeout(() => {
        setShowHints(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  useEffect(() => {
    if (!showHints) return;

    // Auto-advance through hints
    const interval = setInterval(() => {
      setCurrentHint((prev) => {
        const next = prev + 1;
        if (next >= gestureHints.length) {
          setShowHints(false);
          localStorage.setItem("gesture-hints-seen", "true");
          return 0;
        }
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [showHints]);

  const handleDismiss = () => {
    setShowHints(false);
    setDismissed(true);
    localStorage.setItem("gesture-hints-seen", "true");
  };

  if (!showHints || dismissed) {
    return null;
  }

  const hint = gestureHints[currentHint];

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-fade-in md:hidden">
      <Card className="bg-primary/95 text-primary-foreground border-primary backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary-foreground/10 rounded-lg flex-shrink-0">
              {hint.icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-sm">{hint.title}</h4>
                <span className="text-xs opacity-70">
                  {currentHint + 1}/{gestureHints.length}
                </span>
              </div>
              <p className="text-xs opacity-90 mb-2">{hint.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium bg-primary-foreground/20 px-2 py-1 rounded">
                  {hint.gesture}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-6 text-xs hover:bg-primary-foreground/10"
                >
                  Got it
                </Button>
              </div>
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="flex gap-1 mt-3">
            {gestureHints.map((_, index) => (
              <div
                key={index}
                className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                  index === currentHint
                    ? "bg-primary-foreground"
                    : index < currentHint
                    ? "bg-primary-foreground/50"
                    : "bg-primary-foreground/20"
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};