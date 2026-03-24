import { ReactNode, useState, useRef } from "react";
import { useSwipeable } from "react-swipeable";
import { Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SwipeToDeleteProps {
  onDelete: () => void;
  onComplete?: () => void;
  children: ReactNode;
  disabled?: boolean;
}

export const SwipeToDelete = ({ 
  onDelete, 
  onComplete, 
  children, 
  disabled = false 
}: SwipeToDeleteProps) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const maxSwipe = 120;
  const threshold = 60;

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      if (disabled) return;
      
      if (eventData.dir === "Left") {
        const offset = Math.min(maxSwipe, Math.abs(eventData.deltaX));
        setSwipeOffset(offset);
        setIsRevealed(offset > threshold);
      }
    },
    onSwiped: (eventData) => {
      if (disabled) return;
      
      if (eventData.dir === "Left" && Math.abs(eventData.deltaX) > threshold) {
        setSwipeOffset(maxSwipe);
        setIsRevealed(true);
      } else {
        setSwipeOffset(0);
        setIsRevealed(false);
      }
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: false,
  });

  const resetSwipe = () => {
    setSwipeOffset(0);
    setIsRevealed(false);
  };

  return (
    <div className="relative overflow-hidden bg-background rounded-lg">
      {/* Action buttons background */}
      <div 
        className="absolute right-0 top-0 bottom-0 flex items-center gap-2 px-4 bg-muted"
        style={{ 
          width: `${maxSwipe}px`,
          opacity: swipeOffset > 0 ? 1 : 0,
          transform: `translateX(${maxSwipe - swipeOffset}px)`,
          transition: isRevealed ? 'none' : 'all 0.3s ease-out'
        }}
      >
        {onComplete && (
          <Button
            size="sm"
            variant="default"
            className="h-8 w-8 p-0 bg-accent hover:bg-accent/80"
            onClick={() => {
              onComplete();
              resetSwipe();
            }}
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button
          size="sm"
          variant="destructive"
          className="h-8 w-8 p-0"
          onClick={() => {
            onDelete();
            resetSwipe();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div
        {...handlers}
        className="relative z-10 bg-background touch-pan-y"
        style={{
          transform: `translateX(-${swipeOffset}px)`,
          transition: isRevealed ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
};