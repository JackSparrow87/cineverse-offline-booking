
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type SeatStatus = 0 | 1 | 2;  // 0 = available, 1 = reserved, 2 = space

interface SeatingPlanProps {
  seatingMap: SeatStatus[][];
  selectedSeats: { row: number; col: number; seatNumber: string }[];
  onSeatClick: (row: number, col: number) => void;
  maxSelections?: number;
}

export function SeatingPlan({ 
  seatingMap, 
  selectedSeats, 
  onSeatClick, 
  maxSelections = 10 
}: SeatingPlanProps) {
  const [showLegend, setShowLegend] = useState(false);
  
  // Generate seat number (e.g., A1, B2)
  const getSeatNumber = (row: number, col: number) => {
    const rowLabel = String.fromCharCode(65 + row); // A, B, C...
    const seatNumber = col + 1;
    return `${rowLabel}${seatNumber}`;
  };
  
  // Check if seat is in selected list
  const isSeatSelected = (row: number, col: number) => {
    return selectedSeats.some(seat => seat.row === row && seat.col === col);
  };
  
  const handleSeatClick = (row: number, col: number, status: SeatStatus) => {
    // Only handle available seats
    if (status !== 0) return;
    
    // Check if we're selecting or deselecting
    const isSelected = isSeatSelected(row, col);
    
    // If selecting and we've reached max, don't allow more selections
    if (!isSelected && selectedSeats.length >= maxSelections) {
      return;
    }
    
    onSeatClick(row, col);
  };
  
  return (
    <div className="space-y-4 w-full">
      <div className="w-full bg-muted/30 p-2 rounded-lg flex flex-col items-center">
        <div className="w-full bg-card p-1 rounded-lg mb-4">
          <div className="bg-primary/20 text-center p-2 rounded">
            SCREEN
          </div>
        </div>
        
        <div className="overflow-x-auto w-full p-4">
          {seatingMap.map((row, rowIndex) => (
            <div 
              key={rowIndex} 
              className="flex justify-center mb-1"
            >
              <div className="w-6 flex items-center justify-center mr-2 text-muted-foreground text-xs">
                {String.fromCharCode(65 + rowIndex)}
              </div>
              
              {row.map((status, colIndex) => {
                const isSelected = isSeatSelected(rowIndex, colIndex);
                
                if (status === 2) {
                  // Space/Aisle
                  return <div key={colIndex} className="seat seat-space" />;
                }
                
                return (
                  <div
                    key={colIndex}
                    className={cn(
                      "seat",
                      status === 0 && !isSelected && "seat-available",
                      status === 1 && "seat-reserved",
                      isSelected && "seat-selected"
                    )}
                    onClick={() => handleSeatClick(rowIndex, colIndex, status)}
                  >
                    {colIndex + 1}
                  </div>
                );
              })}
              
              <div className="w-6 flex items-center justify-center ml-2 text-muted-foreground text-xs">
                {String.fromCharCode(65 + rowIndex)}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 justify-center">
        <div onClick={() => setShowLegend(!showLegend)} className="cursor-pointer">
          <Button variant="outline" type="button" size="sm">
            {showLegend ? "Hide Legend" : "Show Legend"}
          </Button>
        </div>
        
        {selectedSeats.length > 0 && (
          <div className="text-sm">
            Selected: {selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'}
          </div>
        )}
      </div>
      
      {showLegend && (
        <div className="flex flex-wrap gap-4 justify-center text-xs">
          <div className="flex items-center">
            <div className="seat-available seat w-6 h-6 mr-2"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center">
            <div className="seat-selected seat w-6 h-6 mr-2"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center">
            <div className="seat-reserved seat w-6 h-6 mr-2"></div>
            <span>Reserved</span>
          </div>
        </div>
      )}
    </div>
  );
}
