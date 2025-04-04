
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { getDB } from "@/lib/db";
import { useAuthContext } from "@/contexts/AuthContext";
import { generateTicketPDF } from "@/services/pdfService";
import { Download, Ticket } from "lucide-react";

interface Booking {
  id: number;
  showTitle: string;
  description: string;
  showDate: string;
  startTime: string;
  seats: string;
  totalPrice: number;
  status: string;
  createdAt: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const { currentUser } = useAuthContext();
  
  useEffect(() => {
    const fetchBookings = () => {
      if (!currentUser) return;
      
      const db = getDB();
      if (!db) return;
      
      try {
        const bookingsData = db.prepare(`
          SELECT 
            b.id,
            s.title as show_title,
            s.description,
            st.show_date,
            st.start_time,
            b.seats,
            b.total_price,
            b.status,
            b.created_at
          FROM bookings b
          JOIN show_times st ON b.show_time_id = st.id
          JOIN shows s ON st.show_id = s.id
          WHERE b.user_id = ?
          ORDER BY b.created_at DESC
        `).all(currentUser.id);
        
        const formattedBookings = bookingsData.map((booking: any) => ({
          id: booking.id,
          showTitle: booking.show_title,
          description: booking.description,
          showDate: booking.show_date,
          startTime: booking.start_time,
          seats: booking.seats,
          totalPrice: booking.total_price,
          status: booking.status,
          createdAt: booking.created_at
        }));
        
        setBookings(formattedBookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };
    
    fetchBookings();
  }, [currentUser]);
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-US');
  };
  
  const handleDownloadTicket = async (booking: Booking) => {
    try {
      const seats = JSON.parse(booking.seats);
      
      const bookingData = {
        id: booking.id,
        showTitle: booking.showTitle,
        showDate: booking.showDate,
        startTime: booking.startTime,
        seats,
        customerName: currentUser?.username || "Guest",
        totalPrice: booking.totalPrice
      };
      
      const pdfBlob = await generateTicketPDF(bookingData);
      
      // Create a blob URL
      const url = URL.createObjectURL(pdfBlob);
      
      // Create a link and click it to download
      const link = document.createElement('a');
      link.href = url;
      link.download = `ticket-${booking.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error generating ticket:", error);
    }
  };
  
  return (
    <div className="container py-8">
      <Heading 
        title="My Bookings"
        description="View your booking history"
        className="mb-8 text-center"
      />
      
      {bookings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.map((booking) => {
            const seats = JSON.parse(booking.seats);
            return (
              <Card key={booking.id} className="overflow-hidden">
                <div className="bg-accent p-2 flex items-center justify-between">
                  <div className="flex items-center">
                    <Ticket className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">Booking #{booking.id}</span>
                  </div>
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                    {booking.status}
                  </span>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{booking.showTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <p className="font-medium">{formatDate(booking.showDate)}</p>
                        <p className="text-muted-foreground">{booking.startTime}</p>
                      </div>
                      <div className="text-sm text-right">
                        <p className="font-medium">Total</p>
                        <p className="text-muted-foreground">${booking.totalPrice.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-1">Seats</p>
                    <div className="flex flex-wrap gap-1">
                      {seats.map((seat: any, index: number) => (
                        <span 
                          key={index}
                          className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs"
                        >
                          {seat.seatNumber}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Booked on: {formatDateTime(booking.createdAt)}
                  </div>
                  
                  <Button 
                    className="w-full mt-2"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadTicket(booking)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download E-Ticket
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">You don't have any bookings yet</p>
          <Button onClick={() => window.location.href = "/"}>
            Browse Shows
          </Button>
        </div>
      )}
    </div>
  );
}
