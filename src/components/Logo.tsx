import React from 'react';
import logo from '@/assets/habitta-logo.png';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', animated = false }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-20 h-20'
  };

  return (
    <img 
      src={logo} 
      alt="Habitta Logo" 
      className={`${sizeMap[size]} ${className} ${animated ? 'animate-pulse' : ''}`}
    />
  );
};

export default Logo;