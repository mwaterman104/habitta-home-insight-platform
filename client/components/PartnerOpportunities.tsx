import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { usePartnerOffers, useLifestyleMetrics, useHomeSystems } from "../hooks/useHabittaLocal";
import { Handshake, ExternalLink, DollarSign, Percent, Calendar } from "lucide-react";

export default function PartnerOpportunities() {
  const allOffers = usePartnerOffers();
  const lifestyleMetrics = useLifestyleMetrics();
  const homeSystems = useHomeSystems();

  // Simple trigger evaluation
  const evaluateTrigger = (trigger: string): boolean => {
    switch (trigger) {
      case "energy_score_improved":
        return lifestyleMetrics.energyWellness.score > lifestyleMetrics.energyWellness.neighborhoodAverage;
      case "outdoor_ready":
        return lifestyleMetrics.outdoorReadiness.status === "Ready";
      case "savings_qualified":
        return lifestyleMetrics.energyWellness.monthlySavings > 150;
      case "electrical_optimized":
        return homeSystems.find(s => s.key === "electrical")?.status === "green";
      case "energy_score_high":
        return lifestyleMetrics.energyWellness.score >= 85;
      default:
        return false;
    }
  };

  // Filter offers based on trigger evaluation
  const qualifiedOffers = allOffers.filter(offer => 
    offer.qualified && evaluateTrigger(offer.trigger)
  );

  const formatValue = (value: number, unit: string) => {
    switch (unit) {
      case "usd": return `$${value}`;
      case "percent": return `${value}%`;
      case "consultation": return "Free";
      default: return value.toString();
    }
  };

  const formatExpiry = (expiry: string) => {
    return new Date(expiry).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "energy_rebate": return <DollarSign className="h-4 w-4 text-green-600" />;
      case "home_improvement": return <Percent className="h-4 w-4 text-blue-600" />;
      case "financing": return <DollarSign className="h-4 w-4 text-purple-600" />;
      case "smart_home": return <Percent className="h-4 w-4 text-orange-600" />;
      case "energy_efficiency": return <Calendar className="h-4 w-4 text-green-600" />;
      default: return <ExternalLink className="h-4 w-4" />;
    }
  };

  if (qualifiedOffers.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            🤝 Available Programs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No qualified offers available at this time
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Handshake className="h-5 w-5" />
          🤝 Available Programs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {qualifiedOffers.map((offer) => (
          <div key={offer.id} className="border rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getTypeIcon(offer.type)}
                  <span className="font-semibold">{offer.title}</span>
                  <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                    Qualified (est.)
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{offer.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Partner: {offer.partner}</span>
                  <span>Expires: {formatExpiry(offer.expiry)}</span>
                </div>
              </div>
              <div className="text-right">
                {offer.value > 0 && (
                  <div className="text-lg font-bold text-green-600 mb-2">
                    {formatValue(offer.value, offer.unit)}
                    {offer.unit === "percent" && " off"}
                  </div>
                )}
                <Button size="sm" variant="outline" className="rounded-lg">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}