
import PDFDocument from 'pdfkit';
import blobStream from 'blob-stream';

// Helper function to create PDF blob from content
export const generatePDF = (
  generateContent: (doc: PDFDocument) => void
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Cineverse Document',
          Author: 'Cineverse Theatre',
        },
      });

      // Pipe the PDF into a blob
      const stream = doc.pipe(blobStream());

      // Add content using the provided callback
      generateContent(doc);

      // Finalize the PDF and get the blob
      doc.end();
      stream.on('finish', () => {
        const blob = stream.toBlob('application/pdf');
        resolve(blob);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Generate ticket PDF
export const generateTicketPDF = async (
  bookingData: {
    id: number;
    showTitle: string;
    showDate: string;
    startTime: string;
    seats: { row: number; col: number; seatNumber: string }[];
    customerName: string;
    totalPrice: number;
  }
) => {
  return generatePDF((doc) => {
    // Add theater logo
    doc.fontSize(25).text('Cineverse Theatre', { align: 'center' });
    doc.moveDown();

    // Add ticket info
    doc.fontSize(16).text('E-TICKET', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Booking Reference: #${bookingData.id}`, { align: 'center' });
    doc.moveDown();

    // Add a line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Movie details
    doc.fontSize(14).text(bookingData.showTitle, { align: 'center' });
    doc.fontSize(12).text(`Date: ${bookingData.showDate}`, { align: 'center' });
    doc.fontSize(12).text(`Time: ${bookingData.startTime}`, { align: 'center' });
    doc.moveDown();

    // Seat information
    doc.fontSize(12).text('Seats:', { align: 'left' });
    doc.fontSize(10);
    const seatGroups = [];
    for (let i = 0; i < bookingData.seats.length; i += 4) {
      seatGroups.push(bookingData.seats.slice(i, i + 4));
    }
    
    seatGroups.forEach(group => {
      doc.text(group.map(seat => seat.seatNumber).join(', '), { align: 'left' });
    });
    doc.moveDown();

    // Customer info
    doc.fontSize(12).text(`Customer: ${bookingData.customerName}`, { align: 'left' });
    doc.moveDown();

    // Price
    doc.fontSize(12).text(`Total Price: $${bookingData.totalPrice.toFixed(2)}`, { align: 'left' });
    doc.moveDown(2);

    // Add barcode placeholder
    doc.rect(150, doc.y, 300, 80).stroke();
    doc.fontSize(10).text('SCAN BARCODE AT ENTRANCE', 150, doc.y + 30, { align: 'center', width: 300 });
    doc.moveDown(5);

    // Add footer
    doc.fontSize(8).text('Thank you for choosing Cineverse Theatre. Enjoy your movie!', { align: 'center' });
    doc.fontSize(8).text('This ticket cannot be replaced if lost or stolen.', { align: 'center' });
  });
};

// Generate sales report PDF
export const generateSalesReportPDF = async (
  reportData: {
    startDate: string;
    endDate: string;
    totalSales: number;
    totalBookings: number;
    shows: Array<{
      title: string;
      tickets: number;
      revenue: number;
    }>;
  }
) => {
  return generatePDF((doc) => {
    // Report header
    doc.fontSize(20).text('Cineverse Theatre', { align: 'center' });
    doc.fontSize(16).text('Sales Report', { align: 'center' });
    doc.moveDown();

    // Report period
    doc.fontSize(12).text(`Period: ${reportData.startDate} - ${reportData.endDate}`, { align: 'left' });
    doc.moveDown();

    // Summary
    doc.fontSize(14).text('Summary', { align: 'left', underline: true });
    doc.fontSize(12).text(`Total Sales: $${reportData.totalSales.toFixed(2)}`);
    doc.fontSize(12).text(`Total Bookings: ${reportData.totalBookings}`);
    doc.moveDown();

    // Show details table
    doc.fontSize(14).text('Show Details', { align: 'left', underline: true });
    doc.moveDown(0.5);
    
    // Table header
    const startX = 50;
    let startY = doc.y;
    
    doc.fontSize(11);
    doc.text("Show Title", startX, startY);
    doc.text("Tickets Sold", startX + 250, startY);
    doc.text("Revenue", startX + 350, startY);
    
    // Draw header underline
    startY = doc.y + 5;
    doc.moveTo(startX, startY).lineTo(startX + 450, startY).stroke();
    doc.moveDown();
    
    // Table content
    startY = doc.y;
    
    reportData.shows.forEach((show, index) => {
      const rowY = startY + (index * 20);
      
      doc.fontSize(10);
      doc.text(show.title, startX, rowY);
      doc.text(show.tickets.toString(), startX + 250, rowY);
      doc.text(`$${show.revenue.toFixed(2)}`, startX + 350, rowY);
    });
    
    doc.moveDown(reportData.shows.length + 1);
    
    // Add generation timestamp
    doc.fontSize(8).text(`Report generated on: ${new Date().toLocaleString()}`, { align: 'right' });
  });
};

// Generate system logs PDF
export const generateSystemLogsPDF = async (
  logs: Array<{
    id: number;
    action: string;
    details: string;
    username?: string;
    timestamp: string;
  }>
) => {
  return generatePDF((doc) => {
    // Report header
    doc.fontSize(20).text('Cineverse Theatre', { align: 'center' });
    doc.fontSize(16).text('System Logs', { align: 'center' });
    doc.moveDown();

    // Generation timestamp
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown();

    // Logs table
    doc.fontSize(12);
    let y = doc.y;
    
    // Table header
    doc.font('Helvetica-Bold');
    doc.text('Time', 50, y);
    doc.text('Action', 150, y);
    doc.text('User', 300, y);
    doc.text('Details', 400, y);
    doc.font('Helvetica');
    
    y += 20;
    
    // Draw a line
    doc.moveTo(50, y - 5).lineTo(550, y - 5).stroke();
    
    // Table rows
    logs.forEach((log) => {
      // Make sure we're not running out of page
      if (y > 750) {
        doc.addPage();
        y = 50;
      }
      
      doc.fontSize(10);
      const timestamp = new Date(log.timestamp).toLocaleString();
      
      // Wrap text and calculate height
      const detailsWidth = 150;
      const detailsHeight = Math.ceil(
        (doc.font('Helvetica').fontSize(10).widthOfString(log.details) / detailsWidth) * 12
      );
      
      const rowHeight = Math.max(20, detailsHeight);
      
      doc.text(timestamp, 50, y, { width: 100 });
      doc.text(log.action, 150, y, { width: 150 });
      doc.text(log.username || 'System', 300, y, { width: 100 });
      doc.text(log.details, 400, y, { width: detailsWidth });
      
      y += rowHeight + 5;
      
      // Draw a light gray line
      doc.strokeColor('#dddddd').moveTo(50, y - 3).lineTo(550, y - 3).stroke().strokeColor('#000000');
    });
  });
};
