import { useState, useMemo } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Search, MessageCircle, ChevronDown, ChevronUp, 
  AlertTriangle, AlertCircle, Info, CheckCircle 
} from 'lucide-react';
import { type PermitRecord, generateChatDIYAlert } from '@/lib/mechanicalIntelligence';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface PermitDataTableProps {
  records: PermitRecord[];
  className?: string;
}

type SortField = 'riskScore' | 'systemAge' | 'address' | 'issueDate';
type SortDir = 'asc' | 'desc';

const RISK_ICONS = {
  critical: AlertTriangle,
  high: AlertCircle,
  medium: Info,
  low: CheckCircle,
};

const RISK_COLORS = {
  critical: 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-400',
  high: 'bg-orange-500/10 text-orange-700 border-orange-200 dark:text-orange-400',
  medium: 'bg-yellow-500/10 text-yellow-700 border-yellow-200 dark:text-yellow-400',
  low: 'bg-green-500/10 text-green-700 border-green-200 dark:text-green-400',
};

export function PermitDataTable({ records, className }: PermitDataTableProps) {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('riskScore');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedRecord, setSelectedRecord] = useState<PermitRecord | null>(null);
  const [alertPreview, setAlertPreview] = useState<PermitRecord | null>(null);

  const filteredRecords = useMemo(() => {
    let filtered = [...records];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(r => 
        r.address.toLowerCase().includes(searchLower) ||
        r.contractorName.toLowerCase().includes(searchLower) ||
        r.workDescription.toLowerCase().includes(searchLower) ||
        r.brand?.toLowerCase().includes(searchLower) ||
        r.folioNumber.toLowerCase().includes(searchLower)
      );
    }

    // Apply risk filter
    if (riskFilter !== 'all') {
      filtered = filtered.filter(r => r.riskLevel === riskFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'riskScore':
          comparison = a.riskScore - b.riskScore;
          break;
        case 'systemAge':
          comparison = a.systemAge - b.systemAge;
          break;
        case 'address':
          comparison = a.address.localeCompare(b.address);
          break;
        case 'issueDate':
          comparison = new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
          break;
      }
      return sortDir === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [records, search, riskFilter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'desc' ? 
      <ChevronDown className="h-3 w-3 inline ml-1" /> : 
      <ChevronUp className="h-3 w-3 inline ml-1" />;
  };

  const stats = useMemo(() => ({
    critical: records.filter(r => r.riskLevel === 'critical').length,
    high: records.filter(r => r.riskLevel === 'high').length,
    medium: records.filter(r => r.riskLevel === 'medium').length,
    low: records.filter(r => r.riskLevel === 'low').length,
  }), [records]);

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg">Permit Risk Analysis</CardTitle>
            
            {/* Stats pills */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {stats.critical} Critical
              </Badge>
              <Badge className="bg-orange-500 hover:bg-orange-600 gap-1">
                <AlertCircle className="h-3 w-3" /> {stats.high} High
              </Badge>
              <Badge className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950 gap-1">
                <Info className="h-3 w-3" /> {stats.medium} Medium
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="h-3 w-3" /> {stats.low} Low
              </Badge>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search address, contractor, brand..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Filter by risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risks</SelectItem>
                <SelectItem value="critical">Critical Only</SelectItem>
                <SelectItem value="high">High Only</SelectItem>
                <SelectItem value="medium">Medium Only</SelectItem>
                <SelectItem value="low">Low Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('address')}
                  >
                    Address <SortIcon field="address" />
                  </TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/80 transition-colors text-right"
                    onClick={() => handleSort('systemAge')}
                  >
                    Age <SortIcon field="systemAge" />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/80 transition-colors text-center"
                    onClick={() => handleSort('riskScore')}
                  >
                    Risk Score <SortIcon field="riskScore" />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('issueDate')}
                  >
                    Issue Date <SortIcon field="issueDate" />
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {search || riskFilter !== 'all' 
                        ? 'No matching records found' 
                        : 'Upload a CSV to see permit data'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map(record => {
                    const RiskIcon = RISK_ICONS[record.riskLevel];
                    return (
                      <TableRow 
                        key={record.id}
                        className={cn(
                          'cursor-pointer transition-colors',
                          record.riskLevel === 'critical' && 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30',
                          record.riskLevel === 'high' && 'bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/30'
                        )}
                        onClick={() => setSelectedRecord(record)}
                      >
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {record.address}
                        </TableCell>
                        <TableCell>
                          {record.brand ? (
                            <Badge variant="outline" className="text-xs">
                              {record.brand}
                              {record.brandConfidence === 'high' && ' ✓'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {record.systemAge.toFixed(1)} yrs
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1.5">
                            <Badge className={cn('gap-1', RISK_COLORS[record.riskLevel])}>
                              <RiskIcon className="h-3 w-3" />
                              {record.riskScore}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(record.issueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAlertPreview(record);
                            }}
                            className="gap-1"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">ChatDIY</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          {filteredRecords.length > 0 && (
            <div className="p-4 border-t text-sm text-muted-foreground">
              Showing {filteredRecords.length} of {records.length} records
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Detail Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Permit Details</DialogTitle>
            <DialogDescription className="break-words">
              {selectedRecord?.address}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Folio Number</p>
                  <p className="font-medium">{selectedRecord.folioNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Issue Date</p>
                  <p className="font-medium">
                    {new Date(selectedRecord.issueDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Brand</p>
                  <p className="font-medium">
                    {selectedRecord.brand || 'Unknown'} 
                    {selectedRecord.brandConfidence === 'high' && ' (High Confidence)'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">System Age</p>
                  <p className="font-medium">{selectedRecord.systemAge.toFixed(1)} years</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contractor</p>
                  <p className="font-medium">{selectedRecord.contractorName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Risk Score</p>
                  <Badge className={RISK_COLORS[selectedRecord.riskLevel]}>
                    {selectedRecord.riskScore}/100 - {selectedRecord.riskLevel.toUpperCase()}
                  </Badge>
                </div>
              </div>
              
              <div>
                <p className="text-muted-foreground text-sm mb-1">Work Description</p>
                <p className="text-sm bg-muted p-3 rounded-md">
                  {selectedRecord.workDescription}
                </p>
              </div>
              
              {selectedRecord.riskFactors.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-sm mb-2">Risk Factors</p>
                  <ul className="space-y-1">
                    {selectedRecord.riskFactors.map((factor, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <Button 
                className="w-full gap-2"
                onClick={() => {
                  setAlertPreview(selectedRecord);
                  setSelectedRecord(null);
                }}
              >
                <MessageCircle className="h-4 w-4" />
                Generate ChatDIY Alert
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ChatDIY Alert Preview Dialog */}
      <Dialog open={!!alertPreview} onOpenChange={() => setAlertPreview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              ChatDIY Alert Preview
            </DialogTitle>
          </DialogHeader>
          
          {alertPreview && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm leading-relaxed">
                  {generateChatDIYAlert(alertPreview)}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setAlertPreview(null)}>
                  Close
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(generateChatDIYAlert(alertPreview));
                    setAlertPreview(null);
                  }}
                >
                  Copy Alert
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
