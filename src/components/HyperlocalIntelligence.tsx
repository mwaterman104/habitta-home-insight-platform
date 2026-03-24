import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Cloud, 
  Thermometer, 
  Droplets, 
  Wind, 
  Eye, 
  Shield, 
  MapPin,
  AlertTriangle,
  Calendar,
  Star
} from 'lucide-react';
import { useSmartRecommendations } from '@/hooks/useSmartRecommendations';
import { useLocalContractors } from '@/hooks/useLocalContractors';

interface HyperlocalIntelligenceProps {
  propertyId?: string;
  zipCode?: string;
  address?: string;
}

export const HyperlocalIntelligence: React.FC<HyperlocalIntelligenceProps> = ({ 
  propertyId, 
  zipCode = '33414',
  address 
}) => {
  const { data: recommendations, loading: recsLoading } = useSmartRecommendations(propertyId);
  const { 
    contractors, 
    loading: contractorsLoading, 
    getRecommendedContractors,
    getHurricaneResponseContractors 
  } = useLocalContractors({ zipCode });

  // Mock climate data for Wellington, FL (would come from property_climate_data table)
  const climateData = {
    climate_zone: 'florida_south',
    hurricane_risk_level: 'high',
    flood_zone: 'X',
    average_humidity: 75,
    salt_air_exposure: false,
    microclimate_factors: {
      near_water: false,
      tree_coverage: 'moderate',
      sun_exposure: 'full'
    }
  };

  // Mock current weather alerts (would come from weather_alerts table)
  const weatherAlerts = [
    {
      id: '1',
      alert_type: 'heat_advisory',
      severity: 'moderate',
      title: 'Heat Advisory in Effect',
      description: 'High temperatures and humidity expected',
      maintenance_actions: ['check_ac_filters', 'inspect_attic_ventilation', 'test_ac_system']
    }
  ];

  const floridaSpecificTips = [
    {
      season: 'Hurricane Season (June-November)',
      tasks: [
        'Secure outdoor furniture and equipment',
        'Trim trees near power lines',
        'Test generator if available',
        'Check hurricane shutters or window protection',
        'Inspect roof for loose shingles'
      ]
    },
    {
      season: 'High Humidity (Summer)',
      tasks: [
        'Change AC filters monthly',
        'Monitor for mold growth',
        'Check dehumidifier settings',
        'Inspect HVAC ductwork for leaks',
        'Clean dryer vents regularly'
      ]
    },
    {
      season: 'Dry Season (Winter)',
      tasks: [
        'Irrigate landscaping as needed',
        'Check for pest intrusion',
        'Inspect pool equipment',
        'Service outdoor AC units',
        'Prepare for spring growth'
      ]
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'extreme': return 'destructive';
      case 'severe': return 'destructive';
      case 'moderate': return 'secondary';
      default: return 'default';
    }
  };

  const getHurricaneRiskColor = (risk: string) => {
    switch (risk) {
      case 'extreme': return 'text-destructive';
      case 'high': return 'text-destructive';
      case 'moderate': return 'text-secondary-foreground';
      default: return 'text-muted-foreground';
    }
  };

  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Location Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Wellington, FL Climate Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Shield className={`h-6 w-6 mx-auto mb-2 ${getHurricaneRiskColor(climateData.hurricane_risk_level)}`} />
              <div className="text-sm font-medium">Hurricane Risk</div>
              <div className={`text-xs capitalize ${getHurricaneRiskColor(climateData.hurricane_risk_level)}`}>
                {climateData.hurricane_risk_level}
              </div>
            </div>
            
            <div className="text-center">
              <Droplets className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-sm font-medium">Avg Humidity</div>
              <div className="text-xs text-muted-foreground">{climateData.average_humidity}%</div>
            </div>
            
            <div className="text-center">
              <Cloud className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <div className="text-sm font-medium">Flood Zone</div>
              <div className="text-xs text-muted-foreground">{climateData.flood_zone}</div>
            </div>
            
            <div className="text-center">
              <Eye className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <div className="text-sm font-medium">Sun Exposure</div>
              <div className="text-xs text-muted-foreground capitalize">
                {climateData.microclimate_factors.sun_exposure}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Weather Alerts */}
      {weatherAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Active Weather Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weatherAlerts.map((alert) => (
                <div key={alert.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{alert.title}</h4>
                    <Badge variant={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{alert.description}</p>
                  
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium">Recommended Actions:</h5>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {alert.maintenance_actions.map((action, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                          {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Florida-Specific Maintenance Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Florida-Specific Maintenance Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {floridaSpecificTips.map((seasonTips, index) => (
              <div key={index}>
                <h4 className="font-medium mb-3 text-primary">{seasonTips.season}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {seasonTips.tasks.map((task, taskIndex) => (
                    <div key={taskIndex} className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 bg-muted-foreground rounded-full flex-shrink-0" />
                      {task}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weather-Triggered Recommendations */}
      {recommendations?.weatherTriggered && recommendations.weatherTriggered.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wind className="h-5 w-5" />
              Weather-Triggered Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.weatherTriggered.slice(0, 3).map((rec) => (
                <div key={rec.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {rec.diy_difficulty}
                      </Badge>
                      {rec.estimated_time_hours && (
                        <span className="text-xs text-muted-foreground">
                          ~{rec.estimated_time_hours}h
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Schedule
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Local Contractor Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Top-Rated Local Contractors
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contractorsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Hurricane Response Specialists */}
              <div>
                <h4 className="font-medium mb-3 text-destructive">Hurricane Response Specialists</h4>
                <div className="space-y-2">
                  {getHurricaneResponseContractors(zipCode).slice(0, 2).map((contractor) => (
                    <div key={contractor.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <h5 className="font-medium">{contractor.name}</h5>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Star className="h-3 w-3 fill-primary text-primary" />
                          {formatRating(contractor.ratings.overall)} 
                          <span>({contractor.review_count} reviews)</span>
                          {contractor.emergency_services && (
                            <Badge variant="outline" className="text-xs">24/7</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {contractor.specialties.slice(0, 3).join(', ')}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Contact
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* HVAC Specialists */}
              <div>
                <h4 className="font-medium mb-3">HVAC Specialists</h4>
                <div className="space-y-2">
                  {getRecommendedContractors('hvac', zipCode).slice(0, 2).map((contractor) => (
                    <div key={contractor.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <h5 className="font-medium">{contractor.name}</h5>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Star className="h-3 w-3 fill-primary text-primary" />
                          {formatRating(contractor.ratings.overall)} 
                          <span>({contractor.review_count} reviews)</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {contractor.pricing_tier.replace('_', ' ')}
                          </Badge>
                        </div>
                        {contractor.typical_response_time_hours && (
                          <div className="text-xs text-muted-foreground">
                            Typical response: {contractor.typical_response_time_hours}h
                          </div>
                        )}
                      </div>
                      <Button variant="outline" size="sm">
                        Contact
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};