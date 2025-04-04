
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SeatingPlan, SeatStatus } from "@/components/SeatingPlan";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { getDB } from "@/lib/db";
import { useCartContext } from "@/contexts/CartContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Show {
  id: number;
  title: string;
  description: string;
  poster: string;
  duration: number;
}

interface ShowTime {
  id: number;
  showId: number;
  showDate: string;
  startTime: string;
  price: number;
  seatingMap: SeatStatus[][];
}

export default function ShowBookingPage() {
  const { showId, showTimeId } = useParams<{ showId: string, showTimeId: string }>();
  const { currentUser, isAuthenticated } = useAuthContext();
  const { addToCart } = useCartContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [show, setShow] = useState<Show | null>(null);
  const [showTime, setShowTime] = useState<ShowTime | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<{ row: number; col: number; seatNumber: string; }[]>([]);
  
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please login to book tickets",
        variant: "destructive",
      });
      navigate("/login", { state: { from: `/shows/${showId}/booking/${showTimeId}` } });
      return;
    }
    
    const fetchShowAndTime = () => {
      const db = getDB();
      if (!db) return;
      
      try {
        // Get show details
        const showData = db.prepare(`
          SELECT id, title, description, poster, duration
          FROM shows
          WHERE id = ?
        `).get(showId);
        
        // Get showtime details
        const showTimeData = db.prepare(`
          SELECT id, show_id, show_date, start_time, price, seating_map
          FROM show_times
          WHERE id = ?
        `).get(showTimeId);
        
        if (showData) {
          setShow(showData);
        }
        
        if (showTimeData) {
          setShowTime({
            ...showTimeData,
            showId: showTimeData.show_id,
            showDate: showTimeData.show_date,
            startTime: showTimeData.start_time,
            seatingMap: JSON.parse(showTimeData.seating_map),
          });
        }
      } catch (error) {
        console.error("Error fetching show and time:", error);
        toast({
          title: "Error",
          description: "Could not load the selected show",
          variant: "destructive",
        });
      }
    };
    
    fetchShowAndTime();
  }, [showId, showTimeId, isAuthenticated, navigate, toast]);
  
  const handleSeatClick = (row: number, col: number) => {
    const seatNumber = `${String.fromCharCode(65 + row)}${col + 1}`;
    
    // Check if seat is already selected
    const seatIndex = selectedSeats.findIndex(
      seat => seat.row === row && seat.col === col
    );
    
    if (seatIndex >= 0) {
      // Remove seat if already selected
      setSelectedSeats(selectedSeats.filter((_, i) => i !== seatIndex));
    } else {
      // Add seat to selection
      setSelectedSeats([...selectedSeats, { row, col, seatNumber }]);
    }
  };
  
  const handleAddToCart = () => {
    if (!show || !showTime || selectedSeats.length === 0) {
      toast({
        title: "Selection required",
        description: "Please select at least one seat",
        variant: "destructive",
      });
      return;
    }
    
    addToCart({
      showTimeId: showTime.id,
      showId: show.id,
      showTitle: show.title,
      showDate: showTime.showDate,
      startTime: showTime.startTime,
      seats: selectedSeats,
      pricePerSeat: showTime.price
    });
    
    toast({
      title: "Added to cart",
      description: `${selectedSeats.length} seat(s) added for ${show.title}`,
    });
    
    navigate("/cart");
  };
  
  // Format date and time for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  if (!show || !showTime) {
    return (
      <div className="container py-12 text-center">
        <p>Loading show details...</p>
      </div>
    );
  }
  
  return (
    <div className="container py-8">
      <Heading 
        title={show.title}
        description="Select your seats"
        className="mb-8 text-center"
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Seating Plan</CardTitle>
              <CardDescription>
                Click on seats to select them
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SeatingPlan 
                seatingMap={showTime.seatingMap}
                selectedSeats={selectedSeats}
                onSeatClick={handleSeatClick}
                maxSelections={10}
              />
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium">Show</h3>
                <p>{show.title}</p>
              </div>
              <div>
                <h3 className="font-medium">Date</h3>
                <p>{formatDate(showTime.showDate)}</p>
              </div>
              <div>
                <h3 className="font-medium">Time</h3>
                <p>{showTime.startTime}</p>
              </div>
              <div>
                <h3 className="font-medium">Seats</h3>
                {selectedSeats.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {selectedSeats.map(seat => (
                      <span key={`${seat.row}-${seat.col}`} className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs">
                        {seat.seatNumber}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No seats selected</p>
                )}
              </div>
              <div>
                <h3 className="font-medium">Price</h3>
                <div className="flex justify-between">
                  <p>{selectedSeats.length} × ${showTime.price.toFixed(2)}</p>
                  <p className="font-bold">${(selectedSeats.length * showTime.price).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full"
                disabled={selectedSeats.length === 0}
                onClick={handleAddToCart}
              >
                Add to Cart
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
