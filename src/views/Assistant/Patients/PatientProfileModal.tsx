import React from 'react';
import { 
    X, 
    FileText, 
    Pill, 
    Activity, 
    ShieldCheck, 
    Calendar, 
    MapPin, 
    Phone, 
    Link as LinkIcon,
    ArrowUpRight,
    ClipboardList,
    Stethoscope
} from 'lucide-react';
import type { Patient, Medication } from '../../../models';
import * as uploadService from '../../../services/uploadService';
import { motion } from 'framer-motion';
import '../Assistant.css';

interface PatientProfileModalProps {
    patient: Patient;
    onClose: () => void;
}

export const PatientProfileModal: React.FC<PatientProfileModalProps> = ({ patient, onClose }) => {
    const formattedDate = patient.createdAt
        ? new Date(patient.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Unknown Registration';

    const medicationsList: Medication[] = patient.medications || [];
    const reportsList: any[] = patient.reportFiles || [];

    const handleViewReport = async (report: any) => {
        const key = report.s3Key || report.key;
        if (key) {
            try {
                if (!patient.patientId) throw new Error("No valid patient ID to fetch report");
                const url = await uploadService.getPresignedGetUrl(patient.patientId, key);
                if (url) {
                    window.open(url, '_blank');
                } else {
                    throw new Error("Could not retrieve secure URL");
                }
            } catch (error) {
                console.error("Failed to fetch secure report URL", error);
                alert("Failed to securely fetch this report. It might be expired or restricted.");
            }
        } else {
            const url = report.signedUrl || report.url || report.fileUrl;
            if (url) window.open(url, '_blank');
            else alert("This file record is missing a valid source URL or S3 key.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-all" onClick={onClose}>
            <motion.div
                initial={{ x: '100%', opacity: 0.8 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0.8 }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className="w-full max-w-xl bg-appBg h-full shadow-2xl flex flex-col overflow-hidden border-l border-white/20"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 🏷️ Header: Clinical ID & Status */}
                <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary-base/5 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-primary-base to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-primary-base/20 uppercase">
                            {patient.name?.charAt(0) || '?'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-type-heading leading-tight tracking-tight">
                                {patient.name}
                            </h2>
                            <div className="flex items-center gap-2.5 mt-1.5">
                                <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 uppercase tracking-widest leading-none shadow-sm font-mono">
                                    ID: {patient.patientId}
                                </span>
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                    Sync Active
                                </span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-3 text-slate-400 hover:text-rose-500 rounded-2xl hover:bg-rose-50 transition-all active:scale-90 relative z-10 border border-transparent hover:border-rose-100"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* 🧬 Content: Profile Details */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-20 no-scrollbar">
                    
                    {/* 📋 Demographics: High Density Clinical Brief */}
                    <section>
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Stethoscope size={14} className="text-primary-base" /> Patient Demographics
                            </h3>
                            <ShieldCheck size={16} className="text-emerald-500/50" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Registration', value: formattedDate, icon: Calendar, color: 'blue' },
                                { label: 'Profile', value: `${patient.age}Y · ${patient.sex}`, icon: Activity, color: 'emerald' },
                                { label: 'Contact', value: patient.mobile || 'No Mobile', icon: Phone, color: 'amber' },
                                { label: 'Residence', value: patient.address || 'No Address', icon: MapPin, color: 'indigo', truncate: true },
                            ].map((stat, i) => (
                                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group hover:border-primary-base/20 transition-all">
                                    <div className={`p-1.5 bg-${stat.color}-50 text-${stat.color}-500 rounded-lg w-fit mb-2 group-hover:scale-110 transition-transform`}>
                                        <stat.icon size={12} />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">{stat.label}</p>
                                    <p className={`text-sm font-bold text-slate-800 ${stat.truncate ? 'truncate' : ''}`} title={stat.value as string}>
                                        {stat.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 🏥 Medical History: Longitudinal Context */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <ClipboardList size={14} className="text-primary-base" /> Medical Intelligence
                        </h3>
                        
                        <div className="space-y-3">
                            {/* Latest Diagnosis */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-base"></div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Diagnosis</span>
                                </div>
                                <p className="text-sm font-bold text-slate-800 leading-relaxed">
                                    {patient.diagnosis || <span className="text-slate-300 italic font-medium">No clinical history records found in this profile.</span>}
                                </p>
                            </div>

                            {/* Advised Investigations */}
                            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 transition-colors hover:bg-white group">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Investigations</span>
                                </div>
                                <p className="text-sm font-bold text-slate-700 leading-relaxed">
                                    {patient.advisedInvestigations || <span className="text-slate-300 italic font-medium">None currently advised.</span>}
                                </p>
                            </div>

                            {/* Ongoing Treatment */}
                            <div className="bg-emerald-50/20 p-5 rounded-2xl border border-emerald-100/30 transition-colors hover:bg-emerald-50/40 group">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest font-mono">Current Treatment Strategy</span>
                                </div>
                                <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {patient.treatment || <span className="text-slate-300 italic font-medium">No active treatment protocol established.</span>}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 💊 Medications: Pharmacy Hub */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between ml-1">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Pill size={14} className="text-primary-base" /> Active Prescription
                            </h3>
                            {medicationsList.length > 0 && <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">{medicationsList.length} ITEMS</span>}
                        </div>
                        
                        {medicationsList.length === 0 ? (
                            <div className="bg-white p-8 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                    <Pill size={24} className="text-slate-200" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No Medication History</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {medicationsList.map((med, index) => (
                                    <div key={index} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 group hover:bg-slate-50 transition-all hover:border-primary-base/20">
                                        <div className="bg-blue-50 p-2.5 rounded-xl group-hover:bg-primary-base group-hover:text-white transition-all shadow-inner">
                                            <Pill className="text-primary-base group-hover:text-white" size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-slate-800 text-sm truncate">{med.name}</h4>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-blue-100/50 text-primary-base uppercase tracking-widest font-mono">
                                                    {med.dosage}
                                                </span>
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 uppercase tracking-widest">
                                                    {med.frequency}
                                                </span>
                                            </div>
                                        </div>
                                        <ArrowUpRight size={14} className="text-slate-200 group-hover:text-primary-base transition-colors" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* 🧪 Reports: Secure Cloud Records */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                             <FileText size={14} className="text-primary-base" /> Laboratory Records
                        </h3>
                        {reportsList.length === 0 ? (
                            <div className="bg-white p-8 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                    <FileText size={24} className="text-slate-200" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No Lab Reports Found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {reportsList.map((report, index) => (
                                    <motion.div 
                                        key={index} 
                                        whileHover={{ y: -3 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col group cursor-pointer transition-all hover:border-primary-base shadow-sm hover:shadow-xl hover:shadow-slate-200/50 overflow-hidden relative"
                                        onClick={() => handleViewReport(report)}
                                    >
                                        <div className="bg-slate-50 h-24 mb-3 rounded-xl flex items-center justify-center group-hover:bg-primary-base/5 transition-colors overflow-hidden relative">
                                            <FileText className="text-slate-200 group-hover:text-primary-base transition-all duration-300 group-hover:scale-110" size={32} />
                                            <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur px-1.5 py-0.5 rounded text-[8px] font-black text-slate-400 border border-slate-100">
                                                SECURE
                                            </div>
                                        </div>
                                        <div className="px-1 overflow-hidden">
                                            <p className="text-[10px] font-black text-slate-800 truncate mb-1 leading-tight" title={report.fileName || 'Report'}>
                                                {report.fileName || `Lab Report ${index + 1}`}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{report.category || 'Archive'}</span>
                                                <LinkIcon size={10} className="text-slate-200 group-hover:text-primary-base transition-colors" />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {/* ⚡ Sticky Footer Action */}
                <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-1.5">
                        <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
                        End-to-End Encryption Enabled
                    </div>
                    <button 
                        onClick={onClose}
                        className="btn-secondary px-8 py-2.5 rounded-xl uppercase tracking-widest font-black transition-all active:scale-95 shadow-sm"
                    >
                        Close Profile
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
