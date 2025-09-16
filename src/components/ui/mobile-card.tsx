import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { cn } from "@/lib/utils"

interface MobileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  compact?: boolean;
}

export const MobileCard = React.forwardRef<HTMLDivElement, MobileCardProps>(
  ({ className, title, compact = false, children, ...props }, ref) => (
    <Card
      ref={ref}
      className={cn(
        "touch-friendly",
        compact && "md:h-auto",
        className
      )}
      {...props}
    >
      {title && (
        <CardHeader className={compact ? "pb-2" : ""}>
          <CardTitle className={cn(
            "text-base md:text-lg",
            compact && "text-sm md:text-base"
          )}>
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(
        compact && "pt-0",
        !title && "pt-4"
      )}>
        {children}
      </CardContent>
    </Card>
  )
)
MobileCard.displayName = "MobileCard"

// Touch-friendly button sizes for mobile
export const touchFriendlyClasses = {
  button: "min-h-[44px] min-w-[44px] touch-manipulation",
  card: "touch-manipulation",
  interactive: "touch-manipulation hover:scale-[1.02] active:scale-[0.98] transition-transform"
}