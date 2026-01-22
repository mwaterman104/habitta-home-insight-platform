/**
 * CriticalSystemsStep
 * 
 * Onboarding step to gather system replacement info for Roof, Water Heater, HVAC.
 * Uses consistent binary-first pattern for all systems.
 * 
 * Title: "Tell us about your home's major systems"
 * Subtext: "This improves accuracy. Skip anything you're unsure about."
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, HelpCircle, X, Home, Flame, Droplet, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type ReplacementChoice = 'replaced' | 'unknown' | 'original' | null;

interface SystemAnswer {
  choice: ReplacementChoice;
  year?: number;
}

interface CriticalSystemsStepProps {
  yearBuilt?: number;
  onComplete: (systems: {
    roof?: SystemAnswer;
    water_heater?: SystemAnswer;
    hvac?: SystemAnswer;
  }) => void;
  onSkip?: () => void;
  isSubmitting?: boolean;
}

const SYSTEMS = [
  { key: 'roof', label: 'Roof', icon: Home },
  { key: 'water_heater', label: 'Water Heater', icon: Droplet },
  { key: 'hvac', label: 'HVAC', icon: Flame },
] as const;

type SystemKey = typeof SYSTEMS[number]['key'];

export function CriticalSystemsStep({
  yearBuilt,
  onComplete,
  onSkip,
  isSubmitting = false,
}: CriticalSystemsStepProps) {
  const [answers, setAnswers] = useState<Record<SystemKey, SystemAnswer>>({
    roof: { choice: null },
    water_heater: { choice: null },
    hvac: { choice: null },
  });
  const [currentSystem, setCurrentSystem] = useState<SystemKey | null>(null);
  const [yearInput, setYearInput] = useState('');

  const currentYear = new Date().getFullYear();

  const handleChoice = (system: SystemKey, choice: ReplacementChoice) => {
    if (choice === 'replaced') {
      setCurrentSystem(system);
      setYearInput('');
    } else {
      setAnswers(prev => ({
        ...prev,
        [system]: { choice, year: choice === 'original' ? yearBuilt : undefined },
      }));
    }
  };

  const handleYearSubmit = () => {
    if (!currentSystem || !yearInput) return;
    
    const year = parseInt(yearInput, 10);
    if (isNaN(year) || year < 1900 || year > currentYear) return;

    setAnswers(prev => ({
      ...prev,
      [currentSystem]: { choice: 'replaced', year },
    }));
    setCurrentSystem(null);
    setYearInput('');
  };

  const handleContinue = () => {
    // Filter out nulls and build response
    const result: Record<string, SystemAnswer> = {};
    for (const [key, answer] of Object.entries(answers)) {
      if (answer.choice !== null) {
        result[key] = answer;
      }
    }
    onComplete(result);
  };

  const completedCount = Object.values(answers).filter(a => a.choice !== null).length;
  const canContinue = completedCount > 0;

  // Year input modal for a specific system
  if (currentSystem) {
    const systemInfo = SYSTEMS.find(s => s.key === currentSystem);
    const Icon = systemInfo?.icon || Home;
    
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">When was the {systemInfo?.label.toLowerCase()} replaced?</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              placeholder="e.g. 2018"
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
              min={yearBuilt || 1900}
              max={currentYear}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Enter the approximate year if you're not sure of the exact date.
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setCurrentSystem(null)}
            >
              Back
            </Button>
            <Button 
              onClick={handleYearSubmit}
              disabled={!yearInput}
              className="flex-1"
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Tell us about your home's major systems</CardTitle>
        <CardDescription>
          This improves accuracy. Skip anything you're unsure about.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {SYSTEMS.map(({ key, label, icon: Icon }) => {
          const answer = answers[key];
          const isAnswered = answer.choice !== null;
          
          return (
            <div key={key} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  isAnswered ? "bg-green-100" : "bg-muted"
                )}>
                  <Icon className={cn(
                    "h-4 w-4",
                    isAnswered ? "text-green-600" : "text-muted-foreground"
                  )} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{label}</p>
                  {isAnswered && (
                    <p className="text-xs text-muted-foreground">
                      {answer.choice === 'replaced' && answer.year 
                        ? `Replaced in ${answer.year}`
                        : answer.choice === 'original'
                        ? 'Original system'
                        : 'Not sure'
                      }
                    </p>
                  )}
                </div>
                {isAnswered && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAnswers(prev => ({ ...prev, [key]: { choice: null } }))}
                    className="text-muted-foreground text-xs"
                  >
                    Change
                  </Button>
                )}
              </div>
              
              {!isAnswered && (
                <div className="grid grid-cols-3 gap-2 pl-11">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => handleChoice(key, 'replaced')}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Replaced
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => handleChoice(key, 'unknown')}
                  >
                    <HelpCircle className="h-3 w-3 mr-1" />
                    Not sure
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => handleChoice(key, 'original')}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Original
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        <div className="flex gap-3 pt-4 border-t">
          {onSkip && (
            <Button
              variant="ghost"
              onClick={onSkip}
              disabled={isSubmitting}
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
          )}
          <Button
            onClick={handleContinue}
            disabled={isSubmitting || !canContinue}
            className="flex-1"
          >
            {isSubmitting ? 'Saving...' : (
              <>
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
        
        {completedCount === 0 && (
          <p className="text-xs text-center text-muted-foreground">
            Answer at least one to continue, or skip to use estimates
          </p>
        )}
      </CardContent>
    </Card>
  );
}
