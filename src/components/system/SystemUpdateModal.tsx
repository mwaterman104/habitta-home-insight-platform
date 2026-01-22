/**
 * SystemUpdateModal
 * 
 * Binary-first correction flow for system install data.
 * Step 1: Has this system been replaced? (Yes / Not Sure / No)
 * Step 2: Year details (if Yes) or confirmation (if No/Not Sure)
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Check, HelpCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getSystemDisplayName } from '@/lib/systemCopy';

type ReplacementStatus = 'original' | 'replaced' | 'unknown';
type Installer = 'diy' | 'licensed_pro' | 'builder';
type KnowledgeSource = 'permit' | 'receipt' | 'inspection' | 'memory';

interface SystemUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeId: string;
  systemKey: string;
  currentInstallYear?: number;
  yearBuilt?: number;
  onUpdateComplete?: (result: {
    installedLine: string;
    confidenceLevel: 'low' | 'medium' | 'high';
    replacementStatus: ReplacementStatus;
  }) => void;
}

export function SystemUpdateModal({
  open,
  onOpenChange,
  homeId,
  systemKey,
  currentInstallYear,
  yearBuilt,
  onUpdateComplete,
}: SystemUpdateModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'binary' | 'details' | 'confirm'>('binary');
  const [replacementStatus, setReplacementStatus] = useState<ReplacementStatus | null>(null);
  const [installYear, setInstallYear] = useState<string>(currentInstallYear?.toString() || '');
  const [installMonth, setInstallMonth] = useState<string>('');
  const [installer, setInstaller] = useState<Installer | ''>('');
  const [knowledgeSource, setKnowledgeSource] = useState<KnowledgeSource | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const systemLabel = getSystemDisplayName(systemKey as any);
  const currentYear = new Date().getFullYear();

  const resetForm = () => {
    setStep('binary');
    setReplacementStatus(null);
    setInstallYear(currentInstallYear?.toString() || '');
    setInstallMonth('');
    setInstaller('');
    setKnowledgeSource('');
    setShowOptional(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleBinaryChoice = (choice: ReplacementStatus) => {
    setReplacementStatus(choice);
    if (choice === 'replaced') {
      setStep('details');
    } else {
      setStep('confirm');
    }
  };

  const handleSubmit = async () => {
    if (!replacementStatus) return;

    setIsSubmitting(true);

    try {
      const payload: Record<string, any> = {
        homeId,
        systemKey,
        replacementStatus,
      };

      if (replacementStatus === 'replaced') {
        if (!installYear) {
          toast({
            title: 'Year required',
            description: 'Please enter the year the system was replaced.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }

        const yearNum = parseInt(installYear, 10);
        if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear) {
          toast({
            title: 'Invalid year',
            description: 'Please enter a valid year between 1900 and now.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }

        payload.installYear = yearNum;
        if (installMonth) {
          payload.installMonth = parseInt(installMonth, 10);
        }
        if (installer || knowledgeSource) {
          payload.installMetadata = {
            ...(installer && { installer }),
            ...(knowledgeSource && { knowledge_source: knowledgeSource }),
            client_request_id: crypto.randomUUID(),
          };
        }
      } else if (replacementStatus === 'unknown') {
        payload.installMetadata = {
          user_acknowledged_unknown: true,
          client_request_id: crypto.randomUUID(),
        };
      } else if (replacementStatus === 'original') {
        payload.installMetadata = {
          is_original_system: true,
          client_request_id: crypto.randomUUID(),
        };
      }

      const { data, error } = await supabase.functions.invoke('update-system-install', {
        body: payload,
      });

      if (error) throw error;

      toast({
        title: 'Updated',
        description: data.message,
      });

      onUpdateComplete?.({
        installedLine: data.installedLine,
        confidenceLevel: data.confidenceLevel,
        replacementStatus: data.replacementStatus,
      });

      handleOpenChange(false);
    } catch (error) {
      console.error('Error updating system:', error);
      toast({
        title: 'Update failed',
        description: 'Unable to update system information. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBinaryStep = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Has this {systemLabel.toLowerCase()} been replaced since the home was built?
      </p>
      
      <div className="grid grid-cols-1 gap-3">
        <Button
          variant="outline"
          className="justify-start h-auto py-4 px-4"
          onClick={() => handleBinaryChoice('replaced')}
        >
          <Check className="h-5 w-5 mr-3 text-green-600" />
          <span>Yes, it's been replaced</span>
        </Button>
        
        <Button
          variant="outline"
          className="justify-start h-auto py-4 px-4"
          onClick={() => handleBinaryChoice('unknown')}
        >
          <HelpCircle className="h-5 w-5 mr-3 text-amber-600" />
          <span>Not sure</span>
        </Button>
        
        <Button
          variant="outline"
          className="justify-start h-auto py-4 px-4"
          onClick={() => handleBinaryChoice('original')}
        >
          <X className="h-5 w-5 mr-3 text-muted-foreground" />
          <span>No, it's the original system</span>
        </Button>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="year">When was it replaced? *</Label>
        <Input
          id="year"
          type="number"
          placeholder="e.g. 2018"
          value={installYear}
          onChange={(e) => setInstallYear(e.target.value)}
          min={yearBuilt || 1900}
          max={currentYear}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="month">Month (optional)</Label>
        <Select value={installMonth} onValueChange={setInstallMonth}>
          <SelectTrigger id="month">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {['January', 'February', 'March', 'April', 'May', 'June', 
              'July', 'August', 'September', 'October', 'November', 'December'].map((month, i) => (
              <SelectItem key={month} value={(i + 1).toString()}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Collapsible open={showOptional} onOpenChange={setShowOptional}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between text-muted-foreground">
            <span>Add more detail (optional)</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showOptional ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="installer">Who replaced it?</Label>
            <Select value={installer} onValueChange={(v) => setInstaller(v as Installer)}>
              <SelectTrigger id="installer">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diy">DIY</SelectItem>
                <SelectItem value="licensed_pro">Licensed professional</SelectItem>
                <SelectItem value="builder">Builder / remodel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="source">How do you know?</Label>
            <Select value={knowledgeSource} onValueChange={(v) => setKnowledgeSource(v as KnowledgeSource)}>
              <SelectTrigger id="source">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="permit">Permit</SelectItem>
                <SelectItem value="receipt">Receipt / invoice</SelectItem>
                <SelectItem value="inspection">Home inspection</SelectItem>
                <SelectItem value="memory">Memory</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={() => setStep('binary')} disabled={isSubmitting}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || !installYear} className="flex-1">
          {isSubmitting ? 'Saving...' : 'Save update'}
        </Button>
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6">
      {replacementStatus === 'unknown' ? (
        <>
          <p className="text-sm text-muted-foreground">
            No problem. We'll continue using an estimate based on your home's age.
          </p>
          <p className="text-sm text-muted-foreground">
            You can always update this later if you find more information.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            This appears to be the original {systemLabel.toLowerCase()} 
            {yearBuilt ? `, installed when the home was built in ${yearBuilt}` : ''}.
          </p>
          <p className="text-sm text-muted-foreground">
            We'll account for this in your planning forecasts.
          </p>
        </>
      )}

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={() => setStep('binary')} disabled={isSubmitting}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update {systemLabel.toLowerCase()} details</DialogTitle>
          <DialogDescription>
            This helps us improve accuracy and future recommendations.
          </DialogDescription>
        </DialogHeader>
        
        {step === 'binary' && renderBinaryStep()}
        {step === 'details' && renderDetailsStep()}
        {step === 'confirm' && renderConfirmStep()}
      </DialogContent>
    </Dialog>
  );
}
