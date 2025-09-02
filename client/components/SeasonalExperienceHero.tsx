import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { useSeasonalHero } from "../hooks/useHabittaLocal";
import { Calendar, Home } from "lucide-react";

export default function SeasonalExperienceHero() {
  const hero = useSeasonalHero();

  console.log('SeasonalExperienceHero render:', { hero });

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
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🌸</span>
              <h2 className="text-xl font-bold">{hero.title}</h2>
            </div>
            
            <p className="text-muted-foreground mb-4">{hero.message}</p>
            
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