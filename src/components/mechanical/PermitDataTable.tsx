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
  Search, MessageCircle, ChevronDown, ChevronUp, Send,
  AlertTriangle, AlertCircle, Info, CheckCircle,
  RefreshCcw, Home, TrendingUp, DollarSign
} from 'lucide-react';
import { type PermitRecord, type PermitSegment, generateChatDIYAlert } from '@/lib/mechanicalIntelligence';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface PermitDataTableProps {
  records: PermitRecord[];
  className?: string;
}

type SortField = 'riskScore' | 'systemAge' | 'address' | 'issueDate' | 'equityAtRisk';
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

const SEGMENT_CONFIG: Record<PermitSegment, { label: string; icon: typeof RefreshCcw; color: string }> = {
  replacement_wave: { 
    label: 'Replacement Wave', 
    icon: TrendingUp, 
    color: 'bg-orange-500/10 text-orange-700 border-orange-200 dark:text-orange-400' 
  },
  repair_loop: { 
    label: 'Repair Loop', 
    icon: RefreshCcw, 
    color: 'bg-purple-500/10 text-purple-700 border-purple-200 dark:text-purple-400' 
  },
  new_homeowner: { 
    label: 'New Homeowner', 
    icon: Home, 
    color: 'bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400' 
  },
  standard: { 
    label: 'Standard', 
    icon: Info, 
    color: 'bg-muted text-muted-foreground' 
  },
};

export function PermitDataTable({ records, className }: PermitDataTableProps) {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
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

    // Apply segment filter
    if (segmentFilter !== 'all') {
      filtered = filtered.filter(r => r.segment === segmentFilter);
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
        case 'equityAtRisk':
          comparison = a.equityAtRisk - b.equityAtRisk;
          break;
      }
      return sortDir === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [records, search, riskFilter, segmentFilter, sortField, sortDir]);

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

  const handleSendAlert = (record: PermitRecord) => {
    const alertText = generateChatDIYAlert(record);
    navigator.clipboard.writeText(alertText);
    toast.success('ChatDIY Alert copied to clipboard!', {
      description: 'Ready to send to homeowner',
    });
  };

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
            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by segment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                <SelectItem value="replacement_wave">Replacement Wave</SelectItem>
                <SelectItem value="repair_loop">Repair Loop</SelectItem>
                <SelectItem value="new_homeowner">New Homeowner</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
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
                  <TableHead>Segment</TableHead>
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
                    Risk <SortIcon field="riskScore" />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/80 transition-colors text-right"
                    onClick={() => handleSort('equityAtRisk')}
                  >
                    Equity at Risk <SortIcon field="equityAtRisk" />
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {search || riskFilter !== 'all' || segmentFilter !== 'all'
                        ? 'No matching records found' 
                        : 'Upload a CSV to see permit data'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map(record => {
                    const RiskIcon = RISK_ICONS[record.riskLevel];
                    const segmentConfig = SEGMENT_CONFIG[record.segment];
                    const SegmentIcon = segmentConfig.icon;
                    
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
                        <TableCell className="font-medium max-w-[180px] truncate">
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
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn('text-xs gap-1', segmentConfig.color)}
                          >
                            <SegmentIcon className="h-3 w-3" />
                            <span className="hidden lg:inline">{segmentConfig.label}</span>
                          </Badge>
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
                        <TableCell className="text-right">
                          <span className={cn(
                            'font-medium',
                            record.equityAtRisk >= 30000 && 'text-red-600 dark:text-red-400',
                            record.equityAtRisk >= 20000 && record.equityAtRisk < 30000 && 'text-orange-600 dark:text-orange-400'
                          )}>
                            ${record.equityAtRisk.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendAlert(record);
                            }}
                            className="gap-1"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Send Alert</span>
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
                <div>
                  <p className="text-muted-foreground">Segment</p>
                  <Badge variant="outline" className={cn('gap-1', SEGMENT_CONFIG[selectedRecord.segment].color)}>
                    {SEGMENT_CONFIG[selectedRecord.segment].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Equity at Risk</p>
                  <p className="font-bold text-lg text-red-600 dark:text-red-400">
                    ${selectedRecord.equityAtRisk.toLocaleString()}
                  </p>
                </div>
              </div>
              
              {selectedRecord.isRepairLoopCandidate && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-400 flex items-center gap-2">
                    <RefreshCcw className="h-4 w-4" />
                    Repair Loop Detected: {selectedRecord.repairLoopCount} permits on this folio
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                    This property is a prime candidate for a full system upgrade through a Habitta partner.
                  </p>
                </div>
              )}
              
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
                  handleSendAlert(selectedRecord);
                  setSelectedRecord(null);
                }}
              >
                <Send className="h-4 w-4" />
                Send ChatDIY Alert
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
                  className="flex-1 gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(generateChatDIYAlert(alertPreview));
                    toast.success('Alert copied to clipboard!');
                    setAlertPreview(null);
                  }}
                >
                  <Send className="h-4 w-4" />
                  Copy & Send
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
