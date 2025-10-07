import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Package, Star, X, LogOut, Home, Minus, Plus, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: string;
  quality_grade: string;
  origin: string;
  stock_quantity: number;
  images: string[];
  seller_id: string;
  profiles: {
    business_name: string;
    full_name: string;
  };
}

interface CartItem {
  product: Product;
  quantity: number;
}

const BuyerDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<{[key: string]: number}>({});
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [processingOrder, setProcessingOrder] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles (
            business_name,
            full_name
          )
        `)
        .eq('is_active', true)
        .gt('stock_quantity', 0);

      if (error) throw error;
      setProducts(data || []);
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

  const addToCart = (productId: string, quantity: number = 1) => {
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + quantity
    }));
    toast({
      title: 'Added to Cart',
      description: 'Product added to your cart successfully!',
    });
  };

  const updateCartQuantity = (productId: string, change: number) => {
    setCart(prev => {
      const newQuantity = (prev[productId] || 0) + change;
      if (newQuantity <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: newQuantity };
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const { [productId]: _, ...rest } = prev;
      return rest;
    });
    toast({
      title: 'Removed from Cart',
      description: 'Product removed from your cart.',
    });
  };

  const getCartItems = (): CartItem[] => {
    return Object.entries(cart).map(([productId, quantity]) => ({
      product: products.find(p => p.id === productId)!,
      quantity
    })).filter(item => item.product);
  };

  const getTotalAmount = () => {
    return getCartItems().reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const handlePlaceOrder = async () => {
    if (!shippingAddress.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a shipping address',
        variant: 'destructive',
      });
      return;
    }

    setProcessingOrder(true);
    try {
      const cartItems = getCartItems();
      const totalAmount = getTotalAmount();
      const advanceAmount = totalAmount * 0.5;

      // Create order for each seller
      const sellerOrders = cartItems.reduce((acc, item) => {
        const sellerId = item.product.seller_id;
        if (!acc[sellerId]) {
          acc[sellerId] = [];
        }
        acc[sellerId].push(item);
        return acc;
      }, {} as {[key: string]: CartItem[]});

      for (const [sellerId, items] of Object.entries(sellerOrders)) {
        const orderTotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            buyer_id: user?.id,
            seller_id: sellerId,
            total_amount: orderTotal,
            shipping_address: shippingAddress,
            billing_address: billingAddress || shippingAddress,
            notes: notes,
            status: 'pending'
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order items
        const orderItems = items.map(item => ({
          order_id: order.id,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        // Create advance payment record
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            order_id: order.id,
            amount: orderTotal * 0.5,
            status: 'pending',
            payment_method: 'advance_payment'
          });

        if (paymentError) throw paymentError;
      }

      toast({
        title: 'Order Placed Successfully!',
        description: `Please pay 50% advance amount: ₹${advanceAmount.toFixed(2)}. Remaining 50% will be collected after agent verification.`,
      });

      setCart({});
      setShowCart(false);
      setShowCheckout(false);
      setShippingAddress('');
      setBillingAddress('');
      setNotes('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingOrder(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(products.map(p => p.category))];
  const cartItemsCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const cartItems = getCartItems();
  const totalAmount = getTotalAmount();
  const advanceAmount = totalAmount * 0.5;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-primary">Cashew Marketplace</h1>
                <p className="text-sm text-muted-foreground">Welcome, {user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" className="relative" onClick={() => setShowCart(true)}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Cart
                {cartItemsCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 px-2 py-1 text-xs">
                    {cartItemsCount}
                  </Badge>
                )}
              </Button>
              <Button onClick={signOut} variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Browse Products</h1>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="p-0">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted flex items-center justify-center rounded-t-lg">
                    <Package className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
              </CardHeader>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <Badge variant="secondary">{product.category}</Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {product.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-primary">
                      ₹{product.price}/{product.unit}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-muted-foreground">4.5</span>
                    </div>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quality:</span>
                      <span>{product.quality_grade || 'Premium'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Origin:</span>
                      <span>{product.origin || 'India'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stock:</span>
                      <span>{product.stock_quantity} {product.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Seller:</span>
                      <span className="text-xs">
                        {product.profiles?.business_name || product.profiles?.full_name}
                      </span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => addToCart(product.id)}
                    className="w-full"
                    disabled={product.stock_quantity === 0}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No products found</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'No products are currently available'}
            </p>
          </div>
        )}
      </div>

      {/* Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shopping Cart</DialogTitle>
            <DialogDescription>
              Review your items and proceed to checkout
            </DialogDescription>
          </DialogHeader>
          
          {cartItems.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map(({ product, quantity }) => (
                <Card key={product.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-20 h-20 object-cover rounded"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-muted flex items-center justify-center rounded">
                          <Package className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">₹{product.price}/{product.unit}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateCartQuantity(product.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-12 text-center">{quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateCartQuantity(product.id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{(product.price * quantity).toFixed(2)}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromCart(product.id)}
                          className="mt-2"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold mb-4">
                  <span>Total Amount:</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => {
                    setShowCart(false);
                    setShowCheckout(true);
                  }}
                >
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>
              Enter delivery details and complete your order
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shipping">Shipping Address *</Label>
              <Textarea
                id="shipping"
                placeholder="Enter complete shipping address"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing">Billing Address (Optional)</Label>
              <Textarea
                id="billing"
                placeholder="Leave blank to use shipping address"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Order Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Card className="bg-muted">
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-bold">₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-primary">
                  <span>Advance Payment (50%):</span>
                  <span className="font-bold">₹{advanceAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Balance After Agent Verification (50%):</span>
                  <span>₹{advanceAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCheckout(false);
                  setShowCart(true);
                }}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Cart
              </Button>
              <Button 
                onClick={handlePlaceOrder}
                disabled={processingOrder || !shippingAddress.trim()}
                className="flex-1"
              >
                {processingOrder ? 'Processing...' : `Pay ₹${advanceAmount.toFixed(2)} & Place Order`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerDashboard;