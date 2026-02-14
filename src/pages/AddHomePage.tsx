import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AddHomePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to new onboarding flow
    navigate('/onboarding');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse">Redirecting to onboarding...</div>
      </div>
    </div>
  );
};

export default AddHomePage;