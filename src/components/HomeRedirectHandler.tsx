import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import LandingPage from '@/pages/LandingPage';

const HomeRedirectHandler = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkHomes = async () => {
      if (!user || authLoading) return;
      
      try {
        const { data: homes, error } = await supabase
          .from('homes')
          .select('id')
          .eq('user_id', user.id);

        if (error) throw error;

        if (!homes || homes.length === 0) {
          // No homes - redirect to add home page
          navigate('/home/new', { replace: true });
        } else if (homes.length === 1) {
          // Exactly one home - redirect to home profile
          navigate(`/home/${homes[0].id}`, { replace: true });
        } else {
          // Multiple homes - redirect to portfolio dashboard
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Error checking homes:', error);
        setChecking(false);
      }
    };

    if (!authLoading) {
      if (user) {
        checkHomes();
      } else {
        // Not authenticated - show landing page
        setChecking(false);
      }
    }
  }, [user, authLoading, navigate]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-8 h-8 border-4 border-habitta-green border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Show landing page if user is not authenticated or has no homes
  return <LandingPage />;
};

export default HomeRedirectHandler;