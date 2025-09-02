import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { useSeasonalHero, useUserProfile, useRepairReadiness } from "../hooks/useHabittaLocal";
import { getSeasonInfo } from "../hooks/useHabittaLocal";
import { Badge } from "./ui/badge";
import { Calendar, Home, MapPin } from "lucide-react";

export default function SeasonalExperienceHero() {
  const hero = useSeasonalHero();
  const userProfile = useUserProfile();
  const { current: currentSeason, next: nextSeason } = getSeasonInfo();
  const repairReadiness = useRepairReadiness();
  
  const annualReserve = repairReadiness?.annualReserve || 0;

  if (!hero) {
    return (
      <Card className="rounded-2xl bg-gradient-to-r from-blue-50 to-green-50 border-0">
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading seasonal experience...</p>
        </CardContent>
      </Card>
    );
  }

  const getSeasonEmoji = (season: string) => {
    switch (season.toLowerCase()) {
      case 'spring': return '🌸';
      case 'summer': return '☀️';
      case 'fall': return '🍂';
      case 'winter': return '❄️';
      default: return '🏠';
    }
  };

  const handlePrimaryCta = () => {
    console.log(`Navigating to: ${hero.primaryCta.route}`);
  };

  const handleSecondaryCta = () => {
    if (hero.secondaryCta.action === "view_systems") {
      const systemsSection = document.querySelector('[data-section="systems"]');
      if (systemsSection) {
        systemsSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <Card className="rounded-2xl bg-gradient-to-r from-blue-50 to-green-50 border-0">
      <CardContent className="p-6">
        <div className="grid lg:grid-cols-2 gap-6 items-center">
          {/* House photo for larger screens */}
          <div className="hidden lg:block">
            <div className="aspect-video bg-muted rounded-xl overflow-hidden">
              <img 
                src="/placeholder.svg" 
                alt="Your home" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* Content */}
          <div>
            <h2 className="text-2xl font-bold mb-3">{hero.title}</h2>
            
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant="secondary" className="rounded-full">
                {getSeasonEmoji(currentSeason)} {currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1)}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                Next: {getSeasonEmoji(nextSeason)} {nextSeason.charAt(0).toUpperCase() + nextSeason.slice(1)}
              </Badge>
              {annualReserve > 0 && (
                <Badge variant="secondary" className="rounded-full bg-green-100 text-green-800">
                  ${annualReserve.toLocaleString()} reserve built
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{userProfile.address}</span>
            </div>
            
            <p className="text-muted-foreground mb-4">
              Hi {userProfile.name}! {hero.message}
            </p>
            
            <ul className="space-y-2 mb-6">
              {hero.bullets.map((bullet, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  {bullet}
                </li>
              ))}
            </ul>
            
            <div className="flex gap-3">
              <Button onClick={handlePrimaryCta} className="rounded-xl">
                <Calendar className="h-4 w-4 mr-2" />
                {hero.primaryCta.text}
              </Button>
              <Button variant="outline" onClick={handleSecondaryCta} className="rounded-xl">
                <Home className="h-4 w-4 mr-2" />
                {hero.secondaryCta.text}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}