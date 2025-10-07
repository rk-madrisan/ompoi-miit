import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, TrendingUp, Star, Target } from 'lucide-react';

interface ProductAnalytics {
  product_id: string;
  product_name: string;
  total_quantity_sold: number;
  total_revenue: number;
  order_count: number;
  avg_order_value: number;
  category: string;
  unit: string;
}

interface CategoryAnalytics {
  category: string;
  total_revenue: number;
  total_quantity: number;
  order_count: number;
}

const SalesAnalytics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics[]>([]);
  const [categoryAnalytics, setCategoryAnalytics] = useState<CategoryAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch product analytics from completed orders
      const { data: analytics, error } = await supabase
        .from('order_items')
        .select(`
          quantity,
          unit_price,
          total_price,
          products!inner (
            id,
            name,
            category,
            unit,
            seller_id
          ),
          orders!inner (
            status,
            seller_id
          )
        `)
        .eq('products.seller_id', user?.id)
        .eq('orders.status', 'delivered');

      if (error) throw error;

      // Group by product
      const productMap = new Map<string, ProductAnalytics>();
      const categoryMap = new Map<string, CategoryAnalytics>();

      analytics?.forEach(item => {
        const product = item.products;
        const productId = product.id;
        const category = product.category;

        // Product analytics
        if (productMap.has(productId)) {
          const existing = productMap.get(productId)!;
          existing.total_quantity_sold += item.quantity;
          existing.total_revenue += Number(item.total_price);
          existing.order_count += 1;
        } else {
          productMap.set(productId, {
            product_id: productId,
            product_name: product.name,
            total_quantity_sold: item.quantity,
            total_revenue: Number(item.total_price),
            order_count: 1,
            avg_order_value: Number(item.total_price),
            category: product.category,
            unit: product.unit,
          });
        }

        // Category analytics
        if (categoryMap.has(category)) {
          const existing = categoryMap.get(category)!;
          existing.total_revenue += Number(item.total_price);
          existing.total_quantity += item.quantity;
          existing.order_count += 1;
        } else {
          categoryMap.set(category, {
            category,
            total_revenue: Number(item.total_price),
            total_quantity: item.quantity,
            order_count: 1,
          });
        }
      });

      // Calculate average order values
      productMap.forEach(product => {
        product.avg_order_value = product.total_revenue / product.order_count;
      });

      // Sort by revenue and quantity
      const sortedProducts = Array.from(productMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue);
      
      const sortedCategories = Array.from(categoryMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue);

      setProductAnalytics(sortedProducts);
      setCategoryAnalytics(sortedCategories);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const topProduct = productAnalytics[0];
  const topCategory = categoryAnalytics[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Sales Analytics</h2>
        <p className="text-muted-foreground">Analyze your best-performing products and categories</p>
      </div>

      {/* Top Performers */}
      {(topProduct || topCategory) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {topProduct && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Product</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{topProduct.product_name}</div>
                <div className="text-sm text-muted-foreground mb-2">{topProduct.category}</div>
                <div className="text-2xl font-bold text-primary">₹{topProduct.total_revenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {topProduct.total_quantity_sold} {topProduct.unit} sold • {topProduct.order_count} orders
                </p>
              </CardContent>
            </Card>
          )}

          {topCategory && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Category</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{topCategory.category}</div>
                <div className="text-2xl font-bold text-primary">₹{topCategory.total_revenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {topCategory.total_quantity} units sold • {topCategory.order_count} orders
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Product Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Product Performance
          </CardTitle>
          <CardDescription>Your products ranked by revenue and sales volume</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {productAnalytics.slice(0, 10).map((product, index) => (
              <div key={product.product_id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{product.product_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {product.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {product.total_quantity_sold} {product.unit} sold
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">₹{product.total_revenue.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.order_count} orders • Avg: ₹{product.avg_order_value.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Performance */}
      {categoryAnalytics.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Category Performance
            </CardTitle>
            <CardDescription>Sales performance by product category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryAnalytics.map((category, index) => (
                <div key={category.category} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/10 text-secondary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{category.category}</p>
                      <p className="text-sm text-muted-foreground">
                        {category.total_quantity} units • {category.order_count} orders
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">₹{category.total_revenue.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      Avg: ₹{(category.total_revenue / category.order_count).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {productAnalytics.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No sales data yet</h3>
          <p className="text-muted-foreground">
            Analytics will appear here once you have completed sales
          </p>
        </div>
      )}
    </div>
  );
};

export default SalesAnalytics;