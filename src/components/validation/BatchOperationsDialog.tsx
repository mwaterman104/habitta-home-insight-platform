import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, AlertTriangle } from "lucide-react";
import { ValidationCockpitDB, PropertySample } from "@/lib/validation-cockpit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface BatchOperationsDialogProps {
  operation: 'enrich' | 'predict';
  properties: PropertySample[];
  onComplete: () => void;
  children: React.ReactNode;
}

export function BatchOperationsDialog({ operation, properties, onComplete, children }: BatchOperationsDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentProperty, setCurrentProperty] = useState<string>('');
  const [results, setResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });

  const getEligibleProperties = () => {
    if (operation === 'enrich') {
      return properties.filter(p => p.status === 'pending');
    } else {
      return properties.filter(p => p.status === 'enriched');
    }
  };

  const getFilteredProperties = () => {
    const eligible = getEligibleProperties();
    if (selectedStatus === 'all') return eligible;
    return eligible.filter(p => p.status === selectedStatus);
  };

  const processProperty = async (property: PropertySample) => {
    const functionName = operation === 'enrich' ? 'enrich-property' : 'predict-property';
    const newStatus = operation === 'enrich' ? 'enriched' : 'predicted';

    try {
      const response = await supabase.functions.invoke(functionName, {
        body: { address_id: property.address_id }
      });

      if (response.error) throw new Error(response.error.message);
      
      await ValidationCockpitDB.updatePropertySample(property.address_id, { status: newStatus });
      return true;
    } catch (error) {
      console.error(`Error ${operation}ing property ${property.address_id}:`, error);
      return false;
    }
  };

  const runBatchOperation = async () => {
    const propertiesToProcess = getFilteredProperties();
    if (propertiesToProcess.length === 0) {
      toast.error(`No properties available for ${operation}`);
      return;
    }

    if (!user) {
      toast.error('Authentication required');
      return;
    }

    setRunning(true);
    setPaused(false);
    setProgress(0);
    setResults({ success: 0, failed: 0 });

    try {
      // Use the new batch processor for larger jobs
      if (propertiesToProcess.length > 5) {
        const response = await supabase.functions.invoke('batch-processor', {
          body: {
            operation_type: operation,
            property_ids: propertiesToProcess.map(p => p.address_id),
            user_id: user.id,
          }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const result = response.data;
        setResults({
          success: result.results.successful,
          failed: result.results.failed
        });
        setProgress(100);

        toast.success(`Batch ${operation} completed: ${result.results.successful} success, ${result.results.failed} failed`);
      } else {
        // Use original sequential processing for small jobs
        let successCount = 0;
        let failedCount = 0;

        for (let i = 0; i < propertiesToProcess.length; i++) {
          if (paused) {
            break;
          }

          const property = propertiesToProcess[i];
          setCurrentProperty(`${property.street_address}, ${property.city}`);
          
          const success = await processProperty(property);
          
          if (success) {
            successCount++;
          } else {
            failedCount++;
          }
          
          setResults({ success: successCount, failed: failedCount });
          setProgress(((i + 1) / propertiesToProcess.length) * 100);

          // Small delay to prevent overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        toast.success(`Batch ${operation} completed: ${successCount} success, ${failedCount} failed`);
      }
    } catch (error) {
      console.error('Batch operation failed:', error);
      toast.error(`Batch operation failed: ${error.message}`);
    }

    setRunning(false);
    setCurrentProperty('');
    onComplete();
  };

  const eligibleCount = getEligibleProperties().length;
  const filteredCount = getFilteredProperties().length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Batch {operation === 'enrich' ? 'Enrich' : 'Predict'} Properties
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!running && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Filter by Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Eligible ({eligibleCount})</SelectItem>
                    {operation === 'enrich' && (
                      <SelectItem value="pending">
                        Pending ({properties.filter(p => p.status === 'pending').length})
                      </SelectItem>
                    )}
                    {operation === 'predict' && (
                      <SelectItem value="enriched">
                        Enriched ({properties.filter(p => p.status === 'enriched').length})
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {filteredCount} properties will be processed
                </p>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Batch Operation Warning</p>
                    <p className="text-muted-foreground">
                      This will process multiple properties sequentially. Each operation may take 10-30 seconds.
                      You can pause the operation at any time.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {running && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Currently Processing:</p>
                <p className="text-sm text-muted-foreground">{currentProperty}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-green-50 p-2 rounded">
                  <div className="text-lg font-bold text-green-600">{results.success}</div>
                  <div className="text-xs text-green-600">Success</div>
                </div>
                <div className="bg-red-50 p-2 rounded">
                  <div className="text-lg font-bold text-red-600">{results.failed}</div>
                  <div className="text-xs text-red-600">Failed</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={running}>
              {running ? 'Running...' : 'Cancel'}
            </Button>
            {!running ? (
              <Button 
                onClick={runBatchOperation} 
                disabled={filteredCount === 0}
              >
                Start Batch {operation === 'enrich' ? 'Enrich' : 'Predict'}
              </Button>
            ) : (
              <Button 
                variant="outline"
                onClick={() => setPaused(!paused)}
              >
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {paused ? 'Resume' : 'Pause'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}