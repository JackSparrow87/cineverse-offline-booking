
import { useEffect, useState } from "react";
import { Heading } from "@/components/ui/heading";
import { ShowCard } from "@/components/ShowCard";
import { getDB } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Show {
  id: number;
  title: string;
  description: string;
  poster: string;
  duration: number;
  showTimes: Array<{
    id: number;
    showDate: string;
    startTime: string;
    price: number;
  }>;
}

export default function HomePage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("all");
  
  useEffect(() => {
    const fetchShows = () => {
      const db = getDB();
      if (!db) return;
      
      try {
        // Get all shows
        const showsData = db.prepare(`
          SELECT id, title, description, poster, duration
          FROM shows
          ORDER BY title
        `).all();
        
        // Get all show times
        const allShowTimes = db.prepare(`
          SELECT id, show_id, show_date, start_time, price
          FROM show_times
          ORDER BY show_date, start_time
        `).all();
        
        // Group showtimes by show_id
        const showTimesMap: Record<number, any[]> = {};
        const uniqueDates = new Set<string>();
        
        allShowTimes.forEach((showTime: any) => {
          uniqueDates.add(showTime.show_date);
          
          if (!showTimesMap[showTime.show_id]) {
            showTimesMap[showTime.show_id] = [];
          }
          
          showTimesMap[showTime.show_id].push({
            id: showTime.id,
            showDate: showTime.show_date,
            startTime: showTime.start_time,
            price: showTime.price
          });
        });
        
        // Add showtimes to each show
        const showsWithTimes = showsData.map((show: any) => ({
          ...show,
          showTimes: showTimesMap[show.id] || []
        }));
        
        setShows(showsWithTimes);
        
        // Set dates for filtering
        setDates(Array.from(uniqueDates).sort());
        
        // Default to first date if available
        if (uniqueDates.size > 0 && selectedDate === "all") {
          setSelectedDate(Array.from(uniqueDates).sort()[0]);
        }
      } catch (error) {
        console.error("Error fetching shows:", error);
      }
    };
    
    fetchShows();
  }, [selectedDate]);
  
  // Filter shows by selected date
  const filteredShows = shows.map(show => {
    if (selectedDate === "all") {
      return show;
    }
    
    return {
      ...show,
      showTimes: show.showTimes.filter(st => st.showDate === selectedDate)
    };
  }).filter(show => selectedDate === "all" || show.showTimes.length > 0);
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const today = new Date().toISOString().split('T')[0];
  
  return (
    <div className="container py-8">
      <Heading 
        title="Now Showing"
        description="Book your tickets for the latest shows"
        className="mb-8 text-center"
      />
      
      <Tabs defaultValue={selectedDate} className="mb-8">
        <div className="flex justify-center">
          <TabsList className="mb-8">
            {dates.map(date => (
              <TabsTrigger 
                key={date} 
                value={date}
                onClick={() => setSelectedDate(date)}
                className={date === today ? "text-primary" : ""}
              >
                {formatDate(date)}
              </TabsTrigger>
            ))}
            <TabsTrigger 
              value="all"
              onClick={() => setSelectedDate("all")}
            >
              All Shows
            </TabsTrigger>
          </TabsList>
        </div>
        
        {dates.map(date => (
          <TabsContent key={date} value={date}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredShows.map(show => (
                <ShowCard key={show.id} {...show} />
              ))}
            </div>
            
            {filteredShows.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No shows available for this date.</p>
              </div>
            )}
          </TabsContent>
        ))}
        
        <TabsContent value="all">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shows.map(show => (
              <ShowCard key={show.id} {...show} />
            ))}
          </div>
          
          {shows.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No shows available.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
