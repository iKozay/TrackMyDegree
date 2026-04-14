import { snapdom } from '@zumer/snapdom';
import { jsPDF } from "jspdf";

export async function downloadPdf(containerSelector: string, fileName: string): Promise<void> {
  const container = document.querySelector(containerSelector) as HTMLElement | null;
  
  if (!container) {
    console.error(`Container with selector "${containerSelector}" not found`);
    return;
  }

  try {
    // Get container dimensions
    const containerWidth = container.scrollWidth;
    const containerHeight = container.scrollHeight;

    // Capture with SnapDOM
    const result = await snapdom(container, {
      width: containerWidth,
      height: containerHeight,
      backgroundColor: '#ffffff'
    });
    
    const imgElement = await result.toPng();

    // Convert to canvas for PDF processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = imgElement.naturalWidth;
    canvas.height = imgElement.naturalHeight;
    ctx.drawImage(imgElement, 0, 0);
    
    const imgDataUrl = canvas.toDataURL('image/png');

    // Create PDF with appropriate orientation and size
    const pdf = new jsPDF({
      orientation: containerWidth > containerHeight ? "landscape" : "portrait",
      unit: "px",
      format: [containerWidth, containerHeight],
    });

    pdf.addImage(imgDataUrl, "PNG", 0, 0, containerWidth, containerHeight);
    pdf.save(`${fileName}.pdf`);
    
  } catch (error) {
    console.error("Failed to download Pdf:", error);
    alert("Failed to download Pdf. Please try again.");
  }
}
