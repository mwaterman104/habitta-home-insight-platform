import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Home, UserPlus, Loader2 } from 'lucide-react';

interface UserRole {
  id: string;
  user_id: string;
  role: string;
}

const AdminPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [createUserForm, setCreateUserForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });

  useEffect(() => {
    if (!user) return;

    const checkAdminRole = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (!error && data) {
          setIsAdmin(true);
        }
      } catch (error) {
        console.log('User is not admin');
      } finally {
        setCheckingRole(false);
      }
    };

    checkAdminRole();
  }, [user]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'create',
          userData: createUserForm
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "User Created Successfully",
        description: `User ${createUserForm.email} has been created with their home profile.`,
      });

      setCreateUserForm({
        email: '',
        password: '',
        fullName: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: ''
      });
    } catch (error: any) {
      toast({
        title: "Error Creating User",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-destructive mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have admin privileges to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center">
            <Shield className="h-6 w-6 mr-2 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
            <Badge variant="secondary" className="ml-4">Admin</Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="homes" className="flex items-center">
              <Home className="h-4 w-4 mr-2" />
              Homes
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center">
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage users and their roles in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  User management features coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="homes">
            <Card>
              <CardHeader>
                <CardTitle>Home Management</CardTitle>
                <CardDescription>
                  View and manage all homes in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Home management features coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Create New User</CardTitle>
                <CardDescription>
                  Create a new user account with their home profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateUser} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">User Information</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={createUserForm.email}
                          onChange={(e) => setCreateUserForm(prev => ({ ...prev, email: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={createUserForm.password}
                          onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          value={createUserForm.fullName}
                          onChange={(e) => setCreateUserForm(prev => ({ ...prev, fullName: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={createUserForm.phone}
                          onChange={(e) => setCreateUserForm(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Home Address</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address">Street Address *</Label>
                      <Input
                        id="address"
                        value={createUserForm.address}
                        onChange={(e) => setCreateUserForm(prev => ({ ...prev, address: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={createUserForm.city}
                          onChange={(e) => setCreateUserForm(prev => ({ ...prev, city: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State *</Label>
                        <Input
                          id="state"
                          value={createUserForm.state}
                          onChange={(e) => setCreateUserForm(prev => ({ ...prev, state: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">ZIP Code *</Label>
                        <Input
                          id="zipCode"
                          value={createUserForm.zipCode}
                          onChange={(e) => setCreateUserForm(prev => ({ ...prev, zipCode: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create User & Home
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPage;