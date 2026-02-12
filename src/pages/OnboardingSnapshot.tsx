import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertTriangle, MapPin, Home, Wrench } from "lucide-react";

interface OnboardingData {
  home: any;
  normalizedAddress: any;
  roofAnalysis: any;
  planCards: any[];
  unknowns: string[];
}

export default function OnboardingSnapshot() {
  const navigate = useNavigate();
  const [data, setData] = useState<OnboardingData | null>(null);

  useEffect(() => {
    const storedData = sessionStorage.getItem('onboardingData');
    if (storedData) {
      setData(JSON.parse(storedData));
    } else {
      // No onboarding data, redirect to start
      navigate('/onboarding/start');
    }
  }, [navigate]);

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'WATCH':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'EOL':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Wrench className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK':
        return 'bg-green-100 text-green-800';
      case 'WATCH':
        return 'bg-yellow-100 text-yellow-800';
      case 'EOL':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Home className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Property Analysis</h1>
          <p className="text-muted-foreground">Here's what we found about your home</p>
        </div>

        {/* Address Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Verified Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium">
                {data.normalizedAddress.address}
              </p>
              <p className="text-muted-foreground">
                {data.normalizedAddress.city}, {data.normalizedAddress.state} {data.normalizedAddress.zip_code}
              </p>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">Address verified</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Confidence Score */}
        <Card>
          <CardHeader>
            <CardTitle>Home Profile Record Strength</CardTitle>
            <CardDescription>
              How well-documented your property is
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Record Strength</span>
                <span>{Math.round(data.home.confidence * 100)}%</span>
              </div>
              <Progress value={data.home.confidence * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                We'll boost this as you provide more details
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Roof Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(data.roofAnalysis.status)}
              Roof Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <Badge className={getStatusColor(data.roofAnalysis.status)}>
                  {data.roofAnalysis.status}
                </Badge>
              </div>
              {data.roofAnalysis.installYear && (
                <div className="flex items-center justify-between">
                  <span>Install Year</span>
                  <span>{data.roofAnalysis.installYear}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>Data Source</span>
                <span className="capitalize">{data.roofAnalysis.installSource}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan Cards */}
        {data.planCards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Initial Recommendations</CardTitle>
              <CardDescription>
                Based on your property analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.planCards.map((card, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{card.title}</h4>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                        {card.estimated_cost_min && (
                          <p className="text-xs text-muted-foreground">
                            Est. ${card.estimated_cost_min} - ${card.estimated_cost_max}
                          </p>
                        )}
                      </div>
                      <Badge variant={card.priority === 'NOW' ? 'destructive' : 'secondary'}>
                        {card.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Continue Button */}
        <div className="text-center space-y-4">
          <Button 
            onClick={() => navigate('/onboarding/unknowns')}
            className="w-full max-w-sm"
          >
            Continue Setup
          </Button>
          <p className="text-sm text-muted-foreground">
            Next: Tell us about your home systems
          </p>
        </div>
      </div>
    </div>
  );
}