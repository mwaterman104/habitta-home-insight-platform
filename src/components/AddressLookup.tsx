import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { validateAddress } from '@/lib/validation';
import { getPropertyHistory, PropertyHistory } from '@/lib/propertyAPI';
import { useToast } from '@/hooks/use-toast';

interface AddressLookupProps {
  onSelect: (propertyData: PropertyHistory) => void;
}

const AddressLookup: React.FC<AddressLookupProps> = ({ onSelect }) => {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleSearch = async () => {
    setError('');
    
    const validation = validateAddress(address);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid address');
      return;
    }

    setIsLoading(true);
    
    try {
      const propertyData = await getPropertyHistory(address);
      onSelect(propertyData);
      toast({
        title: "Property Found",
        description: `Successfully loaded data for ${address}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch property data';
      setError(errorMessage);
      toast({
        title: "Search Failed", 
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Property Lookup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="Enter property address..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className={error ? 'border-danger' : ''}
          />
          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}
        </div>
        
        <Button 
          onClick={handleSearch}
          disabled={isLoading || !address.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Search Property
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AddressLookup;