import { useState, useCallback } from 'react';
import { Download, Brain, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PermitUploadZone } from '@/components/mechanical/PermitUploadZone';
import { PermitDataTable } from '@/components/mechanical/PermitDataTable';
import { RiskMapView } from '@/components/mechanical/RiskMapView';
import { type PermitRecord, exportHighRiskCSV } from '@/lib/mechanicalIntelligence';
import { toast } from 'sonner';

export default function MechanicalIntelligencePage() {
  const [records, setRecords] = useState<PermitRecord[]>([]);
  const [activeTab, setActiveTab] = useState('table');

  const handleExport = useCallback(() => {
    if (records.length === 0) {
      toast.error('No data to export');
      return;
    }

    const highRiskCount = records.filter(r => r.riskScore >= 60).length;
    if (highRiskCount === 0) {
      toast.info('No high-risk records to export (score >= 60)');
      return;
    }

    const csv = exportHighRiskCSV(records, 60);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `habitta-high-risk-leads-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${highRiskCount} high-risk leads`);
  }, [records]);

  // Calculate summary stats
  const stats = {
    total: records.length,
    critical: records.filter(r => r.riskLevel === 'critical').length,
    high: records.filter(r => r.riskLevel === 'high').length,
    avgAge: records.length > 0 
      ? (records.reduce((sum, r) => sum + r.systemAge, 0) / records.length).toFixed(1)
      : '0',
    brandsIdentified: records.filter(r => r.brand).length,
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Brain className="h-7 w-7 md:h-8 md:w-8 text-primary" />
            Mechanical Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            HVAC Lead Scoring & Failure Risk Analysis
          </p>
        </div>
        
        {records.length > 0 && (
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export High-Risk Leads
          </Button>
        )}
      </div>

      {/* Upload Zone */}
      <PermitUploadZone onDataProcessed={setRecords} />

      {/* Stats Cards */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Permits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Critical Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Avg System Age
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.avgAge} <span className="text-sm font-normal">yrs</span></p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />
                Brands Identified
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {stats.brandsIdentified}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  ({Math.round((stats.brandsIdentified / stats.total) * 100)}%)
                </span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Views */}
      {records.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="table">Table View</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="table" className="mt-4">
            <PermitDataTable records={records} />
          </TabsContent>
          
          <TabsContent value="map" className="mt-4">
            <RiskMapView records={records} />
          </TabsContent>
        </Tabs>
      )}

      {/* Empty state info */}
      {records.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">The Habitta Brain</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto mt-2">
                  Upload a Miami-Dade building permit CSV to activate intelligent HVAC analysis. 
                  Our heuristic engine identifies brands, calculates system ages, and predicts 
                  failure risks based on contractor patterns and work descriptions.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mt-6 text-sm">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">Brand Detection</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Maps contractors to HVAC brands (Ameri Temp → Carrier)
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">Age Analysis</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Calculates system age from permit issue dates
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">Risk Scoring</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    0-100 score based on age, brand, and work type
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
