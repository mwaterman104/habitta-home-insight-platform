import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface HVACAgePickerProps {
  onSelect: (ageBand: string | null) => void;
  selectedValue?: string | null;
}

const AGE_OPTIONS = [
  { value: '0-5', label: 'Less than 5 years', years: 2.5 },
  { value: '5-10', label: '5–10 years', years: 7.5 },
  { value: '10-15', label: '10–15 years', years: 12.5 },
  { value: '15+', label: '15+ years', years: 18 },
  { value: 'unknown', label: 'Not sure', years: null },
];

export function HVACAgePicker({ onSelect, selectedValue }: HVACAgePickerProps) {
  const [selected, setSelected] = useState<string | null>(selectedValue || null);

  const handleChange = (value: string) => {
    setSelected(value);
    onSelect(value === 'unknown' ? null : value);
  };

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardContent className="p-0">
        <RadioGroup
          value={selected || ''}
          onValueChange={handleChange}
          className="space-y-3"
        >
          {AGE_OPTIONS.map((option) => (
            <div key={option.value}>
              <Label
                htmlFor={option.value}
                className={`
                  flex items-center gap-3 p-4 rounded-xl border cursor-pointer
                  transition-all duration-200
                  ${selected === option.value 
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                    : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/50'
                  }
                `}
              >
                <RadioGroupItem 
                  value={option.value} 
                  id={option.value}
                  className="shrink-0"
                />
                <span className="text-base">
                  {option.label}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

export { AGE_OPTIONS };
