
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getDB, logAction } from "@/lib/db";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Edit, Plus, Trash2, Calendar } from "lucide-react";

interface Show {
  id: number;
  title: string;
  description: string;
  poster: string;
  duration: number;
  showTimesCount: number;
}

export default function AdminShowsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  
  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [poster, setPoster] = useState("");
  const [duration, setDuration] = useState(0);
  
  // Show time form states
  const [showDate, setShowDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [price, setPrice] = useState(0);
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);
  
  const { isAdmin } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isAdmin) {
      toast({
        title: "Access denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
    
    fetchShows();
  }, [isAdmin, navigate, toast]);
  
  const fetchShows = () => {
    setIsLoading(true);
    
    const db = getDB();
    if (!db) {
      setIsLoading(false);
      return;
    }
    
    try {
      // Get shows with show time count
      const showsData = db.prepare(`
        SELECT s.id, s.title, s.description, s.poster, s.duration,
          (SELECT COUNT(*) FROM show_times WHERE show_id = s.id) as show_times_count
        FROM shows s
        ORDER BY s.title
      `).all();
      
      setShows(showsData);
    } catch (error) {
      console.error("Error fetching shows:", error);
      toast({
        title: "Error",
        description: "Failed to load show data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddEditShow = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !description || duration <= 0) {
      toast({
        title: "Validation error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }
    
    const db = getDB();
    if (!db) return;
    
    try {
      if (selectedShow) {
        // Update show
        db.prepare(`
          UPDATE shows
          SET title = ?, description = ?, poster = ?, duration = ?
          WHERE id = ?
        `).run(title, description, poster, duration, selectedShow.id);
        
        logAction("Show updated", `Show ID: ${selectedShow.id} (${title})`);
        
        toast({
          title: "Success",
          description: "Show updated successfully",
        });
      } else {
        // Add new show
        const result = db.prepare(`
          INSERT INTO shows (title, description, poster, duration)
          VALUES (?, ?, ?, ?)
        `).run(title, description, poster, duration);
        
        const newShowId = result.lastInsertRowid;
        logAction("Show added", `Show ID: ${newShowId} (${title})`);
        
        toast({
          title: "Success",
          description: "Show added successfully",
        });
      }
      
      setShowDialog(false);
      resetForm();
      fetchShows();
    } catch (error) {
      console.error("Error saving show:", error);
      toast({
        title: "Error",
        description: "Failed to save show data",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteShow = (showId: number, showTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${showTitle}"?`)) {
      return;
    }
    
    const db = getDB();
    if (!db) return;
    
    try {
      // Delete related show times and bookings
      db.transaction(() => {
        // Find all show time IDs
        const showTimeIds = db.prepare(`
          SELECT id FROM show_times WHERE show_id = ?
        `).all(showId).map((st: any) => st.id);
        
        // Delete bookings associated with these show times
        if (showTimeIds.length > 0) {
          const showTimeIdStr = showTimeIds.join(",");
          
          // Delete order items associated with bookings
          db.exec(`
            DELETE FROM order_items 
            WHERE booking_id IN (
              SELECT id FROM bookings WHERE show_time_id IN (${showTimeIdStr})
            )
          `);
          
          // Delete bookings
          db.exec(`
            DELETE FROM bookings WHERE show_time_id IN (${showTimeIdStr})
          `);
        }
        
        // Delete show times
        db.prepare(`
          DELETE FROM show_times WHERE show_id = ?
        `).run(showId);
        
        // Delete show
        db.prepare(`
          DELETE FROM shows WHERE id = ?
        `).run(showId);
      })();
      
      logAction("Show deleted", `Show ID: ${showId} (${showTitle})`);
      
      toast({
        title: "Success",
        description: "Show and all associated data deleted",
      });
      
      fetchShows();
    } catch (error) {
      console.error("Error deleting show:", error);
      toast({
        title: "Error",
        description: "Failed to delete show",
        variant: "destructive",
      });
    }
  };
  
  const handleAddShowTime = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!showDate || !startTime || price <= 0 || !selectedShowId) {
      toast({
        title: "Validation error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }
    
    const db = getDB();
    if (!db) return;
    
    try {
      // Generate a basic 8x10 seating map (all available)
      const generateSeatingMap = () => {
        const rows = 8;
        const cols = 10;
        const seats = [];
        
        for (let r = 0; r < rows; r++) {
          const row = [];
          for (let c = 0; c < cols; c++) {
            // 0 = available, 1 = reserved, 2 = space/aisle
            row.push(0);
          }
          seats.push(row);
        }
        
        // Add center aisle
        for (let r = 0; r < rows; r++) {
          seats[r][4] = 2;
          seats[r][5] = 2;
        }
        
        return JSON.stringify(seats);
      };
      
      // Check if show time already exists
      const existing = db.prepare(`
        SELECT COUNT(*) as count FROM show_times
        WHERE show_id = ? AND show_date = ? AND start_time = ?
      `).get(selectedShowId, showDate, startTime);
      
      if (existing && existing.count > 0) {
        toast({
          title: "Error",
          description: "A show time with this date and time already exists",
          variant: "destructive",
        });
        return;
      }
      
      // Add new show time
      db.prepare(`
        INSERT INTO show_times (show_id, show_date, start_time, price, seating_map)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        selectedShowId,
        showDate,
        startTime,
        price,
        generateSeatingMap()
      );
      
      logAction("Show time added", `Show ID: ${selectedShowId}, Date: ${showDate}, Time: ${startTime}`);
      
      toast({
        title: "Success",
        description: "Show time added successfully",
      });
      
      setShowTimeDialog(false);
      resetShowTimeForm();
      fetchShows();
    } catch (error) {
      console.error("Error adding show time:", error);
      toast({
        title: "Error",
        description: "Failed to add show time",
        variant: "destructive",
      });
    }
  };
  
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPoster("");
    setDuration(0);
    setSelectedShow(null);
  };
  
  const resetShowTimeForm = () => {
    setShowDate("");
    setStartTime("");
    setPrice(0);
    setSelectedShowId(null);
  };
  
  const handleEditClick = (show: Show) => {
    setSelectedShow(show);
    setTitle(show.title);
    setDescription(show.description);
    setPoster(show.poster || "");
    setDuration(show.duration);
    setShowDialog(true);
  };
  
  const handleAddShowTimeClick = (showId: number) => {
    setSelectedShowId(showId);
    setShowTimeDialog(true);
  };
  
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <Heading 
          title="Manage Shows"
          description="Add, edit or remove shows and showtimes"
        />
        <Button onClick={() => {
          resetForm();
          setShowDialog(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Show
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Shows</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-4">Loading shows...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Showtimes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      No shows found
                    </TableCell>
                  </TableRow>
                ) : (
                  shows.map((show) => (
                    <TableRow key={show.id}>
                      <TableCell className="font-medium">{show.title}</TableCell>
                      <TableCell>{show.duration} min</TableCell>
                      <TableCell>{show.showTimesCount} times</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleAddShowTimeClick(show.id)}
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleEditClick(show)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDeleteShow(show.id, show.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Add/Edit Show Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedShow ? `Edit Show: ${selectedShow.title}` : "Add New Show"}
            </DialogTitle>
            <DialogDescription>
              Fill in the details for this show
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddEditShow} className="space-y-4">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Show title"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Show description"
                  rows={4}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="poster">Poster URL</Label>
                  <Input
                    id="poster"
                    value={poster}
                    onChange={(e) => setPoster(e.target.value)}
                    placeholder="Poster image URL (optional)"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={duration || ""}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                    placeholder="e.g. 120"
                    required
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {selectedShow ? "Update Show" : "Add Show"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Add Show Time Dialog */}
      <Dialog open={showTimeDialog} onOpenChange={setShowTimeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Show Time</DialogTitle>
            <DialogDescription>
              Schedule a new show time
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddShowTime} className="space-y-4">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="showDate">Date</Label>
                <Input
                  id="showDate"
                  type="date"
                  value={showDate}
                  onChange={(e) => setShowDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="price">Ticket Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={price || ""}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 12.99"
                  required
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowTimeDialog(false);
                  resetShowTimeForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Add Show Time
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
