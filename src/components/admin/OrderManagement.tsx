import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, User, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  shipping_address: string;
  agent_status: string;
  created_at: string;
  buyer: {
    full_name: string;
    phone: string;
  };
  seller: {
    full_name: string;
    business_name: string;
  };
  agent_assignment?: {
    agent: {
      full_name: string;
      phone: string;
    };
    status: string;
    current_location: any;
  };
}

interface Agent {
  id: string;
  full_name: string;
  phone: string;
  email: string;
}

const OrderManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    fetchAgents();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          buyer:profiles!orders_buyer_id_fkey(full_name, phone),
          seller:profiles!orders_seller_id_fkey(full_name, business_name),
          agent_assignment:agent_assignments(
            status,
            current_location,
            agent:profiles!agent_assignments_agent_id_fkey(
              full_name,
              phone
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, email')
        .eq('role', 'agent')
        .eq('is_active', true);

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const assignAgent = async (orderId: string, agentId: string) => {
    try {
      // Check if assignment already exists
      const { data: existing } = await supabase
        .from('agent_assignments')
        .select('id')
        .eq('order_id', orderId)
        .single();

      if (existing) {
        toast.error('Order is already assigned to an agent');
        return;
      }

      // Create new assignment
      const { error: assignError } = await supabase
        .from('agent_assignments')
        .insert({
          order_id: orderId,
          agent_id: agentId,
          status: 'assigned'
        });

      if (assignError) throw assignError;

      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ agent_status: 'assigned' })
        .eq('id', orderId);

      if (orderError) throw orderError;

      toast.success('Agent assigned successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error assigning agent:', error);
      toast.error('Failed to assign agent');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'unassigned': return 'secondary';
      case 'assigned': return 'outline';
      case 'accepted': return 'default';
      case 'in_progress': return 'outline';
      case 'completed': return 'default';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Order Management</h2>
        <p className="text-muted-foreground">Assign agents for order verification</p>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Order #{order.order_number}</CardTitle>
                  <CardDescription>₹{order.total_amount}</CardDescription>
                </div>
                <Badge variant={getStatusBadgeVariant(order.agent_status)}>
                  {order.agent_status?.replace('_', ' ').toUpperCase() || 'UNASSIGNED'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Buyer:</span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    {order.buyer?.full_name}<br />
                    {order.buyer?.phone}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Seller:</span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    {order.seller?.business_name || order.seller?.full_name}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Delivery Address:</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  {order.shipping_address}
                </p>
              </div>

              {order.agent_assignment?.[0] ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Assigned Agent:</span>
                  </div>
                  <div className="ml-6 space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {order.agent_assignment[0].agent?.full_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.agent_assignment[0].agent?.phone}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {order.agent_assignment[0].status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {order.agent_assignment[0].current_location && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>Location tracked</span>
                        <Clock className="h-3 w-3 ml-2" />
                        <span>
                          {new Date(order.agent_assignment[0].current_location.timestamp).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Select onValueChange={(agentId) => assignAgent(order.id, agentId)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Assign an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.full_name} - {agent.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {orders.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No orders found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrderManagement;