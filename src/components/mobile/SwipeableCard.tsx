import { ReactNode, useState } from "react";
import { useSwipeable } from "react-swipeable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface SwipeableCardProps {
  cards: ReactNode[];
  initialIndex?: number;
  showIndicators?: boolean;
  showArrows?: boolean;
  onSwipe?: (direction: "left" | "right", currentIndex: number) => void;
}

export const SwipeableCard = ({ 
  cards, 
  initialIndex = 0, 
  showIndicators = true,
  showArrows = true,
  onSwipe 
}: SwipeableCardProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goToNext = () => {
    const newIndex = currentIndex < cards.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    onSwipe?.("left", newIndex);
  };

  const goToPrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : cards.length - 1;
    setCurrentIndex(newIndex);
    onSwipe?.("right", newIndex);
  };

  const handlers = useSwipeable({
    onSwipedLeft: goToNext,
    onSwipedRight: goToPrevious,
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true,
    delta: 50,
  });

  return (
    <div className="relative">
      {/* Swipeable content */}
      <div
        {...handlers}
        className="relative overflow-hidden touch-pan-y"
        style={{ touchAction: "pan-y" }}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {cards.map((card, index) => (
            <div
              key={index}
              className="w-full flex-shrink-0"
            >
              {card}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      {showArrows && cards.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
            onClick={goToNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && cards.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {cards.map((_, index) => (
            <button
              key={index}
              className={`h-2 w-2 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? "bg-primary w-6"
                  : "bg-muted-foreground/30"
              }`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};