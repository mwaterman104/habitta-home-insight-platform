import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Logo from '@/components/Logo';
import { Camera, CheckSquare, FolderOpen, Home, Shield, Clock, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <h1 className="text-2xl font-bold text-primary">Habitta</h1>
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            </nav>

            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/auth')}>Sign In</Button>
              <Button onClick={() => navigate('/auth')} className="bg-chatdiy-yellow hover:bg-chatdiy-yellow/90 text-charcoal font-semibold">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
            Your Home's <span className="text-primary">AI-Powered Guardian</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Prevent costly repairs with predictive maintenance, instant AI diagnosis, and smart scheduling
          </p>
          <Button
            size="lg"
            className="bg-chatdiy-yellow hover:bg-chatdiy-yellow/90 text-charcoal font-bold text-lg px-8 py-6"
            onClick={() => navigate('/auth')}
          >
            Start Free Trial
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Everything You Need to Protect Your Home</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive home management tools powered by artificial intelligence
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8 text-center">
                <Camera className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-3">AI Diagnosis</h3>
                <p className="text-muted-foreground">Upload a photo, get instant answers. Our AI identifies issues and provides expert recommendations.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8 text-center">
                <CheckSquare className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-3">Smart Maintenance</h3>
                <p className="text-muted-foreground">Never miss important tasks. Automated scheduling based on your home's specific needs.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8 text-center">
                <FolderOpen className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-3">Document Vault</h3>
                <p className="text-muted-foreground">All your home records, organized. Warranties, receipts, manuals – everything in one place.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">Get started in minutes, protect your home for years</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Home className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">1. Create Your Home Profile</h3>
              <p className="text-muted-foreground">Simple setup in minutes. Add your home details and we'll customize everything for you.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">2. Get AI Insights</h3>
              <p className="text-muted-foreground">Upload photos of any issues and get instant, expert diagnosis and recommendations.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">3. Stay Protected</h3>
              <p className="text-muted-foreground">Prevent issues before they happen with smart scheduling and predictive maintenance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">Choose the plan that's right for your home</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="relative">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-2">Basic</h3>
                <div className="text-3xl font-bold mb-4">
                  $0<span className="text-lg text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-success-green" />
                    <span>3 AI diagnoses per month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-success-green" />
                    <span>Basic maintenance tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-success-green" />
                    <span>Document storage</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>Get Started</Button>
              </CardContent>
            </Card>
            
            <Card className="relative border-primary shadow-lg">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-2">Plus</h3>
                <div className="text-3xl font-bold mb-4">
                  $9.99<span className="text-lg text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-success-green" />
                    <span>Unlimited AI diagnoses</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-success-green" />
                    <span>Smart maintenance scheduling</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-success-green" />
                    <span>Unlimited document storage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-success-green" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Button className="w-full bg-chatdiy-yellow hover:bg-chatdiy-yellow/90 text-charcoal" onClick={() => navigate('/auth')}>
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>
            
            <Card className="relative">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-2">Premium</h3>
                <div className="text-3xl font-bold mb-4">
                  $19.99<span className="text-lg text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-success-green" />
                    <span>Everything in Plus</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-success-green" />
                    <span>Virtual Pro access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-success-green" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Coming soon</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>Get Started</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Logo size="sm" />
                <span className="text-lg font-bold text-primary">Habitta</span>
              </div>
              <p className="text-muted-foreground">Your home's AI-powered guardian</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Powered by</h4>
              <p className="text-sm text-muted-foreground">
                <a href="#" className="hover:text-foreground transition-colors">ChatDIY</a>
              </p>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 Habitta. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;