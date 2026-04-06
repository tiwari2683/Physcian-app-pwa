import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generateAndSharePrescription = async (htmlContent: string, mode: 'share' | 'download' | 'view' = 'share') => {
  try {
    // 1. Create a hidden container to render HTML
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '800px'; 
    container.style.background = 'white';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    // Give browser a moment to render the content and load styles if any
    await new Promise(resolve => setTimeout(resolve, 800));

    // 2. Generate Canvas
    const canvas = await html2canvas(container, {
      scale: 3, // Higher quality for text
      useCORS: true,
      logging: false,
      windowWidth: 820,
      backgroundColor: '#ffffff'
    });
    
    // Clean up container
    document.body.removeChild(container);

    // 3. Create PDF (Multi-page slicing algorithm)
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const A4_HEIGHT_MM = 297;
    const A4_WIDTH_MM = 210;
    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pageHeightPx = (canvas.width * A4_HEIGHT_MM) / A4_WIDTH_MM;
    let yOffset = 0;

    while (yOffset < canvas.height) {
      if (yOffset > 0) pdf.addPage();
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.min(pageHeightPx, canvas.height - yOffset);
      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
         ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
      }
      const sliceData = sliceCanvas.toDataURL('image/png');
      const sliceHeightMm = (sliceCanvas.height * A4_WIDTH_MM) / canvas.width;
      pdf.addImage(sliceData, 'PNG', 0, 0, pdfWidth, sliceHeightMm);
      yOffset += pageHeightPx;
    }
    
    
    // 4. Get Blob and Output
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    
    if (mode === 'view') {
      window.open(url, '_blank');
      // Cleanup locally after open attempt
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return;
    }

    if (mode === 'download') {
      const link = document.createElement('a');
      link.href = url;
      link.download = `Prescription_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      return;
    }
    
    // Native Web Share API
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], 'prescription.pdf', { type: 'application/pdf' });
      const shareData = {
        title: 'Share Prescription',
        text: 'Patient Prescription Document',
        files: [file]
      };
      
      if (navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'NotAllowedError') {
            console.warn("Web Share API gesture timeout triggered. Falling back to native download protocol...");
            // Let it naturally drop through
          } else if (shareErr.name !== 'AbortError') {
             console.error("Non-critical share error:", shareErr);
             return;
          } else {
             return; // User aborted
          }
        }
      }
    }

    // Fallback if not supported or share error
    const link = document.createElement('a');
    link.href = url;
    link.download = `Prescription_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate the prescription PDF.');
  }
};
