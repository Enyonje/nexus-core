import { useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function AnalyticsPage() {
  const analyticsRef = useRef();

  const handleExportPDF = async () => {
    const element = analyticsRef.current;
    if (!element) return;

    // Capture the analytics section
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    // Create PDF
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Scale image to fit page
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

    // Save file
    pdf.save("analytics-report.pdf");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Analytics Dashboard</h1>

      {/* Analytics content wrapped in ref */}
      <div ref={analyticsRef} className="bg-white/5 p-6 rounded-lg shadow-lg">
        {/* Replace with your charts, tables, metrics */}
        <p className="text-slate-300">Revenue Forecast, Ticket Metrics, etc.</p>
      </div>

      {/* Export button */}
      <button
        onClick={handleExportPDF}
        className="mt-6 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
      >
        Export as PDF
      </button>
    </div>
  );
}