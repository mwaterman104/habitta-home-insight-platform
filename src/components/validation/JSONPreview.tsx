import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface JSONPreviewProps {
  data: Record<string, any>;
  title?: string;
  collapsible?: boolean;
}

export function JSONPreview({ data, title, collapsible = true }: JSONPreviewProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsible);
  
  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    toast.success("JSON copied to clipboard");
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-4 w-4 p-0"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
          {title}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 w-6 p-0"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </CardHeader>
      {!isCollapsed && (
        <CardContent>
          <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-96 whitespace-pre-wrap">
            <code>{jsonString}</code>
          </pre>
        </CardContent>
      )}
    </Card>
  );
}