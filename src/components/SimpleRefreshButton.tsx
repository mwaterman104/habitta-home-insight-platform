import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SimpleRefreshButtonProps {
  onRefresh: () => Promise<void>;
  loading: boolean;
  className?: string;
}

export const SimpleRefreshButton: React.FC<SimpleRefreshButtonProps> = ({
  onRefresh,
  loading,
  className = ''
}) => {
  const { toast } = useToast();

  const handleRefresh = async () => {
    try {
      await onRefresh();
      toast({
        title: 'Property Data Refreshed',
        description: 'Latest property information has been loaded from Attom.',
      });
    } catch (error: any) {
      toast({
        title: 'Refresh Failed',
        description: error.message || 'Failed to refresh property data.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      Refresh Data
    </Button>
  );
};