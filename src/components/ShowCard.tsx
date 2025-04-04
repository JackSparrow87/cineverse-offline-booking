
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

interface ShowTime {
  id: number;
  showDate: string;
  startTime: string;
  price: number;
}

interface ShowCardProps {
  id: number;
  title: string;
  description: string;
  poster: string;
  duration: number;
  showTimes: ShowTime[];
}

export function ShowCard({ id, title, description, poster, duration, showTimes }: ShowCardProps) {
  // Format date and time nicely
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const formatTime = (timeStr: string) => {
    return timeStr;
  };
  
  // Group showtimes by date
  const groupedShowTimes: Record<string, typeof showTimes> = {};
  
  showTimes.forEach(showTime => {
    if (!groupedShowTimes[showTime.showDate]) {
      groupedShowTimes[showTime.showDate] = [];
    }
    groupedShowTimes[showTime.showDate].push(showTime);
  });
  
  // Default poster for missing images
  const imgSrc = poster || "/placeholder.svg";
  
  return (
    <Card className="h-full overflow-hidden hover:shadow-xl transition-shadow">
      <div className="relative pt-[56.25%] bg-muted">
        <img 
          src={imgSrc} 
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
      </div>
      <CardHeader className="py-3">
        <CardTitle className="line-clamp-1">{title}</CardTitle>
        <div className="flex items-center text-muted-foreground text-sm">
          <Clock className="w-4 h-4 mr-1" />
          <span>{duration} min</span>
        </div>
      </CardHeader>
      <CardContent className="py-2">
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
      </CardContent>
      <CardFooter className="flex flex-col items-start pt-2 pb-4">
        <h4 className="text-sm font-medium mb-2">Showtimes:</h4>
        <div className="w-full space-y-2">
          {Object.keys(groupedShowTimes).length > 0 ? (
            Object.entries(groupedShowTimes).map(([date, times]) => (
              <div key={date} className="space-y-1">
                <div className="flex items-center text-xs">
                  <Calendar className="w-3 h-3 mr-1 text-muted-foreground" />
                  <span className="font-medium">{formatDate(date)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {times.map(time => (
                    <Link 
                      key={time.id} 
                      to={`/shows/${id}/booking/${time.id}`}
                      className="no-underline"
                    >
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs h-8 px-2"
                      >
                        {formatTime(time.startTime)}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No showtimes available</p>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
