import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Thermometer, Droplets, Zap, Loader2 } from "lucide-react";

interface SystemInfo {
  installYear?: number;
  type?: string;
  dontKnow: boolean;
}

interface OnboardingData {
  home: any;
}

export default function OnboardingUnknowns() {
  const navigate = useNavigate();
  const [data, setData] = useState<OnboardingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [systems, setSystems] = useState<Record<string, SystemInfo>>({
    HVAC: { dontKnow: false },
    WATER_HEATER: { dontKnow: false },
    SMART_DEVICES: { dontKnow: false }
  });

  useEffect(() => {
    const storedData = sessionStorage.getItem('onboardingData');
    if (storedData) {
      setData(JSON.parse(storedData));
    } else {
      navigate('/onboarding');
    }
  }, [navigate]);

  const handleSystemChange = (systemKind: string, field: string, value: any) => {
    setSystems(prev => ({
      ...prev,
      [systemKind]: {
        ...prev[systemKind],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    setIsLoading(true);

    try {
      const { data: result, error } = await supabase.functions.invoke('onboarding-unknowns', {
        body: {
          homeId: data.home.id,
          systems
        }
      });

      if (error) {
        console.error('Onboarding unknowns error:', error);
        toast.error('Failed to save system information');
        return;
      }

      if (result.success) {
        // Update stored data with new confidence score
        const updatedData = {
          ...data,
          confidence: result.confidence,
          systems: result.systems,
          planCards: result.planCards
        };
        sessionStorage.setItem('onboardingData', JSON.stringify(updatedData));
        navigate('/onboarding/personalization');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const getSystemIcon = (systemKind: string) => {
    switch (systemKind) {
      case 'HVAC':
        return <Thermometer className="w-5 h-5" />;
      case 'WATER_HEATER':
        return <Droplets className="w-5 h-5" />;
      case 'SMART_DEVICES':
        return <Zap className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getSystemTitle = (systemKind: string) => {
    switch (systemKind) {
      case 'HVAC':
        return 'Heating & Cooling';
      case 'WATER_HEATER':
        return 'Water Heater';
      case 'SMART_DEVICES':
        return 'Smart Devices';
      default:
        return systemKind;
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Tell Us About Your Systems</h1>
          <p className="text-muted-foreground">
            Help us understand your home better with a few quick questions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {Object.entries(systems).map(([systemKind, systemInfo]) => (
            <Card key={systemKind}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getSystemIcon(systemKind)}
                  {getSystemTitle(systemKind)}
                </CardTitle>
                <CardDescription>
                  {systemKind === 'HVAC' && "Your heating and cooling system"}
                  {systemKind === 'WATER_HEATER' && "Your hot water system"}
                  {systemKind === 'SMART_DEVICES' && "Smart home technology"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${systemKind}-unknown`}
                    checked={systemInfo.dontKnow}
                    onCheckedChange={(checked) =>
                      handleSystemChange(systemKind, 'dontKnow', checked)
                    }
                  />
                  <Label htmlFor={`${systemKind}-unknown`}>
                    I don't know these details
                  </Label>
                </div>

                {!systemInfo.dontKnow && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${systemKind}-year`}>Install Year</Label>
                      <Input
                        id={`${systemKind}-year`}
                        type="number"
                        placeholder="2020"
                        min="1950"
                        max={new Date().getFullYear()}
                        value={systemInfo.installYear || ''}
                        onChange={(e) =>
                          handleSystemChange(systemKind, 'installYear', parseInt(e.target.value))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${systemKind}-type`}>Type</Label>
                      <Select
                        value={systemInfo.type || ''}
                        onValueChange={(value) =>
                          handleSystemChange(systemKind, 'type', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {systemKind === 'HVAC' && (
                            <>
                              <SelectItem value="central-air">Central Air</SelectItem>
                              <SelectItem value="heat-pump">Heat Pump</SelectItem>
                              <SelectItem value="split-system">Split System</SelectItem>
                              <SelectItem value="window-unit">Window Units</SelectItem>
                            </>
                          )}
                          {systemKind === 'WATER_HEATER' && (
                            <>
                              <SelectItem value="tank-gas">Tank (Gas)</SelectItem>
                              <SelectItem value="tank-electric">Tank (Electric)</SelectItem>
                              <SelectItem value="tankless-gas">Tankless (Gas)</SelectItem>
                              <SelectItem value="tankless-electric">Tankless (Electric)</SelectItem>
                            </>
                          )}
                          {systemKind === 'SMART_DEVICES' && (
                            <>
                              <SelectItem value="thermostat">Smart Thermostat</SelectItem>
                              <SelectItem value="solar">Solar Panels</SelectItem>
                              <SelectItem value="leak-sensors">Leak Sensors</SelectItem>
                              <SelectItem value="security">Security System</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}