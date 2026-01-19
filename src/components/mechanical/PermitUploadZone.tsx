import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { parseAndEnrichCSV, type PermitRecord } from '@/lib/mechanicalIntelligence';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PermitUploadZoneProps {
  onDataProcessed: (records: PermitRecord[]) => void;
  className?: string;
}

export function PermitUploadZone({ onDataProcessed, className }: PermitUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; critical: number; high: number } | null>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);

    try {
      const text = await file.text();
      const { records, errors } = parseAndEnrichCSV(text);

      if (errors.length > 0) {
        errors.slice(0, 3).forEach(err => toast.warning(err));
        if (errors.length > 3) {
          toast.warning(`...and ${errors.length - 3} more warnings`);
        }
      }

      if (records.length === 0) {
        toast.error('No valid records found in CSV');
        return;
      }

      const critical = records.filter(r => r.riskLevel === 'critical').length;
      const high = records.filter(r => r.riskLevel === 'high').length;
      
      setStats({ total: records.length, critical, high });
      onDataProcessed(records);
      
      toast.success(`Processed ${records.length} permits - ${critical} critical, ${high} high risk`);
    } catch (err) {
      toast.error('Failed to process CSV file');
      console.error('CSV processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [onDataProcessed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <Card className={cn('transition-all duration-200', className)}>
      <CardContent className="p-6">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 text-center',
            isDragging 
              ? 'border-primary bg-primary/5 scale-[1.02]' 
              : 'border-border hover:border-primary/50 hover:bg-muted/30',
            isProcessing && 'opacity-70 pointer-events-none'
          )}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Processing {fileName}...</p>
            </div>
          ) : stats ? (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
              <div className="space-y-2">
                <p className="font-medium">{fileName}</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Badge variant="secondary">{stats.total} permits</Badge>
                  {stats.critical > 0 && (
                    <Badge variant="destructive">{stats.critical} critical</Badge>
                  )}
                  {stats.high > 0 && (
                    <Badge className="bg-orange-500 hover:bg-orange-600">{stats.high} high risk</Badge>
                  )}
                </div>
              </div>
              <label className="cursor-pointer">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileInput} 
                  className="hidden"
                />
                <Button variant="outline" size="sm" asChild>
                  <span>Upload Different File</span>
                </Button>
              </label>
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center gap-4">
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileInput} 
                className="hidden"
              />
              <div className={cn(
                'p-4 rounded-full transition-colors',
                isDragging ? 'bg-primary/10' : 'bg-muted'
              )}>
                <Upload className={cn(
                  'h-8 w-8 transition-colors',
                  isDragging ? 'text-primary' : 'text-muted-foreground'
                )} />
              </div>
              <div className="space-y-1">
                <p className="font-medium">
                  {isDragging ? 'Drop your CSV here' : 'Upload Miami-Dade Permit CSV'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Drag & drop or click to browse
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>Required: Address, Work_Description, Issue_Date</span>
              </div>
            </label>
          )}
        </div>
        
        {/* Column mapping info */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Expected Columns:</p>
              <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0.5">
                <li>• Address / Site_Address</li>
                <li>• Work_Description</li>
                <li>• Contractor_Name</li>
                <li>• Issue_Date</li>
                <li>• Folio_Number</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
