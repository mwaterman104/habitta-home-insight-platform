/**
 * OnboardingComplete
 * 
 * Closure screen — seals trust and transitions to stewardship.
 * This is the emotional and cognitive closure moment.
 * 
 * "Your home is now under watch."
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Check, ArrowRight } from "lucide-react";

interface OnboardingCompleteProps {
  onContinue: () => void;
}

const BENEFITS = [
  'System wear is tracked quietly in the background',
  'Climate stress is factored automatically',
  "You'll see issues early — not when they become urgent",
];

export function OnboardingComplete({ onContinue }: OnboardingCompleteProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="pt-8 pb-6 space-y-6 text-center">
        {/* Shield icon — represents protection/stewardship */}
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        
        {/* Main headline */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Your home is now under watch.</h1>
        </div>
        
        {/* Benefit bullets */}
        <ul className="text-left space-y-3 text-sm text-muted-foreground">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
        
        {/* Thesis statement — immutable, this is the product's soul */}
        <blockquote className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-4 text-left">
          Most home issues don't happen suddenly. They build quietly.
          <br />
          Habitta exists to notice them early.
        </blockquote>
        
        {/* Primary CTA */}
        <Button onClick={onContinue} className="w-full h-12 text-base" size="lg">
          Go to Home Pulse
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
