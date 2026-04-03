import { useState, useEffect } from 'react';
import { X, FileText, Info, Loader2, Share2, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { FitnessCertificateFormData } from '../../../models/FitnessCertificateTypes';
import { 
    generateChunkedFitnessCertificate, 
    DEFAULT_FITNESS_DOCTOR_INFO 
} from '../../../utils/FitnessCertificatePdfTemplate';

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
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const [fileName, setFileName] = useState('');

    useEffect(() => {
        if (isOpen) {
            const patientStr = formData.patientName?.trim()?.replace(/\s+/g, '_') || 'Patient';
            const dateStr = new Date().toISOString().split('T')[0];
            setFileName(`${patientStr}_fitness_certificate_${dateStr}`);
        }
    }, [isOpen, formData.patientName]);

    const handleClose = () => {
        setPdfBlob(null);
        onClose();
    };

    if (!isOpen) return null;

    const generatePdf = async () => {
        try {
            setIsGenerating(true);

            // 1. Generate chunked certificate sections
            const { styles, headerHtml, footerHtml, sections } = generateChunkedFitnessCertificate(formData, DEFAULT_FITNESS_DOCTOR_INFO);

            // 2. Mount a hidden container matching A4 proportions
            const container = document.createElement('div');
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: -9999px;
                width: 794px;
                background: white;
                z-index: -1;
                font-family: Arial, Helvetica, sans-serif;
            `;

            container.innerHTML = `<style>${styles}</style>`;
            
            const headerDiv = document.createElement('div');
            headerDiv.innerHTML = headerHtml;
            container.appendChild(headerDiv);

            const sectionDivs = sections.map(sec => {
                const div = document.createElement('div');
                div.innerHTML = sec.html;
                container.appendChild(div);
                return { id: sec.id, title: sec.title, div };
            });

            const footerDiv = document.createElement('div');
            footerDiv.innerHTML = footerHtml;
            container.appendChild(footerDiv);

            document.body.appendChild(container);

            // 3. Wait for layout settling and fonts
            await document.fonts.ready;
            await new Promise(resolve => setTimeout(resolve, 600));

            // Helper to capture a DOM node to canvas 
            const captureEl = async (el: HTMLElement) => {
                const cvs = await html2canvas(el, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    width: 794,
                    height: el.scrollHeight + 20,
                    windowWidth: 794,
                    windowHeight: el.scrollHeight + 50,
                    allowTaint: false,
                    backgroundColor: '#ffffff'
                });
                return { canvas: cvs, imgData: cvs.toDataURL('image/png', 1.0), heightPx: cvs.height, widthPx: cvs.width };
            };

            // 4. Capture each section individually
            const headerCapture = await captureEl(headerDiv);
            const footerCapture = await captureEl(footerDiv);
            const sectionCaptures = [];
            for (const s of sectionDivs) {
                sectionCaptures.push({ id: s.id, title: s.title, capture: await captureEl(s.div) });
            }

            // Cleanup DOM
            document.body.removeChild(container);

            // 5. Build PDF with smart pagination
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const margins = 15; 
            const contentWidth = pdfWidth - (margins * 2);
            const maxContentHeight = pdfHeight - margins - 12; // Leave bottom 12mm for page numbers

            const pxToMm = (px: number, origW: number) => (px * contentWidth) / origW;

            const headerMm = pxToMm(headerCapture.heightPx, headerCapture.widthPx);
            const footerMm = pxToMm(footerCapture.heightPx, footerCapture.widthPx);

            let currentY = margins;

            const drawHeader = () => {
                pdf.addImage(headerCapture.imgData, 'PNG', margins, margins, contentWidth, headerMm, undefined, 'FAST');
                currentY = margins + headerMm + 5; // spacing after header
            };

            drawHeader(); // Page 1 Initialize

            for (const sc of sectionCaptures) {
                const sectionMm = pxToMm(sc.capture.heightPx, sc.capture.widthPx);

                // Check if fits on current page
                if (currentY + sectionMm > maxContentHeight) {
                    const availableMmNewPage = maxContentHeight - (margins + headerMm + 5);

                    if (sectionMm > availableMmNewPage) {
                        // EDGE CASE 2: Section is larger than a full page -> MUST slice
                        if (maxContentHeight - currentY < 25) {
                            // Don't start a slice if tiny space remains (orphaned headers)
                            pdf.addPage(); drawHeader();
                        }

                        let srcYPx = 0;
                        let remainingMm = sectionMm;

                        while (remainingMm > 0.5) {
                            let availableMm = maxContentHeight - currentY;
                            if (availableMm < 15) {
                                pdf.addPage(); drawHeader();
                                pdf.setFont('helvetica', 'italic');
                                pdf.setFontSize(10);
                                pdf.setTextColor(120);
                                pdf.text(`${sc.title} (continued)`, margins, currentY + 3);
                                currentY += 8;
                                availableMm = maxContentHeight - currentY;
                            }

                            const sliceMm = Math.min(availableMm, remainingMm);
                            const slicePx = Math.floor((sliceMm * sc.capture.heightPx) / sectionMm);

                            const sCanvas = document.createElement('canvas');
                            sCanvas.width = sc.capture.widthPx;
                            sCanvas.height = slicePx;
                            const ctx = sCanvas.getContext('2d');
                            ctx?.drawImage(sc.capture.canvas, 0, srcYPx, sc.capture.widthPx, slicePx, 0, 0, sc.capture.widthPx, slicePx);

                            pdf.addImage(sCanvas.toDataURL('image/png', 1.0), 'PNG', margins, currentY, contentWidth, sliceMm, undefined, 'FAST');
                            
                            currentY += sliceMm;
                            srcYPx += slicePx;
                            remainingMm -= sliceMm;

                            if (remainingMm > 0.5) {
                                pdf.addPage(); drawHeader();
                                pdf.setFont('helvetica', 'italic');
                                pdf.setFontSize(10);
                                pdf.setTextColor(120);
                                pdf.text(`${sc.title} (continued)`, margins, currentY + 3);
                                currentY += 8;
                            }
                        }

                    } else {
                        // EDGE CASE 1: Move whole section to next page
                        pdf.addPage(); drawHeader();
                        pdf.addImage(sc.capture.imgData, 'PNG', margins, currentY, contentWidth, sectionMm, undefined, 'FAST');
                        currentY += sectionMm;
                    }
                } else {
                    // Fits natively
                    pdf.addImage(sc.capture.imgData, 'PNG', margins, currentY, contentWidth, sectionMm, undefined, 'FAST');
                    currentY += sectionMm;
                }
            }

            // 6. Draw Footer
            if (currentY + footerMm > maxContentHeight) {
                pdf.addPage(); drawHeader();
            }
            const footerY = Math.max(currentY + 5, maxContentHeight - footerMm);
            pdf.addImage(footerCapture.imgData, 'PNG', margins, footerY, contentWidth, footerMm, undefined, 'FAST');

            // 7. Page Numbering
            const totalPages = (pdf as any).internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(9);
                pdf.setTextColor(150);
                pdf.text(`Page ${i} of ${totalPages}`, pdfWidth / 2, pdfHeight - 8, { align: 'center' });
            }

            // 9. Build the final filename
            const sanitizedName = fileName
                .replace(/[^a-zA-Z0-9_\-]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
            const finalFileName = `${sanitizedName || 'Fitness_Certificate'}.pdf`;

            const blob = pdf.output('blob');
            setPdfBlob(blob);
            setFileName(finalFileName);

        } catch (error: any) {
            console.error('PDF generation error:', error);
            alert(
                `Failed to generate certificate PDF.\n\nError: ${error?.message || 'Unknown error'}\n\nPlease try again.`
            );
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!pdfBlob) return;
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 200);
    };

    const handleShare = async () => {
        if (!pdfBlob) return;
        
        if (typeof navigator.share === 'function') {
            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
            const sharePayload = {
                title: 'Fitness Certificate',
                text: `Medical Fitness Certificate for ${formData.patientName || 'Patient'}`,
                files: [file],
            };

            if (navigator.canShare && navigator.canShare(sharePayload)) {
                try {
                    await navigator.share(sharePayload);
                    return;
                } catch (shareErr: any) {
                    if (shareErr?.name !== 'AbortError') {
                        console.warn('Share failed:', shareErr);
                        alert('Your device blocked sharing. Please use Download instead.');
                    }
                }
            } else {
                alert('Your browser does not support sharing PDF files directly. Please use the Download option, then share the file.');
            }
        } else {
            alert('Sharing is not supported on this device/browser. Please download instead.');
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
                    <h2 className="text-xl font-bold text-gray-900">
                        {pdfBlob ? 'Certificate Ready' : 'Generate Certificate PDF'}
                    </h2>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
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
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                    {!pdfBlob ? (
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
                                    <span>Generate PDF</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleShare}
                                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-green-200 transition-all active:scale-[0.98]"
                            >
                                <Share2 className="w-5 h-5" />
                                <span>Share (Mobile/Web)</span>
                            </button>
                            <button
                                onClick={handleDownload}
                                className="flex-1 flex items-center justify-center gap-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 py-4 rounded-xl font-bold text-base transition-all active:scale-[0.98]"
                            >
                                <Download className="w-5 h-5" />
                                <span>Download</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

