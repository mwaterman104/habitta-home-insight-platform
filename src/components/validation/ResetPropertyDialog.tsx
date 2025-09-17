import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Loader2 } from "lucide-react";
import { ValidationCockpitDB } from "@/lib/validation-cockpit";
import { toast } from "sonner";

interface ResetPropertyDialogProps {
  addressId: string;
  propertyAddress: string;
  onResetComplete?: () => void;
  children: React.ReactNode;
}

export function ResetPropertyDialog({ 
  addressId, 
  propertyAddress, 
  onResetComplete, 
  children 
}: ResetPropertyDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState({
    clearLabels: true,
    clearPredictions: true,
    clearEnrichmentData: false,
    clearErrorTags: true
  });

  const handleReset = async () => {
    setLoading(true);
    try {
      await ValidationCockpitDB.resetProperty(addressId, options);
      toast.success('Property reset successfully');
      setOpen(false);
      onResetComplete?.();
    } catch (error) {
      console.error('Error resetting property:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reset property');
    } finally {
      setLoading(false);
    }
  };

  const updateOption = (key: keyof typeof options, value: boolean) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Reset Property
          </DialogTitle>
          <DialogDescription>
            This will reset the validation state for:
            <div className="font-medium mt-1">{propertyAddress}</div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Select what data to clear:
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="clearLabels"
                checked={options.clearLabels}
                onCheckedChange={(checked) => updateOption('clearLabels', !!checked)}
              />
              <label htmlFor="clearLabels" className="text-sm font-medium">
                Clear labels (manual annotations)
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="clearPredictions"
                checked={options.clearPredictions}
                onCheckedChange={(checked) => updateOption('clearPredictions', !!checked)}
              />
              <label htmlFor="clearPredictions" className="text-sm font-medium">
                Clear predictions (AI predictions)
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="clearErrorTags"
                checked={options.clearErrorTags}
                onCheckedChange={(checked) => updateOption('clearErrorTags', !!checked)}
              />
              <label htmlFor="clearErrorTags" className="text-sm font-medium">
                Clear error tags
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="clearEnrichmentData"
                checked={options.clearEnrichmentData}
                onCheckedChange={(checked) => updateOption('clearEnrichmentData', !!checked)}
              />
              <label htmlFor="clearEnrichmentData" className="text-sm font-medium">
                Clear enrichment data (permits, property info)
              </label>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-sm text-amber-800">
              <strong>Warning:</strong> This action cannot be undone. The property status will be reset to "pending".
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleReset}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset Property'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}