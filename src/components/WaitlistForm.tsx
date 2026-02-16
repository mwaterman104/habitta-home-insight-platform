import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const WaitlistForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('waitlist')
        .insert([{ name: name.trim(), email: email.trim().toLowerCase() }]);

      if (error) {
        if (error.code === '23505') {
          toast.error('This email is already on the waitlist!');
        } else {
          toast.error('Something went wrong. Please try again.');
        }
        return;
      }

      setIsSuccess(true);
      toast.success('Welcome to the Habitta waitlist!');

      // Send welcome email via Resend (fire-and-forget)
      supabase.functions.invoke('waitlist-welcome', {
        body: { name: name.trim(), email: email.trim().toLowerCase() },
      }).catch((err) => console.error('Welcome email failed:', err));

      setName('');
      setEmail('');
      
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (err) {
      toast.error('Failed to join waitlist. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-2xl shadow-lg border border-border animate-scale-in">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-accent" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-foreground mb-2">You're on the list!</h3>
          <p className="text-muted-foreground">
            We'll notify you as soon as Habitta launches. Get ready for smarter home care.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-4">
      <div className="space-y-2">
        <Label htmlFor="waitlist-name" className="text-foreground">Name</Label>
        <Input
          id="waitlist-name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
          className="h-12 text-base"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="waitlist-email" className="text-foreground">Email</Label>
        <Input
          id="waitlist-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          className="h-12 text-base"
          required
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-12 text-base bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Joining...
          </>
        ) : (
          'Join the Waitlist'
        )}
      </Button>
    </form>
  );
};
