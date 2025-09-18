import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, Play, AlertTriangle } from "lucide-react";
import { PropertySample } from "@/lib/validation-cockpit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface BulkReportDialogProps {
  properties: PropertySample[];
  children: React.ReactNode;
}

interface ReportData {
  address_id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  report: any;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

export function BulkReportDialog({ properties, children }: BulkReportDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentProperty, setCurrentProperty] = useState<string>('');
  const [reports, setReports] = useState<ReportData[]>([]);
  const [completed, setCompleted] = useState(false);

  // Only show properties that are enriched or predicted (have enough data for reports)
  const eligibleProperties = properties.filter(p => 
    p.status === 'enriched' || p.status === 'predicted' || p.status === 'labeled'
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProperties(eligibleProperties.map(p => p.address_id));
    } else {
      setSelectedProperties([]);
    }
  };

  const handleSelectProperty = (addressId: string, checked: boolean) => {
    if (checked) {
      setSelectedProperties(prev => [...prev, addressId]);
    } else {
      setSelectedProperties(prev => prev.filter(id => id !== addressId));
    }
  };

  const generateReports = async () => {
    if (selectedProperties.length === 0) {
      toast.error('Please select properties to generate reports for');
      return;
    }

    if (!user) {
      toast.error('Authentication required');
      return;
    }

    setRunning(true);
    setProgress(0);
    setCompleted(false);
    
    const initialReports: ReportData[] = selectedProperties.map(addressId => {
      const property = eligibleProperties.find(p => p.address_id === addressId)!;
      return {
        address_id: addressId,
        address: property.street_address,
        city: property.city,
        state: property.state,
        zip: property.zip,
        report: null,
        status: 'pending'
      };
    });
    
    setReports(initialReports);

    try {
      let completedCount = 0;
      
      for (let i = 0; i < selectedProperties.length; i++) {
        const addressId = selectedProperties[i];
        const property = eligibleProperties.find(p => p.address_id === addressId)!;
        
        setCurrentProperty(`${property.street_address}, ${property.city}`);
        
        try {
          // Generate report using homesage-full-report function
          const response = await supabase.functions.invoke('homesage-full-report', {
            body: { 
              address: property.street_address,
              zipcode: property.zip
            }
          });

          if (response.error) {
            throw new Error(response.error.message);
          }

          const reportData = response.data?.report || response.data?.payload;
          
          setReports(prev => prev.map(r => 
            r.address_id === addressId 
              ? { ...r, report: reportData, status: 'completed' }
              : r
          ));
          
          completedCount++;
        } catch (error) {
          console.error(`Error generating report for ${addressId}:`, error);
          
          setReports(prev => prev.map(r => 
            r.address_id === addressId 
              ? { ...r, status: 'failed', error: error.message }
              : r
          ));
        }
        
        setProgress(((i + 1) / selectedProperties.length) * 100);
        
        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setCompleted(true);
      toast.success(`Report generation completed: ${completedCount} success, ${selectedProperties.length - completedCount} failed`);
      
    } catch (error) {
      console.error('Bulk report generation failed:', error);
      toast.error(`Bulk report generation failed: ${error.message}`);
    }

    setRunning(false);
    setCurrentProperty('');
  };

  const exportReportsToCSV = () => {
    const completedReports = reports.filter(r => r.status === 'completed' && r.report);
    
    if (completedReports.length === 0) {
      toast.error('No completed reports to export');
      return;
    }

    const csvData = completedReports.map(reportData => {
      const report = reportData.report;
      return {
        address_id: reportData.address_id,
        address: reportData.address,
        city: reportData.city,
        state: reportData.state,
        zip: reportData.zip,
        // Property details
        year_built: report?.property?.year_built || '',
        sqft: report?.property?.sqft || '',
        beds: report?.property?.beds || '',
        baths: report?.property?.baths || '',
        apn: report?.property?.apn || '',
        // Valuation
        avm_value: report?.valuation?.avm || '',
        valuation_low: report?.valuation?.low || '',
        valuation_high: report?.valuation?.high || '',
        valuation_confidence: report?.valuation?.confidence || '',
        forecast_12mo: report?.valuation?.forecast_12mo || '',
        // Renovation
        renovation_cost: report?.renovation?.est_cost || '',
        renovation_roi: report?.renovation?.roi || '',
        renovation_items_count: report?.renovation?.items?.length || 0,
        renovation_items: report?.renovation?.items?.map(item => 
          `${item.system}: $${item.cost} (${item.urgency})`
        ).join('; ') || '',
        // Signals
        price_flexibility: report?.signals?.price_flex || '',
        tlc_score: report?.signals?.tlc || '',
        condition_score: report?.signals?.condition_score || '',
        flip_return_potential: report?.signals?.flip_return || '',
      };
    });

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          const stringValue = String(value || '');
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bulk_property_reports_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${completedReports.length} property reports to CSV`);
  };

  const resetDialog = () => {
    setSelectedProperties([]);
    setRunning(false);
    setProgress(0);
    setCurrentProperty('');
    setReports([]);
    setCompleted(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetDialog();
    }
  };

  const successCount = reports.filter(r => r.status === 'completed').length;
  const failedCount = reports.filter(r => r.status === 'failed').length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bulk Property Reports
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!running && !completed && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Select Properties ({selectedProperties.length} of {eligibleProperties.length} selected)
                  </label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedProperties.length === eligibleProperties.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-sm">Select All</label>
                  </div>
                </div>
                
                <ScrollArea className="h-48 border rounded-md p-2">
                  <div className="space-y-2">
                    {eligibleProperties.map((property) => (
                      <div key={property.address_id} className="flex items-center space-x-2">
                        <Checkbox
                          id={property.address_id}
                          checked={selectedProperties.includes(property.address_id)}
                          onCheckedChange={(checked) => 
                            handleSelectProperty(property.address_id, checked as boolean)
                          }
                        />
                        <label 
                          htmlFor={property.address_id} 
                          className="text-sm flex-1 cursor-pointer"
                        >
                          {property.street_address}, {property.city}, {property.state} {property.zip}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Bulk Report Generation</p>
                    <p className="text-muted-foreground">
                      This will generate comprehensive property reports including valuations, 
                      renovation recommendations, and market signals. Each report may take 10-30 seconds.
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
                  <div className="text-lg font-bold text-green-600">{successCount}</div>
                  <div className="text-xs text-green-600">Completed</div>
                </div>
                <div className="bg-red-50 p-2 rounded">
                  <div className="text-lg font-bold text-red-600">{failedCount}</div>
                  <div className="text-xs text-red-600">Failed</div>
                </div>
              </div>
            </div>
          )}

          {completed && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800">Reports Generated!</h3>
                <p className="text-sm text-green-600">
                  {successCount} reports completed, {failedCount} failed
                </p>
              </div>

              {successCount > 0 && (
                <Button onClick={exportReportsToCSV} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export {successCount} Reports to CSV
                </Button>
              )}

              <ScrollArea className="h-32 border rounded-md p-2">
                <div className="space-y-1">
                  {reports.map((report) => (
                    <div key={report.address_id} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{report.address}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        report.status === 'completed' ? 'bg-green-100 text-green-800' :
                        report.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {running ? 'Close' : completed ? 'Done' : 'Cancel'}
            </Button>
            {!running && !completed && (
              <Button 
                onClick={generateReports} 
                disabled={selectedProperties.length === 0}
              >
                <Play className="h-4 w-4 mr-2" />
                Generate {selectedProperties.length} Reports
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}