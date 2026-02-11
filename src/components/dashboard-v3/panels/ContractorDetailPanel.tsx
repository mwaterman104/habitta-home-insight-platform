/**
 * ContractorDetailPanel - Full contractor detail view
 * 
 * Displays detailed information about a contractor with tabs:
 * - Overview: services, area, contact info
 * - Reviews: aggregated review details
 * - Contact: direct contact options
 */

import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFocusState } from "@/contexts/FocusStateContext";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContractorDetailPanelProps {
  contractorId: string;
  contractor?: {
    name: string;
    rating: number;
    reviewCount: number;
    category: string;
    location: string;
    phone?: string;
    websiteUri?: string;
  };
}

export function ContractorDetailPanel({
  contractorId,
  contractor,
}: ContractorDetailPanelProps) {
  const { goBack } = useFocusState();

  if (!contractor) {
    return (
      <div className="h-full flex flex-col bg-background p-4">
        <button
          onClick={goBack}
          className="p-1.5 hover:bg-muted rounded transition-colors mb-4"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <p className="text-sm text-muted-foreground">Contractor not found.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 shrink-0">
        <button
          onClick={goBack}
          className="p-1.5 hover:bg-muted rounded transition-colors mb-3"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <div>
          <h2 className="font-semibold text-foreground mb-1">{contractor.name}</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-foreground font-medium">
              {contractor.rating.toFixed(1)}⭐
            </span>
            <span className="text-muted-foreground">
              {contractor.reviewCount} reviews
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {contractor.category} • {contractor.location}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b border-border">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Overview Tab */}
          <TabsContent value="overview" className="p-4 space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-2">Category</h3>
              <p className="text-sm text-foreground">{contractor.category}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">Service Area</h3>
              <p className="text-sm text-foreground">{contractor.location}</p>
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="p-4 space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-2">Rating</h3>
              <p className="text-lg font-bold text-foreground">
                {contractor.rating.toFixed(1)}⭐
              </p>
              <p className="text-sm text-muted-foreground">
                Based on {contractor.reviewCount} Google reviews
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              View detailed reviews on Google Maps for this contractor.
            </p>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="p-4 space-y-4">
            {contractor.phone && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Phone</h3>
                <a
                  href={`tel:${contractor.phone}`}
                  className="text-sm text-primary hover:underline"
                >
                  {contractor.phone}
                </a>
              </div>
            )}
            {contractor.websiteUri && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Website</h3>
                <a
                  href={contractor.websiteUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Visit website
                </a>
              </div>
            )}
            {!contractor.phone && !contractor.websiteUri && (
              <p className="text-sm text-muted-foreground">
                Contact information not available. Search on Google Maps for more details.
              </p>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
