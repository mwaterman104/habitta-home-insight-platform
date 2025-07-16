import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PropertyHistory } from '@/lib/propertyAPI';
import { Permit } from '@/lib/permitAPI';
import { 
  Zap, 
  Thermometer, 
  Wind, 
  Sun, 
  Lightbulb,
  TrendingUp
} from 'lucide-react';

interface EnergyEfficiencyCardProps {
  propertyData: PropertyHistory;
  permits: Permit[];
}

const EnergyEfficiencyCard: React.FC<EnergyEfficiencyCardProps> = ({
  propertyData,
  permits
}) => {
  const calculateEnergyScore = () => {
    let score = 50; // Base score
    const age = new Date().getFullYear() - propertyData.propertyDetails.yearBuilt;
    
    // Age penalty
    if (age > 40) score -= 20;
    else if (age > 25) score -= 15;
    else if (age > 15) score -= 10;
    else if (age < 5) score += 15; // New construction bonus
    
    // Energy-related improvements
    const energyPermits = permits.filter(p => {
      const desc = p.description.toLowerCase();
      const type = p.type.toLowerCase();
      return desc.includes('hvac') || 
             desc.includes('insulation') || 
             desc.includes('windows') ||
             desc.includes('solar') ||
             desc.includes('heat pump') ||
             type.includes('mechanical') ||
             type.includes('energy');
    }).filter(p => 
      new Date(p.dateIssued).getFullYear() >= new Date().getFullYear() - 10
    );
    
    score += energyPermits.length * 8;
    
    // Solar installations
    const solarPermits = permits.filter(p => 
      p.description.toLowerCase().includes('solar') ||
      p.type.toLowerCase().includes('solar')
    );
    
    if (solarPermits.length > 0) score += 25;
    
    // HVAC updates
    const hvacPermits = permits.filter(p => 
      p.description.toLowerCase().includes('hvac') ||
      p.description.toLowerCase().includes('heat pump') ||
      p.type.toLowerCase().includes('mechanical')
    ).filter(p => 
      new Date(p.dateIssued).getFullYear() >= new Date().getFullYear() - 8
    );
    
    if (hvacPermits.length > 0) score += 15;
    
    // Window replacements
    const windowPermits = permits.filter(p => 
      p.description.toLowerCase().includes('window')
    ).filter(p => 
      new Date(p.dateIssued).getFullYear() >= new Date().getFullYear() - 15
    );
    
    if (windowPermits.length > 0) score += 10;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const getEfficiencyRating = (score: number) => {
    if (score >= 85) return { rating: 'A+', color: 'success' };
    if (score >= 75) return { rating: 'A', color: 'success' };
    if (score >= 65) return { rating: 'B+', color: 'default' };
    if (score >= 55) return { rating: 'B', color: 'default' };
    if (score >= 45) return { rating: 'C+', color: 'secondary' };
    if (score >= 35) return { rating: 'C', color: 'secondary' };
    return { rating: 'D', color: 'destructive' };
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-success';
    if (score >= 55) return 'text-warning';
    return 'text-destructive';
  };

  const getEnergyImprovements = () => {
    const improvements = [];
    const currentYear = new Date().getFullYear();
    
    // Recent energy improvements
    const solarPermits = permits.filter(p => 
      p.description.toLowerCase().includes('solar')
    );
    if (solarPermits.length > 0) {
      improvements.push({
        type: 'Solar Installation',
        year: new Date(solarPermits[0].dateIssued).getFullYear(),
        icon: Sun,
        impact: 'High'
      });
    }
    
    const hvacPermits = permits.filter(p => 
      p.description.toLowerCase().includes('hvac') ||
      p.description.toLowerCase().includes('heat pump')
    ).filter(p => 
      new Date(p.dateIssued).getFullYear() >= currentYear - 10
    );
    if (hvacPermits.length > 0) {
      improvements.push({
        type: 'HVAC System',
        year: new Date(hvacPermits[0].dateIssued).getFullYear(),
        icon: Wind,
        impact: 'Medium'
      });
    }
    
    const windowPermits = permits.filter(p => 
      p.description.toLowerCase().includes('window')
    ).filter(p => 
      new Date(p.dateIssued).getFullYear() >= currentYear - 15
    );
    if (windowPermits.length > 0) {
      improvements.push({
        type: 'Window Replacement',
        year: new Date(windowPermits[0].dateIssued).getFullYear(),
        icon: Lightbulb,
        impact: 'Medium'
      });
    }
    
    return improvements.sort((a, b) => b.year - a.year);
  };

  const estimateAnnualSavings = (score: number) => {
    const sqft = propertyData.propertyDetails.sqft;
    const baseUtilityCost = sqft * 1.2; // Rough estimate per sqft
    const efficiencyMultiplier = (100 - score) / 100;
    const potentialSavings = baseUtilityCost * efficiencyMultiplier * 0.3;
    
    return Math.round(potentialSavings);
  };

  const energyScore = calculateEnergyScore();
  const rating = getEfficiencyRating(energyScore);
  const improvements = getEnergyImprovements();
  const estimatedSavings = estimateAnnualSavings(energyScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Energy Efficiency
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Energy Score */}
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-3xl font-bold ${getScoreColor(energyScore)}`}>
              {energyScore}/100
            </p>
            <p className="text-sm text-muted-foreground">Energy Efficiency Score</p>
          </div>
          <Badge variant={rating.color as any} className="text-lg px-3 py-1">
            {rating.rating}
          </Badge>
        </div>
        
        <Progress value={energyScore} className="w-full" />
        
        {/* Estimated Savings */}
        <div className="bg-muted/50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="font-medium">Potential Annual Savings</span>
          </div>
          <p className="text-2xl font-bold text-primary">${estimatedSavings}</p>
          <p className="text-sm text-muted-foreground">
            With energy efficiency improvements
          </p>
        </div>
        
        {/* Recent Improvements */}
        {improvements.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Recent Energy Improvements</h4>
            <div className="space-y-2">
              {improvements.slice(0, 3).map((improvement, index) => {
                const Icon = improvement.icon;
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{improvement.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {improvement.impact}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {improvement.year}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Recommendations */}
        {energyScore < 70 && (
          <div className="border-t pt-3">
            <h4 className="font-medium mb-2">Improvement Opportunities</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              {energyScore < 50 && (
                <p>• Consider HVAC system upgrade or maintenance</p>
              )}
              {!improvements.some(i => i.type.includes('Solar')) && (
                <p>• Evaluate solar panel installation potential</p>
              )}
              {!improvements.some(i => i.type.includes('Window')) && (
                <p>• Upgrade to energy-efficient windows</p>
              )}
              <p>• Add insulation to improve thermal efficiency</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnergyEfficiencyCard;