import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PropertyHistory } from '@/lib/propertyAPI';
import { Permit } from '@/lib/permitAPI';
import { 
  Clock, 
  Home, 
  Wrench, 
  FileText,
  Calendar,
  Users
} from 'lucide-react';

interface OwnershipTimelineProps {
  propertyData: PropertyHistory;
  permits: Permit[];
}

interface TimelineEvent {
  date: string;
  type: 'sale' | 'permit' | 'construction';
  title: string;
  description: string;
  value?: number;
  category?: string;
}

const OwnershipTimeline: React.FC<OwnershipTimelineProps> = ({
  propertyData,
  permits
}) => {
  const generateTimeline = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    
    // Add construction date
    events.push({
      date: `${propertyData.propertyDetails.yearBuilt}-01-01`,
      type: 'construction',
      title: 'Property Built',
      description: `Original construction completed`,
      category: 'Construction'
    });
    
    // Add sales history
    propertyData.saleHistory.forEach(sale => {
      events.push({
        date: sale.date,
        type: 'sale',
        title: 'Property Sale',
        description: sale.type,
        value: sale.price,
        category: 'Ownership'
      });
    });
    
    // Add significant permits (major renovations, additions, etc.)
    permits
      .filter(permit => {
        const desc = (permit.description || '').toLowerCase();
        const type = (permit.permit_type || '').toLowerCase();
        return desc.includes('addition') ||
               desc.includes('renovation') ||
               desc.includes('remodel') ||
               desc.includes('roof replacement') ||
               type.includes('major') ||
               type.includes('structural');
      })
      .forEach(permit => {
        events.push({
          date: permit.date_issued || '',
          type: 'permit',
          title: permit.permit_type || 'General Permit',
          description: permit.description || '',
          category: 'Improvement'
        });
      });
    
    // Sort by date
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const calculateOwnershipPeriods = () => {
    const sales = [...propertyData.saleHistory].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const periods = [];
    const constructionYear = propertyData.propertyDetails.yearBuilt;
    
    if (sales.length === 0) {
      return [{
        startYear: constructionYear,
        endYear: new Date().getFullYear(),
        duration: new Date().getFullYear() - constructionYear,
        isCurrentOwner: true
      }];
    }
    
    // First ownership period (construction to first sale)
    if (sales[0] && new Date(sales[0].date).getFullYear() > constructionYear) {
      periods.push({
        startYear: constructionYear,
        endYear: new Date(sales[0].date).getFullYear(),
        duration: new Date(sales[0].date).getFullYear() - constructionYear,
        isCurrentOwner: false
      });
    }
    
    // Periods between sales
    for (let i = 0; i < sales.length - 1; i++) {
      const startYear = new Date(sales[i].date).getFullYear();
      const endYear = new Date(sales[i + 1].date).getFullYear();
      periods.push({
        startYear,
        endYear,
        duration: endYear - startYear,
        isCurrentOwner: false,
        salePrice: sales[i].price
      });
    }
    
    // Current ownership period
    if (sales.length > 0) {
      const lastSale = sales[sales.length - 1];
      const startYear = new Date(lastSale.date).getFullYear();
      const currentYear = new Date().getFullYear();
      periods.push({
        startYear,
        endYear: currentYear,
        duration: currentYear - startYear,
        isCurrentOwner: true,
        salePrice: lastSale.price
      });
    }
    
    return periods;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'sale': return Home;
      case 'permit': return Wrench;
      case 'construction': return FileText;
      default: return Calendar;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'sale': return 'default';
      case 'permit': return 'secondary';
      case 'construction': return 'outline';
      default: return 'outline';
    }
  };

  const timeline = generateTimeline();
  const ownershipPeriods = calculateOwnershipPeriods();
  const averageOwnershipDuration = ownershipPeriods.length > 0 ? 
    ownershipPeriods.reduce((sum, period) => sum + period.duration, 0) / ownershipPeriods.length : 0;

  return (
    <div className="space-y-6">
      {/* Ownership Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Ownership History Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {ownershipPeriods.length}
              </p>
              <p className="text-sm text-muted-foreground">Total Owners</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {Math.round(averageOwnershipDuration)}
              </p>
              <p className="text-sm text-muted-foreground">Avg. Years Owned</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {new Date().getFullYear() - propertyData.propertyDetails.yearBuilt}
              </p>
              <p className="text-sm text-muted-foreground">Property Age</p>
            </div>
          </div>
          
          {/* Current Ownership */}
          {ownershipPeriods.find(p => p.isCurrentOwner) && (
            <div className="mt-4 p-3 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Home className="w-4 h-4 text-primary" />
                <span className="font-medium">Current Ownership</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {ownershipPeriods.find(p => p.isCurrentOwner)?.duration} years
                {ownershipPeriods.find(p => p.isCurrentOwner)?.salePrice && 
                  ` • Purchased for $${ownershipPeriods.find(p => p.isCurrentOwner)?.salePrice?.toLocaleString()}`
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ownership Periods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Ownership Periods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ownershipPeriods.map((period, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">
                    {period.startYear} - {period.isCurrentOwner ? 'Present' : period.endYear}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {period.duration} years
                    {period.salePrice && ` • $${period.salePrice.toLocaleString()}`}
                  </p>
                </div>
                <Badge variant={period.isCurrentOwner ? 'default' : 'outline'}>
                  {period.isCurrentOwner ? 'Current' : 'Previous'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Property Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Property Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timeline.map((event, index) => {
              const Icon = getEventIcon(event.type);
              return (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-background border-2 border-primary rounded-full flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        {event.value && (
                          <p className="text-sm font-medium text-primary">
                            ${event.value.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={getEventColor(event.type) as any}>
                          {event.category}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(event.date).getFullYear()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {timeline.length === 1 && (
            <p className="text-muted-foreground text-center py-4">
              No significant improvements or sales recorded
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnershipTimeline;