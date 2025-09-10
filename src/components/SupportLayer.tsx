import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Video, 
  Calendar, 
  Users,
  Wrench,
  Phone,
  Clock,
  Star,
  ArrowRight
} from "lucide-react";

interface SupportOption {
  id: string;
  type: 'chat_diy' | 'video_consult' | 'pro_booking' | 'phone_support';
  title: string;
  description: string;
  responseTime?: string;
  cost?: string;
  rating?: number;
  available: boolean;
}

interface SupportLayerProps {
  options?: SupportOption[];
  urgentTasksCount?: number;
}

const mockSupportOptions: SupportOption[] = [
  {
    id: '1',
    type: 'chat_diy',
    title: 'ChatDIY Assistant',
    description: 'AI-powered guidance for DIY repairs and maintenance questions.',
    responseTime: 'Instant',
    cost: 'Free',
    rating: 4.8,
    available: true
  },
  {
    id: '2',
    type: 'video_consult',
    title: 'Expert Video Call',
    description: '15-minute video consultation with licensed contractors.',
    responseTime: 'Same day',
    cost: '$39',
    rating: 4.9,
    available: true
  },
  {
    id: '3',
    type: 'pro_booking',
    title: 'Book Vetted Pro',
    description: 'Connect with background-checked local contractors.',
    responseTime: '24-48 hrs',
    cost: 'Quote',
    rating: 4.7,
    available: true
  },
  {
    id: '4',
    type: 'phone_support',
    title: 'Emergency Hotline',
    description: '24/7 emergency guidance for urgent home issues.',
    responseTime: 'Immediate',
    cost: 'Included',
    rating: 4.6,
    available: false
  }
];

export const SupportLayer: React.FC<SupportLayerProps> = ({ 
  options = mockSupportOptions,
  urgentTasksCount = 2 
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'chat_diy': return <MessageCircle className="h-5 w-5" />;
      case 'video_consult': return <Video className="h-5 w-5" />;
      case 'pro_booking': return <Users className="h-5 w-5" />;
      case 'phone_support': return <Phone className="h-5 w-5" />;
      default: return <Wrench className="h-5 w-5" />;
    }
  };

  const getButtonVariant = (type: string) => {
    switch (type) {
      case 'chat_diy': return 'default';
      case 'video_consult': return 'outline';
      case 'pro_booking': return 'outline';
      case 'phone_support': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Get Help When You Need It
          </CardTitle>
          {urgentTasksCount > 0 && (
            <Badge className="bg-danger text-danger-foreground">
              {urgentTasksCount} urgent
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button className="h-auto p-4 flex flex-col items-center gap-2">
            <MessageCircle className="h-6 w-6" />
            <div className="text-center">
              <div className="font-medium text-sm">Ask ChatDIY</div>
              <div className="text-xs opacity-90">Instant answers</div>
            </div>
          </Button>
          
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <Calendar className="h-6 w-6" />
            <div className="text-center">
              <div className="font-medium text-sm">Book Pro</div>
              <div className="text-xs text-muted-foreground">Vetted contractors</div>
            </div>
          </Button>
        </div>

        {/* Detailed Options */}
        <div className="space-y-3">
          {options.map((option) => (
            <div key={option.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full">
                  {getIcon(option.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{option.title}</h4>
                    {option.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-muted-foreground">{option.rating}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {option.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{option.responseTime}</span>
                    </div>
                    <div className="font-medium text-primary">
                      {option.cost}
                    </div>
                  </div>
                </div>
              </div>
              
              <Button 
                size="sm" 
                variant={getButtonVariant(option.type)}
                disabled={!option.available}
              >
                {option.available ? 'Connect' : 'Unavailable'}
                {option.available && <ArrowRight className="h-3 w-3 ml-1" />}
              </Button>
            </div>
          ))}
        </div>

        {/* Emergency CTA */}
        {urgentTasksCount > 0 && (
          <div className="p-4 bg-danger/5 border border-danger/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="h-4 w-4 text-danger" />
              <span className="text-sm font-medium text-danger">Emergency Support</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              You have {urgentTasksCount} urgent tasks. Get immediate expert guidance.
            </p>
            <Button variant="destructive" size="sm" className="w-full">
              Call Emergency Hotline
            </Button>
          </div>
        )}

        {/* Testimonial */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">Sarah M.</span>
          </div>
          <p className="text-xs text-muted-foreground">
            "ChatDIY walked me through fixing my leaky faucet in 10 minutes. Saved me $200 in plumber fees!"
          </p>
        </div>
      </CardContent>
    </Card>
  );
};