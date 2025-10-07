import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Package, DollarSign, TrendingUp } from 'lucide-react';

interface SalesSummary {
  date: string;
  totalOrders: number;
  totalAmount: number;
  totalItems: number;
}

interface OrderHistory {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  order_items: {
    quantity: number;
    unit_price: number;
    products: {
      name: string;
      unit: string;
    };
  }[];
  buyer_id: string;
}

const SalesHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [salesSummary, setSalesSummary] = useState<SalesSummary[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchSalesData();
  }, [timeRange]);

  const fetchSalesData = async () => {
    try {
      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Fetch completed orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            unit_price,
            products (name, unit)
          )
        `)
        .eq('seller_id', user?.id)
        .eq('status', 'delivered')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ordersData = orders as OrderHistory[] || [];
      setOrderHistory(ordersData);

      // Group by date for summary
      const summaryMap = new Map<string, SalesSummary>();
      
      ordersData.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        const totalItems = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
        
        if (summaryMap.has(date)) {
          const existing = summaryMap.get(date)!;
          existing.totalOrders += 1;
          existing.totalAmount += Number(order.total_amount);
          existing.totalItems += totalItems;
        } else {
          summaryMap.set(date, {
            date,
            totalOrders: 1,
            totalAmount: Number(order.total_amount),
            totalItems,
          });
        }
      });

      setSalesSummary(Array.from(summaryMap.values()).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTotalStats = () => {
    return {
      totalRevenue: salesSummary.reduce((sum, day) => sum + day.totalAmount, 0),
      totalOrders: salesSummary.reduce((sum, day) => sum + day.totalOrders, 0),
      totalItems: salesSummary.reduce((sum, day) => sum + day.totalItems, 0),
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Sales History</h2>
          <p className="text-muted-foreground">Track your completed sales and revenue</p>
        </div>
        
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">₹{stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From {stats.totalOrders} completed orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Completed</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">Total units sold</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Sales Summary */}
      {salesSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales Summary</CardTitle>
            <CardDescription>Revenue breakdown by day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {salesSummary.slice(0, 10).map((day) => (
                <div key={day.date} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {new Date(day.date).toLocaleDateString('en-IN', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {day.totalOrders} orders • {day.totalItems} items
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">₹{day.totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Completed Orders</CardTitle>
          <CardDescription>Your latest delivered orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orderHistory.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">{order.order_number}</p>
                  <p className="text-sm text-muted-foreground">
                    Customer ID: {order.buyer_id} • {new Date(order.created_at).toLocaleDateString('en-IN')}
                  </p>
                  <div className="text-xs text-muted-foreground mt-1">
                    {order.order_items.map((item, index) => (
                      <span key={index}>
                        {item.products.name} ({item.quantity} {item.products.unit})
                        {index < order.order_items.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">₹{order.total_amount}</p>
                  <Badge variant="default" className="mt-1">
                    {order.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {salesSummary.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No sales history yet</h3>
          <p className="text-muted-foreground">
            Your completed sales will appear here once orders are delivered
          </p>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;