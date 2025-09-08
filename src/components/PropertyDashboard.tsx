import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PropertyHistory } from '@/lib/propertyAPI';
import { getPermits, getCodeViolations, syncPermitsData, Permit, CodeViolation } from '@/lib/permitAPI';
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
  FileText,
  Shield,
  Zap,
  TrendingUp,
  Users,
  Clock,
  MapPin,
  Droplets,
  Hammer,
  Building,
  Car,
  Thermometer,
  Info,
  CheckSquare
} from 'lucide-react';
import PropertyRiskAssessment from './PropertyRiskAssessment';
import OwnershipTimeline from './OwnershipTimeline';
import EnergyEfficiencyCard from './EnergyEfficiencyCard';
import PropertyValueTrends from './PropertyValueTrends';
import WebScraper from './WebScraper';

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
      // Load permits and violations from database
      const homeId = 'temp-home-id'; // TODO: Get actual home ID from context or props
      const [permitsData, violationsData] = await Promise.all([
        getPermits(homeId),
        getCodeViolations(homeId)
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

  const handleSyncPermits = async () => {
    setIsLoading(true);
    try {
      const homeId = 'temp-home-id'; // TODO: Get actual home ID from context or props
      const result = await syncPermitsData(propertyData.address, homeId);
      
      toast({
        title: "Sync Complete",
        description: result.message,
        variant: "default",
      });

      // Reload data after sync
      await loadAdditionalData();
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Could not sync permit data from Shovels.ai",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateRoofScore = async (permits: Permit[]): Promise<RoofScore> => {
    // Find most recent roof replacement
    const roofPermits = permits.filter(p => 
      (p.permit_type || '').toLowerCase().includes('roof') && 
      (p.description || '').toLowerCase().includes('replacement')
    );

    const yearReplaced = roofPermits.length > 0 && roofPermits[0].date_issued
      ? new Date(roofPermits[0].date_issued).getFullYear()
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
    return 'text-destructive';
  };

  const getViolationBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const calculatePropertyAge = () => {
    return new Date().getFullYear() - propertyData.propertyDetails.yearBuilt;
  };

  const calculateComplianceScore = () => {
    const activeViolations = violations.filter(v => v.status !== 'resolved').length;
    const totalPermits = permits.length;
    const recentPermits = permits.filter(p => 
      p.date_issued && new Date(p.date_issued).getFullYear() >= new Date().getFullYear() - 5
    ).length;
    
    let score = 100;
    score -= activeViolations * 15; // Deduct for active violations
    if (totalPermits > 0) score += Math.min(recentPermits * 5, 20); // Bonus for recent permits
    
    return Math.max(0, Math.min(100, score));
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Property Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            {propertyData.address}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Year Built</p>
              <p className="text-lg font-semibold">{propertyData.propertyDetails.yearBuilt}</p>
              <p className="text-xs text-muted-foreground">{calculatePropertyAge()} years old</p>
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
            <div>
              <p className="text-sm text-muted-foreground">Compliance Score</p>
              <p className={`text-lg font-semibold ${getScoreColor(calculateComplianceScore())}`}>
                {calculateComplianceScore()}/100
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Permits</p>
              <p className="text-lg font-semibold">{permits.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Analysis Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="risks">Risk Assessment</TabsTrigger>
          <TabsTrigger value="efficiency">Energy & Value</TabsTrigger>
          <TabsTrigger value="history">Ownership History</TabsTrigger>
          <TabsTrigger value="permits">Permits & Violations</TabsTrigger>
          <TabsTrigger value="scraper">Web Scraper</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Enhanced Property Details Grid */}
          {propertyData.extendedDetails && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Lot & Location Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Lot & Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Lot Size</span>
                    <span className="font-medium">
                      {propertyData.extendedDetails.lot.sizeAcres.toFixed(2)} acres 
                      ({propertyData.extendedDetails.lot.sizeSqFt.toLocaleString()} sq ft)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pool</span>
                    <span className="font-medium flex items-center gap-1">
                      {propertyData.extendedDetails.lot.hasPool ? (
                        <>
                          <Droplets className="w-4 h-4 text-blue-500" />
                          Yes
                        </>
                      ) : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Subdivision</span>
                    <span className="font-medium">{propertyData.extendedDetails.location.subdivision || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Municipality</span>
                    <span className="font-medium">{propertyData.extendedDetails.location.municipality || 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Building Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Building Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Construction</span>
                    <span className="font-medium">{propertyData.extendedDetails.building.constructionType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Roof Material</span>
                    <span className="font-medium">{propertyData.extendedDetails.building.roofMaterial}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Wall Type</span>
                    <span className="font-medium">{propertyData.extendedDetails.building.wallType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Levels</span>
                    <span className="font-medium">{propertyData.extendedDetails.building.levels}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Condition</span>
                    <Badge variant={propertyData.extendedDetails.building.condition === 'EXCELLENT' ? 'default' : 'secondary'}>
                      {propertyData.extendedDetails.building.condition}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Utilities & Systems */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Thermometer className="w-5 h-5" />
                    Utilities & Systems
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Cooling</span>
                    <span className="font-medium">{propertyData.extendedDetails.utilities.cooling}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Heating Type</span>
                    <span className="font-medium">{propertyData.extendedDetails.utilities.heatingType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Heating Fuel</span>
                    <span className="font-medium">{propertyData.extendedDetails.utilities.heatingFuel}</span>
                  </div>
                  {propertyData.extendedDetails.building.garageSize > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Garage</span>
                      <span className="font-medium flex items-center gap-1">
                        <Car className="w-4 h-4" />
                        {propertyData.extendedDetails.building.garageSize} sq ft
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ownership & Assessment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" />
                    Ownership & Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Owner Occupied</span>
                    <span className="font-medium flex items-center gap-1">
                      {propertyData.extendedDetails.ownership.ownerOccupied ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Yes
                        </>
                      ) : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Property Class</span>
                    <span className="font-medium">{propertyData.extendedDetails.ownership.propertyClass}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Land Use</span>
                    <span className="font-medium">{propertyData.extendedDetails.ownership.landUse}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">APN</span>
                    <span className="font-medium text-xs">{propertyData.extendedDetails.assessment.apn || 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
                      Age: {roofScore.age} years | Weather Factor: {roofScore.wearFactor.toFixed(1)}/10
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
        </TabsContent>

        <TabsContent value="risks">
          <PropertyRiskAssessment 
            propertyData={propertyData} 
            permits={permits} 
            violations={violations}
            roofScore={roofScore}
          />
        </TabsContent>

        <TabsContent value="efficiency">
          <div className="grid md:grid-cols-2 gap-6">
            <EnergyEfficiencyCard propertyData={propertyData} permits={permits} />
            <PropertyValueTrends propertyData={propertyData} />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <OwnershipTimeline propertyData={propertyData} permits={permits} />
        </TabsContent>

        <TabsContent value="permits">
          <div className="mb-4">
            <Button 
              onClick={handleSyncPermits} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {isLoading ? 'Syncing...' : 'Sync Permit Data from Shovels.ai'}
            </Button>
          </div>
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
                  {permits.slice(0, 8).map((permit) => (
                    <div key={permit.id} className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{permit.permit_type || 'General Permit'}</p>
                        <p className="text-sm text-muted-foreground">{permit.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {permit.date_issued ? new Date(permit.date_issued).toLocaleDateString() : 'No date'}
                        </p>
                      </div>
                      <Badge variant={permit.status === 'active' ? 'default' : 'secondary'}>
                        {permit.status || 'Unknown'}
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
                  {violations.slice(0, 8).map((violation) => (
                    <div key={violation.id} className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{violation.violation_type || 'General Violation'}</p>
                        <p className="text-sm text-muted-foreground">{violation.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {violation.date_reported ? new Date(violation.date_reported).toLocaleDateString() : 'No date'}
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
        </TabsContent>

        <TabsContent value="scraper">
          <WebScraper 
            suggestedUrls={[
              `https://pbcgov.org/pzb/building/permits`, // Palm Beach County permits
              `https://www.pbcgov.org/publicsafety/codeenforcement/search-violations.htm`, // Code violations
              `https://www.pbpao.gov/apps/PropertySearch/`, // Property assessment
              `https://www.wellington.fl.us/`, // Wellington city site
            ]}
            onDataExtracted={(data) => {
              console.log('Scraped data for property research:', data);
              toast({
                title: "Data Extracted",
                description: `Successfully scraped ${data.title || 'website'} for property research`,
              });
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PropertyDashboard;