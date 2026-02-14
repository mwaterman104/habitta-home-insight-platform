import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Target, DollarSign, Wrench, Sparkles } from "lucide-react";

interface OnboardingData {
  home: any;
  confidence: number;
}

export default function OnboardingPersonalization() {
  const navigate = useNavigate();
  const [data, setData] = useState<OnboardingData | null>(null);
  const [goals, setGoals] = useState<string[]>([]);

  useEffect(() => {
    const storedData = sessionStorage.getItem('onboardingData');
    if (storedData) {
      setData(JSON.parse(storedData));
    } else {
      navigate('/onboarding');
    }
  }, [navigate]);

  const handleGoalToggle = (goal: string) => {
    setGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const handleContinue = () => {
    // Store final goals and redirect to dashboard
    if (data) {
      const finalData = {
        ...data,
        goals
      };
      sessionStorage.setItem('onboardingData', JSON.stringify(finalData));
    }
    
    // Clear onboarding data and go to dashboard
    sessionStorage.removeItem('onboardingData');
    navigate('/dashboard');
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  const goalOptions = [
    {
      id: 'selling',
      title: 'Preparing to sell',
      description: 'Planning to sell in the next 2-3 years',
      icon: <DollarSign className="w-5 h-5" />
    },
    {
      id: 'energy',
      title: 'Energy efficiency',
      description: 'Focused on reducing utility bills',
      icon: <Sparkles className="w-5 h-5" />
    },
    {
      id: 'maintenance',
      title: 'Preventive maintenance',
      description: 'Keep everything in good working order',
      icon: <Wrench className="w-5 h-5" />
    },
    {
      id: 'upgrades',
      title: 'Home improvements',
      description: 'Planning renovations and upgrades',
      icon: <Target className="w-5 h-5" />
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">What Are Your Goals?</h1>
          <p className="text-muted-foreground">
            Help us personalize your experience (select all that apply)
          </p>
        </div>

        {/* Updated Confidence Score */}
        <Card>
          <CardHeader>
            <CardTitle>Property Profile Complete</CardTitle>
            <CardDescription>
              Your confidence score has improved!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Home Profile Record Strength</span>
                <span>{Math.round((data.confidence || 0.7) * 100)}%</span>
              </div>
              <Progress value={(data.confidence || 0.7) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Great! We have enough information to create your personalized dashboard
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Goals Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Your Home Ownership Goals</CardTitle>
            <CardDescription>
              This helps us prioritize recommendations for you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {goalOptions.map((option) => (
                <div
                  key={option.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleGoalToggle(option.id)}
                >
                  <Checkbox
                    id={option.id}
                    checked={goals.includes(option.id)}
                    onChange={() => {}} // Handled by parent onClick
                  />
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="mt-0.5">
                      {option.icon}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={option.id} className="font-medium cursor-pointer">
                        {option.title}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Continue Button */}
        <div className="text-center space-y-4">
          <Button 
            onClick={handleContinue}
            className="w-full max-w-sm"
          >
            Complete Setup
          </Button>
          <p className="text-sm text-muted-foreground">
            Ready to explore your personalized property dashboard!
          </p>
        </div>
      </div>
    </div>
  );
}