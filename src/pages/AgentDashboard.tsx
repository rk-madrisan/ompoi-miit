import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, CheckCircle, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Geolocation } from '@capacitor/geolocation';

interface Assignment {
  id: string;
  order_id: string;
  status: string;
  assigned_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  current_location?: any;
  notes?: string;
  quality_check_results: any;
  order: {
    order_number: string;
    total_amount: number;
    shipping_address: string;
    buyer: {
      full_name: string;
      phone: string;
    };
    seller: {
      full_name: string;
      business_name: string;
      phone: string;
    };
  };
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'assigned': return 'secondary';
    case 'accepted': return 'default';
    case 'in_progress': return 'outline';
    case 'completed': return 'default';
    default: return 'secondary';
  }
};

const AgentDashboard = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAssignments();
      requestLocationPermission();
    }
  }, [user]);

  const requestLocationPermission = async () => {
    try {
      const permission = await Geolocation.requestPermissions();
      setLocationPermission(permission.location === 'granted');
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_assignments')
        .select(`
          *,
          order:orders!agent_assignments_order_id_fkey (
            order_number,
            total_amount,
            shipping_address,
            buyer:profiles!orders_buyer_id_fkey (
              full_name,
              phone
            ),
            seller:profiles!orders_seller_id_fkey (
              full_name,
              business_name,
              phone
            )
          )
        `)
        .eq('agent_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = async () => {
    if (!locationPermission) {
      toast.error('Location permission not granted');
      return;
    }

    try {
      const position = await Geolocation.getCurrentPosition();
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting location:', error);
      toast.error('Failed to get current location');
      return null;
    }
  };

  const updateAssignmentStatus = async (assignmentId: string, status: string) => {
    try {
      const location = await updateLocation();
      const updateData: any = {
        status,
        current_location: location,
        updated_at: new Date().toISOString()
      };

      if (status === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
      } else if (status === 'in_progress') {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('agent_assignments')
        .update(updateData)
        .eq('id', assignmentId);

      if (error) throw error;
      
      toast.success(`Order ${status.replace('_', ' ')}`);
      fetchAssignments();
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    }
  };

  const pendingAssignments = assignments.filter(a => a.status === 'assigned');
  const activeAssignments = assignments.filter(a => ['accepted', 'in_progress'].includes(a.status));
  const completedAssignments = assignments.filter(a => a.status === 'completed');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Agent Dashboard</h1>
          <p className="text-muted-foreground">Quality verification assignments</p>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              Pending ({pendingAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({activeAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedAssignments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingAssignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onStatusUpdate={updateAssignmentStatus}
              />
            ))}
            {pendingAssignments.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending assignments</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {activeAssignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onStatusUpdate={updateAssignmentStatus}
              />
            ))}
            {activeAssignments.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active assignments</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedAssignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onStatusUpdate={updateAssignmentStatus}
              />
            ))}
            {completedAssignments.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No completed assignments</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

interface AssignmentCardProps {
  assignment: Assignment;
  onStatusUpdate: (id: string, status: string) => void;
}

const AssignmentCard: React.FC<AssignmentCardProps> = ({ assignment, onStatusUpdate }) => {
  const getNextAction = () => {
    switch (assignment.status) {
      case 'assigned':
        return {
          label: 'Accept Order',
          action: () => onStatusUpdate(assignment.id, 'accepted'),
          variant: 'default' as const
        };
      case 'accepted':
        return {
          label: 'Start Verification',
          action: () => onStatusUpdate(assignment.id, 'in_progress'),
          variant: 'default' as const
        };
      case 'in_progress':
        return {
          label: 'Complete Verification',
          action: () => onStatusUpdate(assignment.id, 'completed'),
          variant: 'default' as const
        };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Order #{assignment.order.order_number}
          </CardTitle>
          <Badge variant={getStatusBadgeVariant(assignment.status)}>
            {assignment.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        <CardDescription>
          Amount: ₹{assignment.order.total_amount}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
            <div className="text-sm">
              <p className="font-medium">Delivery Address:</p>
              <p className="text-muted-foreground">{assignment.order.shipping_address}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium">Buyer:</p>
            <p className="text-muted-foreground">{assignment.order.buyer?.full_name}</p>
            <p className="text-muted-foreground">{assignment.order.buyer?.phone}</p>
          </div>
          <div>
            <p className="font-medium">Seller:</p>
            <p className="text-muted-foreground">{assignment.order.seller?.business_name || assignment.order.seller?.full_name}</p>
            <p className="text-muted-foreground">{assignment.order.seller?.phone}</p>
          </div>
        </div>

        {assignment.current_location && (
          <div className="text-xs text-muted-foreground">
            <p>Last location update: {new Date(assignment.current_location.timestamp).toLocaleString()}</p>
          </div>
        )}

        {nextAction && (
          <Button 
            onClick={nextAction.action}
            variant={nextAction.variant}
            className="w-full"
          >
            {nextAction.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentDashboard;
