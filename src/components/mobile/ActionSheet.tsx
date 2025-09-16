import { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
}

export const ActionSheet = ({
  open,
  onOpenChange,
  title,
  description,
  children,
}: ActionSheetProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="bottom" 
          className="rounded-t-2xl border-t-0 max-h-[85vh] overflow-y-auto"
        >
          {(title || description) && (
            <SheetHeader className="text-left pb-4">
              {title && <SheetTitle>{title}</SheetTitle>}
              {description && <SheetDescription>{description}</SheetDescription>}
            </SheetHeader>
          )}
          <div className="pb-safe">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div>{children}</div>
      </DialogContent>
    </Dialog>
  );
};

// Action Sheet Menu Item
interface ActionItemProps {
  icon?: ReactNode;
  label: string;
  description?: string;
  variant?: "default" | "destructive";
  onClick: () => void;
}

export const ActionItem = ({
  icon,
  label,
  description,
  variant = "default",
  onClick,
}: ActionItemProps) => {
  return (
    <button
      className={`w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors touch-friendly ${
        variant === "destructive" ? "text-destructive" : ""
      }`}
      onClick={onClick}
    >
      {icon && (
        <div className={`flex-shrink-0 ${variant === "destructive" ? "text-destructive" : "text-muted-foreground"}`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground mt-1">{description}</div>
        )}
      </div>
    </button>
  );
};