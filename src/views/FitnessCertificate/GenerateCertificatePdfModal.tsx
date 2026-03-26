import { useState } from 'react';
import { X, FileText, Info, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { FitnessCertificateFormData } from '../../models/FitnessCertificateTypes';
import { 
    generateFitnessCertificateHtml, 
    DEFAULT_FITNESS_DOCTOR_INFO 
} from '../../utils/FitnessCertificatePdfTemplate';

interface GenerateCertificatePdfModalProps {
    isOpen: boolean;
    onClose: () => void;
    formData: Partial<FitnessCertificateFormData>;
}

export const GenerateCertificatePdfModal = ({
    isOpen,
    onClose,
    formData
}: GenerateCertificatePdfModalProps) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [fileName, setFileName] = useState(
        `Fitness_Certificate_${formData.patientName?.replace(/\s+/g, '_') || 'Patient'}_${new Date().toISOString().split('T')[0]}`
    );

    if (!isOpen) return null;

    const generatePdf = async () => {
        try {
            setIsGenerating(true);

            // 1. Generate the full certificate HTML
            const html = generateFitnessCertificateHtml(formData, DEFAULT_FITNESS_DOCTOR_INFO);

            // 2. Mount a hidden off-screen container with FIXED WIDTH matching A4
            //    Width 794px = A4 at 96dpi. Height is unconstrained so full content renders.
            const container = document.createElement('div');
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: -9999px;
                width: 794px;
                min-height: 1123px;
                background: white;
                z-index: -1;
                font-family: Arial, Helvetica, sans-serif;
                overflow: visible;
            `;
            container.innerHTML = html;
            document.body.appendChild(container);

            // Wait for fonts to load AND give layout time to settle
            await document.fonts.ready;
            await new Promise(resolve => setTimeout(resolve, 600));

            // 4. Capture the FULL content height — not viewport height
            const canvas = await html2canvas(container, {
                scale: 2,                    // 2x for sharp text in PDF
                useCORS: true,
                logging: false,
                width: 794,
                height: container.scrollHeight,          // FULL height, not clipped
                windowWidth: 794,
                windowHeight: container.scrollHeight,
                scrollX: 0,
                scrollY: 0,
                allowTaint: false,
                backgroundColor: '#ffffff',
            });

            // 5. Clean up the DOM immediately after capture
            document.body.removeChild(container);

            // 6. Set up jsPDF in A4 portrait
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pdfPageWidth = pdf.internal.pageSize.getWidth();   // 210mm
            const pdfPageHeight = pdf.internal.pageSize.getHeight(); // 297mm

            // 7. Calculate the rendered image dimensions in PDF units (mm)
            //    canvas.width = 794 * 2 = 1588px (because scale: 2)
            //    We want to fill the full PDF page width
            const imgWidthMm = pdfPageWidth;

            // 8. MULTI-PAGE LOGIC
            //    If the total rendered height exceeds one page, slice the canvas
            //    into page-sized strips and add each strip as a new PDF page.
            
            const pageHeightPx = Math.floor(
                (pdfPageHeight / pdfPageWidth) * canvas.width
            ); // How many canvas pixels fit in one PDF page

            let yOffsetPx = 0;  // Current vertical position in canvas pixels
            let pageNumber = 0;

            while (yOffsetPx < canvas.height) {
                // Calculate how many pixels remain
                const remainingPx = canvas.height - yOffsetPx;
                const sliceHeightPx = Math.min(pageHeightPx, remainingPx);

                // Create a temporary canvas for this page slice
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = sliceHeightPx;

                const pageCtx = pageCanvas.getContext('2d');
                if (!pageCtx) break;

                // Draw the slice from the main canvas onto this page canvas
                pageCtx.drawImage(
                    canvas,
                    0, yOffsetPx,          // Source: start at yOffsetPx
                    canvas.width, sliceHeightPx,  // Source: take sliceHeightPx pixels
                    0, 0,                  // Destination: top-left of page canvas
                    canvas.width, sliceHeightPx   // Destination: fill page canvas
                );

                // Convert this slice to base64 image data
                const pageImgData = pageCanvas.toDataURL('image/png', 1.0);

                // Add a new page for every page after the first
                if (pageNumber > 0) {
                    pdf.addPage();
                }

                // Calculate actual height of this slice in mm
                const sliceHeightMm = (sliceHeightPx * pdfPageWidth) / canvas.width;

                // Place the image on this PDF page
                pdf.addImage(
                    pageImgData,
                    'PNG',
                    0,              // x: left edge
                    0,              // y: top edge
                    imgWidthMm,     // width: full page width
                    sliceHeightMm,  // height: proportional to slice
                    undefined,
                    'FAST'          // Compression: FAST for speed, SLOW for smaller file
                );

                yOffsetPx += sliceHeightPx;
                pageNumber++;
            }

            // 9. Build the final filename
            const sanitizedName = fileName
                .replace(/[^a-zA-Z0-9_\-]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
            const finalFileName = `${sanitizedName || 'Fitness_Certificate'}.pdf`;

            // 10. Try native share first (mobile browsers, PWA installed mode)
            const blob = pdf.output('blob');

            if (
                typeof navigator.share === 'function' &&
                typeof navigator.canShare === 'function'
            ) {
                const file = new File([blob], finalFileName, { type: 'application/pdf' });
                const sharePayload = {
                    title: 'Fitness Certificate',
                    text: `Medical Fitness Certificate for ${formData.patientName || 'Patient'}`,
                    files: [file],
                };

                if (navigator.canShare(sharePayload)) {
                    try {
                        await navigator.share(sharePayload);
                        setIsGenerating(false);
                        onClose();
                        return;
                    } catch (shareErr: any) {
                        // User cancelled share — fall through to download
                        if (shareErr?.name !== 'AbortError') {
                            console.warn('Share failed, falling back to download:', shareErr);
                        }
                    }
                }
            }

            // 11. Fallback: trigger browser download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = finalFileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();

            // Clean up after a short delay
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 200);

            setIsGenerating(false);
            onClose();

        } catch (error: any) {
            console.error('PDF generation error:', error);
            alert(
                `Failed to generate certificate PDF.\n\nError: ${error?.message || 'Unknown error'}\n\nPlease try again.`
            );
            setIsGenerating(false);
        }
    };

    const getOpinionLabel = () => {
        switch (formData.selectedOpinionType) {
            case "surgery_fitness": return "Fitness for Surgery";
            case "medication_modification": return "Medication Modification";
            case "fitness_reserved": return "Fitness Reserved";
            default: return "Medical Opinion";
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
                    <h2 className="text-xl font-bold text-gray-900">Generate Certificate PDF</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Summary Info */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 italic text-sm text-blue-800">
                        <div className="flex gap-3">
                            <Info className="w-5 h-5 flex-shrink-0" />
                            <p>
                                This will generate a professional Medical Fitness Certificate including clinical 
                                assessments, investigations, and your final opinion.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Preview Details</h3>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Patient:</span>
                                <span className="font-semibold text-gray-900">{formData.patientName || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Age / Sex:</span>
                                <span className="font-semibold text-gray-900">{formData.patientAge} yrs / {formData.patientSex}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Opinion Type:</span>
                                <span className="font-semibold text-blue-600">{getOpinionLabel()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Validity:</span>
                                <span className="font-semibold text-gray-900">{formData.validityPeriod || '30 days'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Filename */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">File Name</label>
                        <div className="relative">
                            <input 
                                type="text"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-12"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">.pdf</div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={generatePdf}
                        disabled={isGenerating}
                        className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <FileText className="w-6 h-6" />
                                <span>Generate & Share PDF</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
