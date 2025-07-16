import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PropertyHistory } from '@/lib/propertyAPI';
import { Permit, CodeViolation } from '@/lib/permitAPI';
import { 
  Shield, 
  AlertTriangle, 
  CloudRain, 
  Flame, 
  Zap,
  Waves,
  Home
} from 'lucide-react';

interface RoofScore {
  yearReplaced: number | null;
  age: number;
  wearFactor: number;
  score: number;
}

interface PropertyRiskAssessmentProps {
  propertyData: PropertyHistory;
  permits: Permit[];
  violations: CodeViolation[];
  roofScore: RoofScore | null;
}

const PropertyRiskAssessment: React.FC<PropertyRiskAssessmentProps> = ({
  propertyData,
  permits,
  violations,
  roofScore
}) => {
  const calculateInsuranceRisk = () => {
    let risk = 0;
    const age = new Date().getFullYear() - propertyData.propertyDetails.yearBuilt;
    
    // Age factor
    if (age > 50) risk += 30;
    else if (age > 30) risk += 20;
    else if (age > 20) risk += 10;
    
    // Violations factor
    const activeViolations = violations.filter(v => v.status !== 'resolved');
    risk += activeViolations.length * 15;
    
    // Roof condition
    if (roofScore && roofScore.score < 60) risk += 25;
    else if (roofScore && roofScore.score < 80) risk += 15;
    
    // Recent renovations (reduce risk)
    const recentRenovations = permits.filter(p => 
      p.type.toLowerCase().includes('renovation') || 
      p.type.toLowerCase().includes('improvement')
    ).filter(p => 
      new Date(p.dateIssued).getFullYear() >= new Date().getFullYear() - 5
    );
    
    risk -= recentRenovations.length * 5;
    
    return Math.max(0, Math.min(100, risk));
  };

  const calculateFloodRisk = () => {
    // Simplified flood risk based on property characteristics
    // In real implementation, this would use FEMA flood maps
    const sqft = propertyData.propertyDetails.sqft;
    const age = new Date().getFullYear() - propertyData.propertyDetails.yearBuilt;
    
    let risk = 15; // Base risk
    
    if (age > 40) risk += 10;
    if (sqft < 1500) risk += 5; // Smaller homes may have less flood protection
    
    // Check for flood-related permits
    const floodPermits = permits.filter(p => 
      p.description.toLowerCase().includes('flood') ||
      p.description.toLowerCase().includes('drainage') ||
      p.description.toLowerCase().includes('sump')
    );
    
    if (floodPermits.length > 0) risk += 15;
    
    return Math.max(0, Math.min(100, risk));
  };

  const calculateFireRisk = () => {
    let risk = 10; // Base risk
    const age = new Date().getFullYear() - propertyData.propertyDetails.yearBuilt;
    
    if (age > 30) risk += 15;
    
    // Check for electrical permits (good) vs violations (bad)
    const electricalPermits = permits.filter(p => 
      p.type.toLowerCase().includes('electrical')
    ).filter(p => 
      new Date(p.dateIssued).getFullYear() >= new Date().getFullYear() - 10
    );
    
    const electricalViolations = violations.filter(v => 
      v.type.toLowerCase().includes('electrical') && v.status !== 'resolved'
    );
    
    risk -= electricalPermits.length * 5;
    risk += electricalViolations.length * 20;
    
    return Math.max(0, Math.min(100, risk));
  };

  const calculateStructuralRisk = () => {
    let risk = 5; // Base risk
    const age = new Date().getFullYear() - propertyData.propertyDetails.yearBuilt;
    
    if (age > 60) risk += 25;
    else if (age > 40) risk += 15;
    else if (age > 25) risk += 8;
    
    // Foundation or structural permits are good
    const structuralPermits = permits.filter(p => 
      p.type.toLowerCase().includes('foundation') ||
      p.type.toLowerCase().includes('structural') ||
      p.description.toLowerCase().includes('foundation')
    ).filter(p => 
      new Date(p.dateIssued).getFullYear() >= new Date().getFullYear() - 15
    );
    
    const structuralViolations = violations.filter(v => 
      v.type.toLowerCase().includes('structural') ||
      v.type.toLowerCase().includes('foundation')
    ).filter(v => v.status !== 'resolved');
    
    risk -= structuralPermits.length * 8;
    risk += structuralViolations.length * 25;
    
    return Math.max(0, Math.min(100, risk));
  };

  const getRiskLevel = (score: number) => {
    if (score >= 70) return { level: 'High', color: 'destructive' };
    if (score >= 40) return { level: 'Medium', color: 'secondary' };
    return { level: 'Low', color: 'default' };
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-destructive';
    if (score >= 40) return 'text-warning';
    return 'text-success';
  };

  const insuranceRisk = calculateInsuranceRisk();
  const floodRisk = calculateFloodRisk();
  const fireRisk = calculateFireRisk();
  const structuralRisk = calculateStructuralRisk();
  
  const overallRisk = Math.round((insuranceRisk + floodRisk + fireRisk + structuralRisk) / 4);

  return (
    <div className="space-y-6">
      {/* Overall Risk Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Property Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className={`text-3xl font-bold ${getRiskColor(overallRisk)}`}>
                {overallRisk}/100
              </p>
              <p className="text-sm text-muted-foreground">Overall Risk Score</p>
            </div>
            <Badge variant={getRiskLevel(overallRisk).color as any}>
              {getRiskLevel(overallRisk).level} Risk
            </Badge>
          </div>
          <Progress value={overallRisk} className="w-full" />
          <p className="text-sm text-muted-foreground mt-2">
            Lower scores indicate lower insurance and maintenance risks
          </p>
        </CardContent>
      </Card>

      {/* Individual Risk Categories */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Waves className="w-5 h-5" />
              Flood Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xl font-semibold ${getRiskColor(floodRisk)}`}>
                {floodRisk}/100
              </span>
              <Badge variant={getRiskLevel(floodRisk).color as any}>
                {getRiskLevel(floodRisk).level}
              </Badge>
            </div>
            <Progress value={floodRisk} className="w-full mb-2" />
            <p className="text-sm text-muted-foreground">
              Based on property age, size, and drainage improvements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5" />
              Fire Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xl font-semibold ${getRiskColor(fireRisk)}`}>
                {fireRisk}/100
              </span>
              <Badge variant={getRiskLevel(fireRisk).color as any}>
                {getRiskLevel(fireRisk).level}
              </Badge>
            </div>
            <Progress value={fireRisk} className="w-full mb-2" />
            <p className="text-sm text-muted-foreground">
              Electrical system condition and recent updates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              Structural Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xl font-semibold ${getRiskColor(structuralRisk)}`}>
                {structuralRisk}/100
              </span>
              <Badge variant={getRiskLevel(structuralRisk).color as any}>
                {getRiskLevel(structuralRisk).level}
              </Badge>
            </div>
            <Progress value={structuralRisk} className="w-full mb-2" />
            <p className="text-sm text-muted-foreground">
              Foundation and structural integrity assessment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Insurance Premium Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xl font-semibold ${getRiskColor(insuranceRisk)}`}>
                {insuranceRisk}/100
              </span>
              <Badge variant={getRiskLevel(insuranceRisk).color as any}>
                {getRiskLevel(insuranceRisk).level}
              </Badge>
            </div>
            <Progress value={insuranceRisk} className="w-full mb-2" />
            <p className="text-sm text-muted-foreground">
              Factors affecting insurance costs and claims likelihood
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Mitigation Recommendations */}
      {overallRisk > 50 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Risk Mitigation Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {structuralRisk > 50 && (
                <div className="flex items-start gap-2">
                  <Home className="w-4 h-4 mt-1 text-warning" />
                  <div>
                    <p className="font-medium">Schedule Structural Inspection</p>
                    <p className="text-sm text-muted-foreground">
                      Consider professional assessment of foundation and structural elements
                    </p>
                  </div>
                </div>
              )}
              {fireRisk > 50 && (
                <div className="flex items-start gap-2">
                  <Flame className="w-4 h-4 mt-1 text-warning" />
                  <div>
                    <p className="font-medium">Electrical System Update</p>
                    <p className="text-sm text-muted-foreground">
                      Review electrical system and address any code violations
                    </p>
                  </div>
                </div>
              )}
              {roofScore && roofScore.score < 60 && (
                <div className="flex items-start gap-2">
                  <CloudRain className="w-4 h-4 mt-1 text-warning" />
                  <div>
                    <p className="font-medium">Roof Inspection Required</p>
                    <p className="text-sm text-muted-foreground">
                      Schedule professional roof inspection and consider replacement
                    </p>
                  </div>
                </div>
              )}
              {violations.filter(v => v.status !== 'resolved').length > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-1 text-warning" />
                  <div>
                    <p className="font-medium">Resolve Active Violations</p>
                    <p className="text-sm text-muted-foreground">
                      Address {violations.filter(v => v.status !== 'resolved').length} active code violations
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PropertyRiskAssessment;