import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PropertyHistory } from '@/lib/propertyAPI';
import { getPermits, getCodeViolations, Permit, CodeViolation } from '@/lib/permitAPI';
import { getWeatherHistory, computeWearIndex } from '@/lib/weatherAPI';
import { useToast } from '@/hooks/use-toast';
import { 
  Home, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  CloudRain,
  Wrench,
  FileText
} from 'lucide-react';

interface RoofScore {
  yearReplaced: number | null;
  age: number;
  wearFactor: number;
  score: number;
}

interface PropertyDashboardProps {
  propertyData: PropertyHistory;
}

const PropertyDashboard: React.FC<PropertyDashboardProps> = ({ propertyData }) => {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [violations, setViolations] = useState<CodeViolation[]>([]);
  const [roofScore, setRoofScore] = useState<RoofScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAdditionalData();
  }, [propertyData.address]);

  const loadAdditionalData = async () => {
    setIsLoading(true);
    try {
      // Load permits and violations
      const [permitsData, violationsData] = await Promise.all([
        getPermits(propertyData.address),
        getCodeViolations(propertyData.address)
      ]);

      setPermits(permitsData);
      setViolations(violationsData);

      // Calculate roof score
      const roofScore = await calculateRoofScore(permitsData);
      setRoofScore(roofScore);

    } catch (error) {
      toast({
        title: "Data Load Error",
        description: "Some property data could not be loaded",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateRoofScore = async (permits: Permit[]): Promise<RoofScore> => {
    // Find most recent roof replacement
    const roofPermits = permits.filter(p => 
      p.type.toLowerCase().includes('roof') && 
      p.description.toLowerCase().includes('replacement')
    );

    const yearReplaced = roofPermits.length > 0 
      ? new Date(roofPermits[0].dateIssued).getFullYear()
      : null;

    const currentYear = new Date().getFullYear();
    const age = yearReplaced ? currentYear - yearReplaced : currentYear - propertyData.propertyDetails.yearBuilt;

    let wearFactor = 1.0;
    let score = Math.max(0, 100 - (age * 5)); // Basic age-based score

    if (yearReplaced) {
      try {
        const weatherData = await getWeatherHistory(yearReplaced);
        wearFactor = computeWearIndex(weatherData);
        // Adjust score based on weather conditions
        score = Math.max(0, score - (wearFactor * 10));
      } catch (error) {
        console.warn('Could not fetch weather data for roof score calculation');
      }
    }

    return {
      yearReplaced,
      age,
      wearFactor,
      score: Math.round(score)
    };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-danger';
  };

  const getViolationBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Property Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            {propertyData.address}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Year Built</p>
              <p className="text-lg font-semibold">{propertyData.propertyDetails.yearBuilt}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Square Feet</p>
              <p className="text-lg font-semibold">{propertyData.propertyDetails.sqft.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bedrooms</p>
              <p className="text-lg font-semibold">{propertyData.propertyDetails.bedrooms}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bathrooms</p>
              <p className="text-lg font-semibold">{propertyData.propertyDetails.bathrooms}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roof Health Score */}
      {roofScore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudRain className="w-5 h-5" />
              Roof Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-3xl font-bold ${getScoreColor(roofScore.score)}`}>
                  {roofScore.score}/100
                </p>
                <p className="text-sm text-muted-foreground">
                  Age: {roofScore.age} years | Weather Factor: {roofScore.wearFactor}/10
                </p>
                {roofScore.yearReplaced && (
                  <p className="text-sm text-muted-foreground">
                    Last Replaced: {roofScore.yearReplaced}
                  </p>
                )}
              </div>
              <div className="text-right">
                <Button variant="outline" size="sm">
                  <Wrench className="w-4 h-4 mr-2" />
                  Schedule Inspection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permits & Violations */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Recent Permits ({permits.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {permits.slice(0, 5).map((permit) => (
                <div key={permit.id} className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{permit.type}</p>
                    <p className="text-sm text-muted-foreground">{permit.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(permit.dateIssued).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={permit.status === 'active' ? 'default' : 'secondary'}>
                    {permit.status}
                  </Badge>
                </div>
              ))}
              {permits.length === 0 && (
                <p className="text-muted-foreground">No permits found</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Code Violations ({violations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {violations.slice(0, 5).map((violation) => (
                <div key={violation.id} className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{violation.type}</p>
                    <p className="text-sm text-muted-foreground">{violation.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(violation.dateReported).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Badge variant={getViolationBadgeVariant(violation.severity)}>
                      {violation.severity}
                    </Badge>
                    <Badge variant={violation.status === 'resolved' ? 'default' : 'secondary'}>
                      {violation.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {violations.length === 0 && (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-4 h-4" />
                  <p>No active violations</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Sales History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {propertyData.saleHistory.map((sale, index) => (
              <div key={index} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">${sale.price.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{sale.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm">{new Date(sale.date).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyDashboard;