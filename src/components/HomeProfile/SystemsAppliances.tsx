import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Thermometer, Droplets, Refrigerator, Zap, Home, Wrench } from 'lucide-react';

interface SystemItem {
  key: string;
  currentScore: number;
  status: 'green' | 'yellow' | 'red';
  efficiency?: string;
  condition?: string;
  lastService?: string;
}

const systemIcons: Record<string, React.ComponentType<any>> = {
  hvac: Thermometer,
  water: Droplets,
  appliances: Refrigerator,
  electrical: Zap,
  roof: Home,
  plumbing: Wrench
};

const systemLabels: Record<string, string> = {
  hvac: 'HVAC System',
  water: 'Water Heater',
  appliances: 'Refrigerator',
  electrical: 'Electrical',
  roof: 'Roof',
  plumbing: 'Plumbing'
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'green': return 'default';
    case 'yellow': return 'secondary';
    case 'red': return 'destructive';
    default: return 'outline';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'green': return 'Good';
    case 'yellow': return 'Fair';
    case 'red': return 'Poor';
    default: return 'Unknown';
  }
};

interface SystemsAppliancesProps {
  systems: SystemItem[];
}

export const SystemsAppliances: React.FC<SystemsAppliancesProps> = ({ systems }) => {
  // Show only first 3 systems initially
  const visibleSystems = systems.slice(0, 3);

  const getInstallationInfo = (system: SystemItem) => {
    // Mock installation years based on system type
    const installYears: Record<string, number> = {
      hvac: 2018,
      water: 2021,
      appliances: 2020
    };
    
    const installYear = installYears[system.key];
    if (installYear) {
      const age = new Date().getFullYear() - installYear;
      return `Installed: ${installYear} (${age} yrs old)`;
    }
    return 'Installation date not available';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Systems & Appliances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleSystems.map((system) => {
          const Icon = systemIcons[system.key] || Home;
          const label = systemLabels[system.key] || system.key;
          
          return (
            <div key={system.key} className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center space-x-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h4 className="font-medium">{label}</h4>
                  <p className="text-sm text-muted-foreground">
                    {getInstallationInfo(system)}
                  </p>
                </div>
              </div>
              <Badge variant={getStatusVariant(system.status)}>
                {getStatusLabel(system.status)}
              </Badge>
            </div>
          );
        })}
        
        <div className="pt-4 border-t border-border">
          <Button variant="outline" className="w-full">
            View All Systems
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};