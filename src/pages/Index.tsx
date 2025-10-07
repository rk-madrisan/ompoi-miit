import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Shield, Store, ShoppingCart } from 'lucide-react';

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setUserRole(data.role);
        }
      }
      setRoleLoading(false);
    };

    fetchUserRole();
  }, [user]);

  // Show loading while auth or role is loading
  if (loading || (user && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect based on role
  if (user && userRole) {
    if (userRole === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (userRole === 'seller') {
      return <Navigate to="/seller" replace />;
    } else if (userRole === 'buyer') {
      return <Navigate to="/buyer" replace />;
    } else if (userRole === 'agent') {
      return <Navigate to="/agent" replace />;
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
              <Store className="w-8 h-8" />
              Cashew Business
            </CardTitle>
            <CardDescription className="text-lg">
              B2B Nuts & Cashew Trading Platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Connect with suppliers and buyers in the global cashew market
            </p>
            <Link to="/auth">
              <Button size="lg" className="w-full">
                Get Started
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2">
              <Store className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-primary">Cashew Business</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Welcome, {user.email}</span>
              <Button onClick={signOut} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Welcome to Your Dashboard</h2>
          <p className="text-xl text-muted-foreground">Your role: <span className="capitalize font-medium text-primary">{userRole}</span></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userRole === 'seller' && (
            <>
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    Product Management
                  </CardTitle>
                  <CardDescription>Manage your cashew products and inventory</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" disabled>
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Orders
                  </CardTitle>
                  <CardDescription>View and manage your sales orders</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" disabled>
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {userRole === 'buyer' && (
            <>
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    Browse Products
                  </CardTitle>
                  <CardDescription>Discover quality cashew products from verified sellers</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" disabled>
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    My Orders
                  </CardTitle>
                  <CardDescription>Track your purchase orders and history</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" disabled>
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {userRole === 'agent' && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => window.location.href = '/agent'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Agent Dashboard
                </CardTitle>
                <CardDescription>Quality verification assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">
                  Open Mobile App
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
