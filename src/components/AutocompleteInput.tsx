import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Check, Loader2 } from 'lucide-react';
import { smartyAutocomplete } from '@/lib/smarty';
import { mapAutocompleteSuggestion } from '@/adapters/smartyMappers';

interface AutocompleteSuggestion {
  text: string;
  street_line: string;
  city: string;
  state: string;
  zipcode: string;
  secondary: string;
}

interface AutocompleteInputProps {
  onSelect: (suggestion: AutocompleteSuggestion) => void;
  placeholder?: string;
  className?: string;
}

export function AutocompleteInput({ onSelect, placeholder = "Enter address...", className }: AutocompleteInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [hasSelected, setHasSelected] = useState(false);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  
  const debounceRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.length < 3 || hasSelected) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await smartyAutocomplete({ search: query, limit: 8 });
        if (data?.errors?.length) {
          setBackendUnavailable(true);
          setSuggestions([]);
          setShowSuggestions(false);
          setSelectedIndex(-1);
        } else {
          setBackendUnavailable(false);
          const mappedSuggestions = (data?.suggestions || []).map(mapAutocompleteSuggestion);
          setSuggestions(mappedSuggestions);
          setShowSuggestions(true);
          setSelectedIndex(-1);
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
        setSuggestions([]);
        setBackendUnavailable(true);
      }
      setIsLoading(false);
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, hasSelected]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setHasSelected(false);
  };

  const handleSuggestionClick = (suggestion: AutocompleteSuggestion) => {
    setQuery(suggestion.text);
    setHasSelected(true);
    setShowSuggestions(false);
    onSelect(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => {
            if (suggestions.length > 0 && !hasSelected) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className={className}
        />
        {hasSelected && (
          <Badge 
            variant="secondary" 
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
          >
            <Check className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        )}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {backendUnavailable && (
        <p className="mt-2 text-xs text-muted-foreground">
          Autocomplete is temporarily unavailable. You can still enter your full address; we'll verify it when you add your home.
        </p>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="ghost"
              className={`w-full justify-start p-3 h-auto text-left ${
                index === selectedIndex ? 'bg-accent' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <MapPin className="w-4 h-4 mr-2 flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{suggestion.street_line}</div>
                <div className="text-sm text-muted-foreground">
                  {suggestion.city}, {suggestion.state} {suggestion.zipcode}
                </div>
              </div>
            </Button>
          ))}
        </Card>
      )}
    </div>
  );
}