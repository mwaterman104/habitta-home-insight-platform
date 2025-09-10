import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, DollarSign, Building2, Loader2, Download } from 'lucide-react';
import { getPermits, syncPermitsData, Permit } from '@/lib/permitAPI';
import { useToast } from '@/hooks/use-toast';

interface PermitsHistoryProps {
  homeId: string;
  address: string;
}

export const PermitsHistory: React.FC<PermitsHistoryProps> = ({
  homeId,
  address
}) => {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPermits();
  }, [homeId]);

  const loadPermits = async () => {
    try {
      setLoading(true);
      const data = await getPermits(homeId);
      setPermits(data);
    } catch (error: any) {
      console.error('Error loading permits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncPermits = async () => {
    try {
      setSyncing(true);
      const result = await syncPermitsData(address, homeId);
      
      toast({
        title: "Permits Synced",
        description: result.message,
        variant: "default",
      });
      
      // Reload permits after sync
      await loadPermits();
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message || "Could not sync permit data from Shovels.ai",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'issued':
        return 'bg-green-100 text-green-800';
      case 'finaled':
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Permits & Construction History ({permits.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncPermits}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {syncing ? 'Syncing...' : 'Sync from Shovels'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : permits.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Permits Found</h3>
            <p className="text-muted-foreground mb-4">
              Click "Sync from Shovels" to load permit history for this property.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {permits.map((permit) => (
              <div key={permit.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">
                      {permit.permit_type || 'Unknown Permit Type'}
                    </h4>
                    {permit.permit_number && (
                      <p className="text-sm text-muted-foreground">
                        Permit #{permit.permit_number}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {permit.is_energy_related && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Energy Related
                      </Badge>
                    )}
                    <Badge className={getStatusColor(permit.status)}>
                      {permit.status || 'Unknown'}
                    </Badge>
                  </div>
                </div>

                {permit.description && (
                  <p className="text-sm mb-3 text-muted-foreground">
                    {permit.description}
                  </p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">Issued:</span>
                    <span>{formatDate(permit.date_issued)}</span>
                  </div>
                  
                  {permit.date_finaled && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">Finaled:</span>
                      <span>{formatDate(permit.date_finaled)}</span>
                    </div>
                  )}

                  {permit.valuation && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">Value:</span>
                      <span>{formatCurrency(permit.valuation)}</span>
                    </div>
                  )}

                  {permit.contractor_name && (
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">Contractor:</span>
                      <span className="truncate">{permit.contractor_name}</span>
                    </div>
                  )}
                </div>

                {permit.system_tags && permit.system_tags.length > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-sm font-medium">Systems:</span>
                    <div className="flex flex-wrap gap-1">
                      {permit.system_tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};