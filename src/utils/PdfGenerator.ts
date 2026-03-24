import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generateAndSharePrescription = async (htmlContent: string) => {
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
    await new Promise(resolve => setTimeout(resolve, 300));

    // 2. Generate Canvas
    const canvas = await html2canvas(container, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false
    });
    
    // Clean up container
    document.body.removeChild(container);

    // 3. Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    // 4. Get Blob and Share / Download
    const blob = pdf.output('blob');
    
    // Native Web Share API
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], 'prescription.pdf', { type: 'application/pdf' });
      const shareData = {
        title: 'Share Prescription',
        text: 'Patient Prescription Document',
        files: [file]
      };
      
      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }
    }

    // Fallback: Trigger standard browser download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Prescription_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate the prescription PDF.');
  }
};
