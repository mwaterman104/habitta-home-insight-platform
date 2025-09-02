import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useSeasonalHero, useUserProfile, useCurrentSeason } from "../hooks/useHabittaLocal";
import { Calendar, Home, MapPin } from "lucide-react";

export default function SeasonalExperienceHero() {
  const hero = useSeasonalHero();
  const userProfile = useUserProfile();
  const currentSeason = useCurrentSeason();

  if (!hero) {
    return (
      <Card className="rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">Loading seasonal experience...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSeasonEmoji = (season: string) => {
    switch (season) {
      case "spring": return "🌸";
      case "summer": return "☀️";
      case "fall": return "🍂";
      case "winter": return "❄️";
      default: return "🏡";
    }
  };

  const handlePrimaryCta = () => {
    if (hero.primaryCta.route) {
      // In a real app, this would use router navigation
      console.log(`Navigate to: ${hero.primaryCta.route}`);
    }
  };

  const handleSecondaryCta = () => {
    if (hero.secondaryCta.action === "view_systems") {
      // Scroll to system health section
      const systemsElement = document.querySelector('[data-systems-health]');
      systemsElement?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Card className="rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          {/* House Photo */}
          <div className="hidden md:block">
            <div className="w-32 h-24 rounded-xl overflow-hidden bg-muted">
              <img 
                src={userProfile.photo_url} 
                alt={`${userProfile.name}'s home`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          <div className="flex-1">
            {/* Header with personalization */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{getSeasonEmoji(currentSeason)}</span>
              <h2 className="text-xl font-bold">{hero.title}</h2>
              <Badge variant="outline" className="ml-2 capitalize bg-primary/10 text-primary border-primary/20">
                {currentSeason} Ready
              </Badge>
            </div>
            
            {/* Address */}
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
              <Button 
                variant="outline" 
                onClick={handleSecondaryCta}
                className="rounded-xl"
              >
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