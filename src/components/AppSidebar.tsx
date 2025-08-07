import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import { 
  Home, 
  CheckSquare, 
  FolderOpen, 
  Camera, 
  Settings,
  LogOut,
  House
} from 'lucide-react';

const navigation = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { title: 'My Home', url: '/home', icon: House },
  { title: 'Tasks', url: '/tasks', icon: CheckSquare },
  { title: 'Documents', url: '/documents', icon: FolderOpen },
  { title: 'AI Diagnosis', url: '/diagnosis', icon: Camera },
  { title: 'Settings', url: '/settings', icon: Settings },
];

const AppSidebar = () => {
  const { collapsed } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-64'} collapsible>
      <SidebarContent className="p-4">
        {/* Logo */}
        <div className="mb-8">
          <Link to="/dashboard" className="flex items-center gap-3">
            <Logo size="md" />
            {!collapsed && (
              <span className="text-xl font-bold text-primary">Habitta</span>
            )}
          </Link>
        </div>

        {/* User Info */}
        {!collapsed && (
          <div className="mb-6 p-3 bg-muted/50 rounded-lg">
            <p className="font-medium text-sm">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        )}

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      to={item.url}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive(item.url)
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Sign Out */}
        <div className="mt-auto">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start gap-3"
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;