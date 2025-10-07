import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  paid_at: string;
  created_at: string;
  order_id: string;
  orders: {
    order_number: string;
    buyer_id: string;
  };
}

const PaymentTracking = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingPayments: 0,
    completedPayments: 0,
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          orders (
            order_number,
            buyer_id,
            seller_id
          )
        `)
        .eq('orders.seller_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const paymentsData = data as Payment[] || [];
      setPayments(paymentsData);

      // Calculate stats
      const totalEarnings = paymentsData
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + Number(p.amount), 0);
      
      const pendingPayments = paymentsData
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + Number(p.amount), 0);
      
      const completedPayments = paymentsData
        .filter(p => p.status === 'completed').length;

      setStats({
        totalEarnings,
        pendingPayments,
        completedPayments,
      });
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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Payment Tracking</h2>
        <p className="text-muted-foreground">Monitor your earnings and payment status</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">₹{stats.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From completed payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">₹{stats.pendingPayments.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedPayments}</div>
            <p className="text-xs text-muted-foreground">Successfully received</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment List */}
      <div className="space-y-4">
        {payments.map((payment) => (
          <Card key={payment.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {payment.orders.order_number}
                  </CardTitle>
                  <CardDescription>
                    Customer ID: {payment.orders.buyer_id}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={getStatusVariant(payment.status) as any}>
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </Badge>
                  <span className="text-xl font-bold text-primary">₹{payment.amount}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Payment Method:</span>
                  <br />
                  <div className="flex items-center gap-1 mt-1">
                    <CreditCard className="w-3 h-3" />
                    {payment.payment_method || 'Not specified'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Created:</span>
                  <br />
                  {new Date(payment.created_at).toLocaleDateString('en-IN')}
                </div>
                {payment.paid_at && (
                  <div>
                    <span className="font-medium">Paid:</span>
                    <br />
                    {new Date(payment.paid_at).toLocaleDateString('en-IN')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {payments.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No payments yet</h3>
          <p className="text-muted-foreground">
            Payment information will appear here when customers make purchases
          </p>
        </div>
      )}
    </div>
  );
};

export default PaymentTracking;