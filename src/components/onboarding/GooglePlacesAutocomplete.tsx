import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PlacePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

interface PlaceDetails {
  place_id: string;
  formatted_address: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  county: string;
  country: string;
  lat: number;
  lng: number;
  components: any[];
  geometry: any;
}

interface GooglePlacesAutocompleteProps {
  onSelect: (details: PlaceDetails) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function GooglePlacesAutocomplete({
  onSelect,
  placeholder = "Start typing your address...",
  disabled = false,
}: GooglePlacesAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken] = useState(() => crypto.randomUUID());
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Fetch predictions with debounce
  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('google-places-autocomplete', {
        body: { input, sessionToken },
      });

      if (error) throw error;
      
      setPredictions(data.predictions || []);
      setShowDropdown(true);
    } catch (err: any) {
      console.error('[GooglePlacesAutocomplete] Error:', err);
      setError('Unable to fetch address suggestions');
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken]);

  // Handle input change with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, fetchPredictions]);

  // Fetch place details on selection
  const handleSelect = async (prediction: PlacePrediction) => {
    setIsFetchingDetails(true);
    setQuery(prediction.description);
    setShowDropdown(false);
    setPredictions([]);

    try {
      const { data, error } = await supabase.functions.invoke('google-places-details', {
        body: { place_id: prediction.place_id, sessionToken },
      });

      if (error) throw error;
      
      onSelect(data);
    } catch (err: any) {
      console.error('[GooglePlacesAutocomplete] Details error:', err);
      setError('Unable to verify address');
    } finally {
      setIsFetchingDetails(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && predictions[selectedIndex]) {
          handleSelect(predictions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => predictions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          disabled={disabled || isFetchingDetails}
          className="pl-10 pr-10 h-12 text-base"
          autoComplete="off"
        />
        {(isLoading || isFetchingDetails) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}

      {showDropdown && predictions.length > 0 && (
        <Card
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 max-h-60 overflow-auto shadow-lg border"
        >
          <ul className="py-1">
            {predictions.map((prediction, index) => (
              <li
                key={prediction.place_id}
                className={`px-4 py-3 cursor-pointer flex items-start gap-3 transition-colors ${
                  index === selectedIndex 
                    ? 'bg-accent' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleSelect(prediction)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {prediction.main_text}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {prediction.secondary_text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
