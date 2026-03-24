import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tag, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ErrorTag {
  id: string;
  error_type: string;
  description: string;
  tagged_at: string;
  resolved: boolean;
  resolution_notes?: string;
}

interface ErrorTaggingSystemProps {
  addressId: string;
  field: string;
  existingTags?: ErrorTag[];
  onTagsUpdated?: () => void;
}

const ERROR_TYPES = [
  { value: 'missing_permit', label: 'Missing Permit Data', description: 'No relevant permits found in Shovels database' },
  { value: 'bad_rule', label: 'Faulty Prediction Rule', description: 'The prediction logic needs improvement' },
  { value: 'data_quality', label: 'Poor Data Quality', description: 'Source data is incomplete or incorrect' },
  { value: 'ambiguous_imagery', label: 'Ambiguous Imagery', description: 'Satellite/street view imagery is unclear' },
  { value: 'cross_validation_failure', label: 'Cross-Validation Failure', description: 'Multiple sources contradict each other' },
  { value: 'regional_variation', label: 'Regional Variation', description: 'Local building practices differ from assumptions' },
];

export function ErrorTaggingSystem({ addressId, field, existingTags = [], onTagsUpdated }: ErrorTaggingSystemProps) {
  const [open, setOpen] = useState(false);
  const [selectedErrorType, setSelectedErrorType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitTag = async () => {
    if (!selectedErrorType) {
      toast.error('Please select an error type');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('error_tags')
        .insert({
          address_id: addressId,
          field,
          error_type: selectedErrorType,
          description: description.trim() || null,
        });

      if (error) throw error;

      toast.success('Error tag created successfully');
      setOpen(false);
      setSelectedErrorType('');
      setDescription('');
      onTagsUpdated?.();
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Failed to create error tag');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveTag = async (tagId: string, resolutionNotes: string) => {
    try {
      const { error } = await supabase
        .from('error_tags')
        .update({
          resolved: true,
          resolution_notes: resolutionNotes.trim() || null,
        })
        .eq('id', tagId);

      if (error) throw error;

      toast.success('Error tag marked as resolved');
      onTagsUpdated?.();
    } catch (error) {
      console.error('Error resolving tag:', error);
      toast.error('Failed to resolve error tag');
    }
  };

  const getErrorTypeInfo = (errorType: string) => {
    return ERROR_TYPES.find(et => et.value === errorType) || { value: errorType, label: errorType, description: '' };
  };

  return (
    <div className="space-y-3">
      {/* Existing Tags */}
      {existingTags.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Error Classification:</h4>
          {existingTags.map((tag) => {
            const errorInfo = getErrorTypeInfo(tag.error_type);
            return (
              <div key={tag.id} className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={tag.resolved ? "default" : "destructive"} className="text-xs">
                      {tag.resolved ? <Check className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                      {errorInfo.label}
                    </Badge>
                  </div>
                  {tag.description && (
                    <p className="text-xs text-muted-foreground mb-1">{tag.description}</p>
                  )}
                  {tag.resolved && tag.resolution_notes && (
                    <p className="text-xs text-green-700 bg-green-50 p-1 rounded">
                      Resolved: {tag.resolution_notes}
                    </p>
                  )}
                </div>
                {!tag.resolved && (
                  <ResolveTagDialog tagId={tag.id} onResolve={handleResolveTag} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Tag */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Tag className="h-4 w-4" />
            Tag Error Type
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Classify Prediction Error</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Error Type</label>
              <Select value={selectedErrorType} onValueChange={setSelectedErrorType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select error classification" />
                </SelectTrigger>
                <SelectContent>
                  {ERROR_TYPES.map((errorType) => (
                    <SelectItem key={errorType.value} value={errorType.value}>
                      <div>
                        <div className="font-medium">{errorType.label}</div>
                        <div className="text-xs text-muted-foreground">{errorType.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Notes (Optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide additional context about this error..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitTag} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Tag'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ResolveTagDialogProps {
  tagId: string;
  onResolve: (tagId: string, notes: string) => void;
}

function ResolveTagDialog({ tagId, onResolve }: ResolveTagDialogProps) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const handleResolve = () => {
    onResolve(tagId, notes);
    setOpen(false);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Check className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as Resolved</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Resolution Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How was this error resolved?"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolve}>
              Mark Resolved
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
