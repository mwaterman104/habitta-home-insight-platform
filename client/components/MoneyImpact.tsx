import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { DollarSign, TrendingUp, Shield, HelpCircle } from "lucide-react";

interface MoneyImpactProps {
  monthlySavings: number;
  avoidedSurprise: number;
  tasksCount: number;
}

export default function MoneyImpact({ monthlySavings, avoidedSurprise, tasksCount }: MoneyImpactProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Money Impact
          </span>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>How We Calculate Savings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Monthly Savings</h4>
                  <p className="text-muted-foreground">
                    Based on improved efficiency from timely maintenance. HVAC and water systems 
                    typically see 10-15% efficiency gains when properly maintained.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Avoided Surprise Costs</h4>
                  <p className="text-muted-foreground">
                    Emergency repairs typically cost 2.5x more than planned maintenance. 
                    We calculate the difference for high-priority items.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Risk Assessment</h4>
                  <p className="text-muted-foreground">
                    Based on system age, maintenance history, and industry failure rates.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Save up to</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              ${monthlySavings}
            </div>
            <div className="text-xs text-muted-foreground">this month</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Avoid surprise</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              ${avoidedSurprise}
            </div>
            <div className="text-xs text-muted-foreground">risk</div>
          </div>
        </div>
        
        {tasksCount > 0 && (
          <div className="pt-3 border-t">
            <p className="text-sm text-muted-foreground text-center">
              Complete {tasksCount} pending {tasksCount === 1 ? 'task' : 'tasks'} to realize these savings
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}