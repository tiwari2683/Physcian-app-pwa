// import { useEffect, useState, useMemo } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { patientService } from '../../../services/api/patientService';
// import { generatePrescriptionHTML } from '../../../utils/PrescriptionPdfTemplate';
// import { generateAndSharePrescription } from '../../../utils/PdfGenerator';
// import { ArrowLeft, Share2, Download, AlertCircle, RefreshCw, FileText, Calendar, Clock, Pill, User, Eye } from 'lucide-react';
// import toast from 'react-hot-toast';

// export const PatientPrescriptionHistory = () => {
//     const { patientId } = useParams<{ patientId: string }>();
//     const navigate = useNavigate();

//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [prescriptions, setPrescriptions] = useState<any[]>([]);
//     const [patientInfo, setPatientInfo] = useState<{ name: string; age: string; gender: string } | null>(null);

//     const [generatingId, setGeneratingId] = useState<string | null>(null);

//     const fetchHistory = async () => {
//         if (!patientId) return;
//         setLoading(true);
//         setError(null);
//         try {
//             const records = await patientService.getPatientPrescriptions(patientId);
            
//             // Extract patient info from first record if available
//             if (records.length > 0) {
//                 setPatientInfo({
//                     name: records[0].patientName || 'Unknown Patient',
//                     age: records[0].age || 'N/A',
//                     gender: records[0].gender || 'N/A'
//                 });
//             }
            
//             // Sort records newest first
//             const sorted = records.sort((a, b) => {
//                 const dateA = a.prescriptionDate || a.visitDate || a.createdAt;
//                 const dateB = b.prescriptionDate || b.visitDate || b.createdAt;
//                 return new Date(dateB).getTime() - new Date(dateA).getTime();
//             });

//             setPrescriptions(sorted);
//         } catch (err: any) {
//             console.error('Failed to load patient prescriptions:', err);
//             setError('Failed to load prescription history. The endpoint might not be available.');
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchHistory();
//     }, [patientId]);

//     // Grouping by Date string "DD MMM YYYY"
//     const groupedPrescriptions = useMemo(() => {
//         const groups = new Map<string, any[]>();
//         prescriptions.forEach(record => {
//             const iso = record.prescriptionDate || record.visitDate || record.createdAt;
//             if (!iso) return;
//             const dateObj = new Date(iso);
//             const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
//             if (!groups.has(dateStr)) groups.set(dateStr, []);
//             groups.get(dateStr)!.push(record);
//         });
//         return Array.from(groups.entries());
//     }, [prescriptions]);

//     const handleGeneratePdf = async (record: any, mode: 'share' | 'download' | 'view') => {
//         if (generatingId) return;
//         setGeneratingId(record.prescriptionId || 'active');
        
//         try {
//             const html = generatePrescriptionHTML({
//                 patientName: record.patientName || patientInfo?.name || 'Unknown Patient',
//                 age: record.age || patientInfo?.age || 'N/A',
//                 gender: record.gender || patientInfo?.gender || 'N/A',
//                 patientId: record.patientId,
//                 address: record.address,
//                 vitals: {
//                     bp: record.bp,
//                     weight: record.weight,
//                     height: record.height,
//                     temp: record.temperature
//                 },
//                 diagnosis: record.diagnosis || undefined,
//                 advisedInvestigations: record.advisedInvestigations || undefined,
//                 additionalNotes: record.additionalNotes || undefined,
//                 medications: record.medications || [],
//                 prescriptionDate: record.prescriptionDate || record.visitDate || undefined
//             });

//             await generateAndSharePrescription(html, mode);
//         } catch (err) {
//             console.error('PDF Generation Error:', err);
//             toast.error('Failed to generate PDF');
//         } finally {
//             setGeneratingId(null);
//         }
//     };

//     const renderMedicationSummary = (meds: any[]) => {
//         if (!meds || meds.length === 0) return 'No medications prescribed';
//         const topNames = meds.slice(0, 3).map(m => m.name).filter(Boolean);
//         const remainder = meds.length - 3;
        
//         let display = topNames.join(', ');
//         if (remainder > 0) {
//             display += ` +${remainder} more`;
//         }
//         return display;
//     };

//     return (
//         <div className="flex-1 bg-[#F8FAFC] min-h-screen pb-20">
//             {/* Main Content Area */}
//             <div className="p-4 md:p-6 max-w-4xl mx-auto">
                
//                 {/* Navigation & Patient Profile Card */}
//                 <div className="mb-8">
//                     <button 
//                         onClick={() => navigate('/doctor/prescriptions')}
//                         className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-bold text-sm mb-4 pl-1"
//                     >
//                         <ArrowLeft className="w-4 h-4" /> Back to Prescriptions
//                     </button>
                    
//                     <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 shadow-[0_8px_30px_rgb(79,70,229,0.2)] relative overflow-hidden">
//                         {/* Decorative Background Elements */}
//                         <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
//                         <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                        
//                         <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
//                             <div className="flex items-center gap-4">
//                                 <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner shrink-0">
//                                     <User className="w-7 h-7 text-white" />
//                                 </div>
//                                 <div>
//                                     <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-1">
//                                         {patientInfo?.name || 'Loading Patient...'}
//                                     </h1>
//                                     {patientInfo && (
//                                         <div className="flex items-center flex-wrap gap-2 text-sm text-indigo-100 font-medium">
//                                             <span className="font-mono text-xs opacity-90 uppercase bg-indigo-900/40 px-2 py-0.5 rounded-md tracking-wider">ID: {patientId}</span>
//                                             <span className="w-1 h-1 bg-indigo-300 rounded-full"></span>
//                                             <span>{patientInfo.age}y</span>
//                                             <span className="w-1 h-1 bg-indigo-300 rounded-full"></span>
//                                             <span>{patientInfo.gender}</span>
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//                 {loading ? (
//                     <div className="space-y-6">
//                         {[1, 2].map(i => (
//                             <div key={i} className="animate-pulse">
//                                 <div className="h-6 w-32 bg-gray-200 rounded-md mb-4"></div>
//                                 <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-32"></div>
//                             </div>
//                         ))}
//                     </div>
//                 ) : error ? (
//                     <div className="mt-6 bg-red-50 border border-red-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
//                         <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
//                         <h3 className="text-lg font-bold text-red-900 mb-2">Connection Error</h3>
//                         <p className="text-red-600 max-w-md mx-auto font-medium mb-6">{error}</p>
//                         <button 
//                             onClick={fetchHistory}
//                             className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-800 px-6 py-2.5 rounded-xl font-bold transition-colors"
//                         >
//                             <RefreshCw className="w-4 h-4" /> Try Again
//                         </button>
//                     </div>
//                 ) : groupedPrescriptions.length === 0 ? (
//                     <div className="mt-12 flex flex-col items-center justify-center text-center">
//                         <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100 line-dashed">
//                             <FileText className="w-10 h-10 text-gray-300" />
//                         </div>
//                         <h3 className="text-xl font-bold text-gray-900 mb-2">No prescriptions found</h3>
//                         <p className="text-gray-500 max-w-sm font-medium">This patient currently has no generated prescriptions on record.</p>
//                     </div>
//                 ) : (
//                     <div className="space-y-10">
//                         {groupedPrescriptions.map(([dateStr, records]) => (
//                             <div key={dateStr}>
//                                 <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
//                                     <Calendar className="w-4 h-4" /> {dateStr}
//                                 </h2>
                                
//                                 <div className="space-y-4">
//                                     {records.map((record, index) => {
//                                         const timeObj = new Date(record.prescriptionDate || record.visitDate || record.createdAt);
//                                         const timeStr = timeObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                        
//                                         const isGenerating = generatingId === (record.prescriptionId || 'active');
                                        
//                                         return (
//                                             <div key={record.prescriptionId || index} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
//                                                 <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                                    
//                                                     {/* Left Summary Info */}
//                                                     <div className="flex-1 space-y-3">
//                                                         <div className="flex items-center gap-3">
//                                                             <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
//                                                                 <Clock className="w-3.5 h-3.5" /> {timeStr}
//                                                             </div>
//                                                             <span className="text-sm font-bold text-indigo-600">
//                                                                 {record.doctorName || 'Dr. Dipak Gawli'}
//                                                             </span>
//                                                         </div>
                                                        
//                                                         <div className="flex items-start gap-2.5">
//                                                             <Pill className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
//                                                             <p className="text-gray-900 font-bold leading-snug">
//                                                                 {renderMedicationSummary(record.medications)}
//                                                             </p>
//                                                         </div>

//                                                         {record.diagnosis && (
//                                                             <div className="pl-7 pt-1">
//                                                                 <p className="text-sm text-gray-500 font-medium line-clamp-2">
//                                                                     <span className="font-bold text-gray-700">Diagnosis:</span> {record.diagnosis}
//                                                                 </p>
//                                                             </div>
//                                                         )}
//                                                     </div>

//                                                     {/* Action Buttons */}
//                                                     <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
//                                                         <button 
//                                                             disabled={!!generatingId}
//                                                             onClick={() => handleGeneratePdf(record, 'view')}
//                                                             className="flex items-center justify-center gap-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-xl font-bold transition-all shadow-sm flex-1 md:flex-none text-sm"
//                                                         >
//                                                             {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 text-emerald-600" />}
//                                                             View
//                                                         </button>

//                                                         <button 
//                                                             disabled={!!generatingId}
//                                                             onClick={() => handleGeneratePdf(record, 'download')}
//                                                             className="flex items-center justify-center gap-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-xl font-bold transition-all shadow-sm flex-1 md:flex-none text-sm"
//                                                         >
//                                                             {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-gray-500" />}
//                                                             Save
//                                                         </button>
                                                        
//                                                         <button 
//                                                             disabled={!!generatingId}
//                                                             onClick={() => handleGeneratePdf(record, 'share')}
//                                                             className="flex items-center justify-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-xl font-bold transition-all shadow-sm flex-1 md:flex-none text-sm"
//                                                         >
//                                                             {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
//                                                             Share
//                                                         </button>
//                                                     </div>

//                                                 </div>
//                                             </div>
//                                         );
//                                     })}
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// };

