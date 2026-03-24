import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Calendar, ChevronRight } from "lucide-react";

export default function GenerateSeasonalPlanButton() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Seasonal Planning
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Generate a comprehensive seasonal maintenance checklist tailored to your home's needs.
          </p>
          <Button 
            onClick={() => navigate("/seasonal")}
            className="w-full"
            size="lg"
          >
            Generate Seasonal Plan
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div className="p-2 bg-muted rounded">
              <div className="font-medium">Maintenance</div>
              <div className="text-muted-foreground">12 items</div>
            </div>
            <div className="p-2 bg-muted rounded">
              <div className="font-medium">Energy</div>
              <div className="text-muted-foreground">8 items</div>
            </div>
            <div className="p-2 bg-muted rounded">
              <div className="font-medium">Safety</div>
              <div className="text-muted-foreground">6 items</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}