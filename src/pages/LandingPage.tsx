import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { WaitlistForm } from '@/components/WaitlistForm';
import Logo from '@/components/Logo';
import appPreview from '@/assets/app-preview.png';
import { 
  Brain, 
  Wrench, 
  DollarSign, 
  Hammer,
  CheckCircle2,
  Calendar,
  FileText,
  Instagram,
  Linkedin
} from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Logo size="md" />
            <span className="text-lg sm:text-xl font-bold text-primary">Habitta</span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="ghost" 
              onClick={() => scrollToSection('preview')}
              className="hidden md:flex text-foreground hover:text-primary"
            >
              Preview
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => scrollToSection('why')}
              className="hidden md:flex text-foreground hover:text-primary"
            >
              Why Habitta
            </Button>
            <Button 
              variant="default"
              onClick={() => scrollToSection('waitlist')}
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-sm sm:text-base px-4 sm:px-6 h-9 sm:h-10"
            >
              <span className="hidden sm:inline">Join Waitlist</span>
              <span className="sm:hidden">Join</span>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />
        <div 
          className={`container mx-auto max-w-4xl text-center relative z-10 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="mb-6 sm:mb-8 flex justify-center">
            <Logo size="xl" animated />
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-primary mb-4 sm:mb-6 leading-tight px-4">
            Your Home. Smarter.
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-10 leading-relaxed max-w-2xl mx-auto px-4">
            Habitta helps you understand, maintain, and improve your home — from looking to living.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Button 
              size="lg"
              onClick={() => scrollToSection('waitlist')}
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 touch-friendly"
            >
              Join the Waitlist
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => scrollToSection('preview')}
              className="text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground touch-friendly"
            >
              Preview the App
            </Button>
          </div>
        </div>
      </section>

      {/* Preview Section */}
      <section id="preview" className="py-12 sm:py-20 px-4 sm:px-6 bg-card">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-primary mb-3 sm:mb-4 px-4">
            A complete picture of your home's health.
          </h2>
          <p className="text-base sm:text-xl text-center text-muted-foreground mb-10 sm:mb-16 max-w-2xl mx-auto px-4">
            Everything you need to care for your home, powered by intelligent insights.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
            <div className="space-y-6 sm:space-y-8">
              <div className="flex gap-3 sm:gap-4 items-start group hover:scale-105 transition-transform duration-300 touch-friendly">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                  <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1 sm:mb-2">Predictive Insights</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Know when to repair or replace major systems before they fail.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4 items-start group hover:scale-105 transition-transform duration-300 touch-friendly">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                  <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1 sm:mb-2">Smart Maintenance</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Get proactive tasks and seasonal recommendations tailored to your home.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4 items-start group hover:scale-105 transition-transform duration-300 touch-friendly">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                  <Hammer className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1 sm:mb-2">DIY + Pros</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Guided help for every home project — or connect with local professionals.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4 items-start group hover:scale-105 transition-transform duration-300 touch-friendly">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1 sm:mb-2">Financial Forecasts</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Plan future costs with confidence using AI-powered predictions.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center mt-6 md:mt-0">
              <div className="w-full max-w-[280px] sm:max-w-sm rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
                <img 
                  src={appPreview} 
                  alt="Habitta Home Intelligence App Preview" 
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Habitta Section */}
      <section id="why" className="py-12 sm:py-20 px-4 sm:px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-primary mb-3 sm:mb-4 px-4">
            Built for every homeowner.
          </h2>
          <p className="text-base sm:text-xl text-center text-muted-foreground mb-10 sm:mb-16 max-w-2xl mx-auto px-4">
            From first-time buyers to seasoned owners, Habitta makes home care simple.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-card p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 touch-friendly">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3 sm:mb-4">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Prevent Surprises</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                AI-powered predictions help you avoid costly emergencies.
              </p>
            </div>

            <div className="bg-card p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 touch-friendly">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3 sm:mb-4">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Track Everything</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Monitor every system from roof to water heater in one place.
              </p>
            </div>

            <div className="bg-card p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 touch-friendly">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3 sm:mb-4">
                <Hammer className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Plan Projects</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Get step-by-step guidance from ChatDIY for any home task.
              </p>
            </div>

            <div className="bg-card p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 touch-friendly">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3 sm:mb-4">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Organized History</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                All your home's records, maintenance logs, and receipts together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist CTA Section */}
      <section id="waitlist" className="py-12 sm:py-20 px-4 sm:px-6 bg-card">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-3 sm:mb-4 px-4">
            Get early access.
          </h2>
          <p className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-10 px-4">
            Join the waitlist to be the first to experience the Habitta app.
          </p>
          
          <WaitlistForm />

          <div className="mt-10 sm:mt-12 flex justify-center gap-4 sm:gap-6">
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-muted hover:bg-accent/20 flex items-center justify-center transition-colors touch-friendly"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5 text-foreground" />
            </a>
            <a 
              href="https://linkedin.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-muted hover:bg-accent/20 flex items-center justify-center transition-colors touch-friendly"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-5 h-5 text-foreground" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-8 sm:py-12 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <Logo size="md" className="text-primary-foreground" />
              <span className="text-lg sm:text-xl font-bold">Habitta</span>
            </div>
            
            <div className="flex items-center gap-4 sm:gap-6 text-sm touch-friendly">
              <a href="#" className="hover:text-accent transition-colors min-h-[44px] flex items-center">Terms</a>
              <span className="text-primary-foreground/40">|</span>
              <a href="#" className="hover:text-accent transition-colors min-h-[44px] flex items-center">Privacy</a>
              <span className="text-primary-foreground/40">|</span>
              <a href="#" className="hover:text-accent transition-colors min-h-[44px] flex items-center">Contact</a>
            </div>
          </div>
          
          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-primary-foreground/20 text-center text-xs sm:text-sm text-primary-foreground/60">
            © {new Date().getFullYear()} Habitta. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
