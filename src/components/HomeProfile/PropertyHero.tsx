import React from 'react';
import { Card } from '@/components/ui/card';

interface PropertyHeroProps {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  imageUrl?: string;
}

export const PropertyHero: React.FC<PropertyHeroProps> = ({
  address,
  city,
  state,
  zipCode,
  imageUrl = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop&crop=center"
}) => {
  return (
    <Card className="overflow-hidden">
      <div className="relative h-64 md:h-80">
        <img
          src={imageUrl}
          alt={`Property at ${address}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
          <div className="text-white">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{address}</h1>
            <p className="text-white/90 text-lg">
              {city}, {state} {zipCode}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};