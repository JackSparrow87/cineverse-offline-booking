
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getDB } from "@/lib/db";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { generateSalesReportPDF } from "@/services/pdfService";
import { ArrowDown, BarChart3, Download } from "lucide-react";

interface SalesByShow {
  title: string;
  tickets: number;
  revenue: number;
}

interface SalesByDate {
  date: string;
  tickets: number;
  revenue: number;
}

export default function AdminReportsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalSales, setTotalSales] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [salesByShow, setSalesByShow] = useState<SalesByShow[]>([]);
  const [salesByDate, setSalesByDate] = useState<SalesByDate[]>([]);
  
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
    
    // Set default date range (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, [isAdmin, navigate, toast]);
  
  useEffect(() => {
    if (startDate && endDate) {
      fetchSalesData();
    }
  }, [startDate, endDate]);
  
  const fetchSalesData = () => {
    const db = getDB();
    if (!db) return;
    
    try {
      // Get total sales and bookings
      const totals = db.prepare(`
        SELECT 
          COUNT(*) as total_bookings,
          SUM(total_price) as total_sales
        FROM bookings
        WHERE created_at BETWEEN datetime(?) AND datetime(?, '+1 day')
      `).get(startDate, endDate);
      
      setTotalBookings(totals.total_bookings || 0);
      setTotalSales(totals.total_sales || 0);
      
      // Sales by show
      const showSales = db.prepare(`
        SELECT 
          s.title,
          COUNT(*) as tickets,
          SUM(b.total_price) as revenue
        FROM bookings b
        JOIN show_times st ON b.show_time_id = st.id
        JOIN shows s ON st.show_id = s.id
        WHERE b.created_at BETWEEN datetime(?) AND datetime(?, '+1 day')
        GROUP BY s.id
        ORDER BY revenue DESC
      `).all(startDate, endDate);
      
      setSalesByShow(showSales || []);
      
      // Sales by date
      const dateSales = db.prepare(`
        SELECT 
          date(b.created_at) as date,
          COUNT(*) as tickets,
          SUM(b.total_price) as revenue
        FROM bookings b
        WHERE b.created_at BETWEEN datetime(?) AND datetime(?, '+1 day')
        GROUP BY date(b.created_at)
        ORDER BY date DESC
      `).all(startDate, endDate);
      
      setSalesByDate(dateSales || []);
    } catch (error) {
      console.error("Error fetching sales data:", error);
      toast({
        title: "Error",
        description: "Failed to load sales data",
        variant: "destructive",
      });
    }
  };
  
  const handleDownloadReport = async () => {
    try {
      const reportData = {
        startDate,
        endDate,
        totalSales,
        totalBookings,
        shows: salesByShow.map(show => ({
          title: show.title,
          tickets: show.tickets,
          revenue: show.revenue
        }))
      };
      
      const pdfBlob = await generateSalesReportPDF(reportData);
      
      // Create a blob URL
      const url = URL.createObjectURL(pdfBlob);
      
      // Create a link and click it to download
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales-report-${startDate}-to-${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Success",
        description: "Sales report downloaded",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    }
  };
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  return (
    <div className="container py-8">
      <Heading 
        title="Sales Reports"
        description="View and download sales data"
        className="mb-8"
      />
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="grid w-full max-w-sm">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid w-full max-w-sm">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={fetchSalesData}>
              Update Report
            </Button>
            <Button onClick={handleDownloadReport}>
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalSales.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground">
              {formatDate(startDate)} - {formatDate(endDate)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Tickets Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalBookings}</div>
            <p className="text-sm text-muted-foreground">
              {formatDate(startDate)} - {formatDate(endDate)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Average Ticket Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${totalBookings > 0 ? (totalSales / totalBookings).toFixed(2) : '0.00'}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(startDate)} - {formatDate(endDate)}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sales by Show</CardTitle>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Show</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesByShow.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      No sales data available
                    </TableCell>
                  </TableRow>
                ) : (
                  salesByShow.map((show, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{show.title}</TableCell>
                      <TableCell className="text-right">{show.tickets}</TableCell>
                      <TableCell className="text-right">${show.revenue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sales by Date</CardTitle>
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesByDate.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      No sales data available
                    </TableCell>
                  </TableRow>
                ) : (
                  salesByDate.map((date, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{formatDate(date.date)}</TableCell>
                      <TableCell className="text-right">{date.tickets}</TableCell>
                      <TableCell className="text-right">${date.revenue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
