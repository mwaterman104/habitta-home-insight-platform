import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { DollarSign, TrendingUp, AlertTriangle, HelpCircle } from "lucide-react";
import { useRepairReadiness } from "../hooks/useHabittaLocal";

export default function RepairReadiness() {
  const readiness = useRepairReadiness();

  if (!readiness) return null;

  const {
    userType,
    annualReserve,
    monthlySavings,
    upcomingMajorCost,
    nextMajorService,
    remainingBuffer,
    missedOpportunity
  } = readiness;

  const isEfficiencyAchiever = userType === "efficiency_achiever";

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className={`h-5 w-5 ${isEfficiencyAchiever ? 'text-green-600' : 'text-orange-500'}`} />
            Repair Readiness
          </span>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>How Repair Readiness Works</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Efficiency Reserve</h4>
                  <p className="text-muted-foreground">
                    Your monthly energy savings build a reserve that funds future repairs. 
                    Smart maintenance pays for itself through efficiency gains.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Repair Funding</h4>
                  <p className="text-muted-foreground">
                    When your reserve exceeds upcoming repair costs, maintenance becomes 
                    self-funding through your smart efficiency choices.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEfficiencyAchiever ? (
          // Path 1: Efficiency Achiever
          <>
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Repair Funded</span>
              </div>
              <div className="text-2xl font-bold text-green-700 mb-1">
                ${annualReserve.toLocaleString()}
              </div>
              <div className="text-sm text-green-600">efficiency reserve built</div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Next major service ({nextMajorService}):</span>
                <span className="font-medium">${upcomingMajorCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining buffer:</span>
                <span className="font-medium text-green-600">${remainingBuffer.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-3 border-t">
              <p className="text-sm text-center text-muted-foreground">
                <span className="font-medium text-green-600">✓ Maintenance is funded</span> by your smart efficiency
              </p>
            </div>
          </>
        ) : (
          // Path 2: Opportunity Identifier
          <>
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">Missed Opportunity</span>
              </div>
              <div className="text-2xl font-bold text-orange-700 mb-1">
                ${annualReserve.toLocaleString()}
              </div>
              <div className="text-sm text-orange-600">potential annual savings</div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Upcoming {nextMajorService}:</span>
                <span className="font-medium">${upcomingMajorCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Net position:</span>
                <span className="font-medium text-red-600">-${missedOpportunity.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-3 border-t">
              <p className="text-sm text-center text-muted-foreground">
                Start efficiency optimization to build repair reserves
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}