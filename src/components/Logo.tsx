import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`${sizeMap[size]} ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path 
          d="M50 20L75 35V60C75 63 73 65 70 65H60V45C60 40 55 35 50 35C45 35 40 40 40 45V65H30C27 65 25 63 25 60V35L50 20Z" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          fill="none"
          className="text-habitta-green"
        />
        <rect 
          x="40" 
          y="45" 
          width="10" 
          height="20" 
          fill="currentColor" 
          opacity="0.9"
          className="text-habitta-green"
        />
        <rect 
          x="50" 
          y="45" 
          width="10" 
          height="20" 
          fill="currentColor" 
          opacity="0.9"
          className="text-habitta-green"
        />
      </svg>
    </div>
  );
};

export default Logo;