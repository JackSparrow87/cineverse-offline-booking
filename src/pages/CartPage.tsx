
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { useCartContext } from "@/contexts/CartContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { getDB, logAction } from "@/lib/db";
import { generateTicketPDF } from "@/services/pdfService";
import { Separator } from "@/components/ui/separator";
import { Trash2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CartPage() {
  const { currentUser } = useAuthContext();
  const { items, products, removeFromCart, getTotalPrice, clearCart, updateProductQuantity, removeProduct } = useCartContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const handleCheckout = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to complete your booking",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }
    
    if (items.length === 0) {
      toast({
        title: "Empty cart",
        description: "Please add some items to your cart first",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const db = getDB();
      if (!db) throw new Error("Database not accessible");
      
      // Create a transaction
      const result = db.transaction(() => {
        // For each show time in the cart, create a booking
        const bookings: number[] = [];
        
        for (const item of items) {
          // Insert booking
          const bookingResult = db.prepare(`
            INSERT INTO bookings (user_id, show_time_id, seats, total_price, status)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            currentUser.id,
            item.showTimeId,
            JSON.stringify(item.seats),
            item.seats.length * item.pricePerSeat,
            "confirmed"
          );
          
          const bookingId = bookingResult.lastInsertRowid as number;
          bookings.push(bookingId);
          
          // Update seating map
          const showTimeData = db.prepare(`
            SELECT seating_map FROM show_times WHERE id = ?
          `).get(item.showTimeId);
          
          if (showTimeData) {
            const seatingMap = JSON.parse(showTimeData.seating_map);
            
            // Mark selected seats as reserved
            item.seats.forEach(seat => {
              seatingMap[seat.row][seat.col] = 1;  // 1 = reserved
            });
            
            // Update the seating map
            db.prepare(`
              UPDATE show_times SET seating_map = ? WHERE id = ?
            `).run(JSON.stringify(seatingMap), item.showTimeId);
          }
          
          // Add products to booking if any
          for (const product of products) {
            db.prepare(`
              INSERT INTO order_items (booking_id, product_id, quantity)
              VALUES (?, ?, ?)
            `).run(
              bookingId,
              product.productId,
              product.quantity
            );
          }
        }
        
        // Log the transaction
        logAction(
          "Booking created", 
          `User ${currentUser.username} created booking(s): ${bookings.join(", ")}`, 
          currentUser.id
        );
        
        return bookings;
      })();
      
      // Generate ticket for download (just the first booking for now)
      if (items.length > 0 && result && result.length > 0) {
        const booking = {
          id: result[0],
          showTitle: items[0].showTitle,
          showDate: items[0].showDate,
          startTime: items[0].startTime,
          seats: items[0].seats,
          customerName: currentUser.username,
          totalPrice: getTotalPrice()
        };
        
        const pdfBlob = await generateTicketPDF(booking);
        
        // Create a blob URL
        const url = URL.createObjectURL(pdfBlob);
        
        // Create a link and click it to download
        const link = document.createElement('a');
        link.href = url;
        link.download = `ticket-${booking.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      toast({
        title: "Booking confirmed!",
        description: "Your e-ticket has been downloaded",
      });
      
      // Clear the cart
      clearCart();
      
      // Navigate to bookings page
      navigate("/bookings");
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout failed",
        description: "There was a problem processing your booking",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="container py-8">
      <Heading 
        title="Your Cart"
        description="Review your items before checkout"
        className="mb-8 text-center"
      />
      
      {items.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Selected Shows</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.showTimeId} className="bg-card rounded-lg p-4 shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-lg">{item.showTitle}</h3>
                        <p className="text-muted-foreground">
                          {formatDate(item.showDate)} • {item.startTime}
                        </p>
                        <div className="mt-2">
                          <p className="text-sm font-medium">Seats:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.seats.map((seat) => (
                              <span 
                                key={`${seat.row}-${seat.col}`}
                                className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs"
                              >
                                {seat.seatNumber}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="font-medium">
                          ${(item.seats.length * item.pricePerSeat).toFixed(2)}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive"
                          onClick={() => removeFromCart(item.showTimeId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            {products.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Concessions</CardTitle>
                </CardHeader>
                <CardContent>
                  {products.map((product) => (
                    <div key={product.productId} className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-muted-foreground">${product.price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateProductQuantity(product.productId, product.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{product.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateProductQuantity(product.productId, product.quantity + 1)}
                        >
                          +
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive h-8 w-8"
                          onClick={() => removeProduct(product.productId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.showTimeId} className="flex justify-between">
                    <span className="truncate max-w-[200px]">{item.showTitle} ({item.seats.length} seats)</span>
                    <span>${(item.seats.length * item.pricePerSeat).toFixed(2)}</span>
                  </div>
                ))}
                
                {products.length > 0 && (
                  <>
                    <Separator />
                    {products.map((product) => (
                      <div key={product.productId} className="flex justify-between">
                        <span>{product.name} × {product.quantity}</span>
                        <span>${(product.price * product.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </>
                )}
                
                <Separator />
                
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>${getTotalPrice().toFixed(2)}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={isProcessing || items.length === 0}
                >
                  {isProcessing ? "Processing..." : "Checkout"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Your cart is empty</p>
          <Button onClick={() => navigate("/")}>
            Browse Shows
          </Button>
        </div>
      )}
    </div>
  );
}
