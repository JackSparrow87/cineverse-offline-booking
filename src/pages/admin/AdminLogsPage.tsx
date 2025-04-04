
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Heading } from "@/components/ui/heading";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getDB } from "@/lib/db";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { generateSystemLogsPDF } from "@/services/pdfService";
import { Download } from "lucide-react";

interface SystemLog {
  id: number;
  action: string;
  details: string;
  username: string | null;
  created_at: string;
}

export default function AdminLogsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  
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
    
    // Set default date range (last 7 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, [isAdmin, navigate, toast]);
  
  useEffect(() => {
    if (startDate && endDate) {
      fetchLogs();
    }
  }, [startDate, endDate]);
  
  const fetchLogs = () => {
    setLoading(true);
    
    const db = getDB();
    if (!db) {
      setLoading(false);
      return;
    }
    
    try {
      const logsData = db.prepare(`
        SELECT 
          sl.id,
          sl.action,
          sl.details,
          u.username,
          sl.created_at
        FROM system_logs sl
        LEFT JOIN users u ON sl.user_id = u.id
        WHERE sl.created_at BETWEEN datetime(?) AND datetime(?, '+1 day')
        ORDER BY sl.created_at DESC
      `).all(startDate, endDate);
      
      setLogs(logsData || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast({
        title: "Error",
        description: "Failed to load system logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownloadLogs = async () => {
    try {
      // Format logs for PDF
      const formattedLogs = logs.map(log => ({
        id: log.id,
        action: log.action,
        details: log.details,
        username: log.username || 'System',
        timestamp: log.created_at
      }));
      
      const pdfBlob = await generateSystemLogsPDF(formattedLogs);
      
      // Create a blob URL
      const url = URL.createObjectURL(pdfBlob);
      
      // Create a link and click it to download
      const link = document.createElement('a');
      link.href = url;
      link.download = `system-logs-${startDate}-to-${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Success",
        description: "System logs downloaded",
      });
    } catch (error) {
      console.error("Error generating logs PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate logs PDF",
        variant: "destructive",
      });
    }
  };
  
  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return "";
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-US');
  };
  
  return (
    <div className="container py-8">
      <Heading 
        title="System Logs"
        description="View and download system activity logs"
        className="mb-8"
      />
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Logs</CardTitle>
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
            <Button variant="outline" onClick={fetchLogs}>
              Update Logs
            </Button>
            <Button onClick={handleDownloadLogs} disabled={logs.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Download Logs
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Loading logs...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      No logs found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">{log.action}</TableCell>
                      <TableCell>{log.username || "System"}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
