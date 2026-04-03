const fs = require('fs');
const path = require('path');

const srcDir = 'e:\\InternShip\\lasttry\\assistant-panel\\src\\views\\pages\\visit';
const destDir = 'e:\\InternShip\\lasttry\\physcian-app-wpa\\src\\views\\Assistant\\Visit\\Tabs';

const srcFiles = [
    'ClinicalTab.tsx',
    'DiagnosisTab.tsx',
    'OverviewTab.tsx'
];

for (const file of srcFiles) {
    let content = fs.readFileSync(path.join(srcDir, file), 'utf-8');
    
    // Replace Redux hooks
    content = content.replace(/import \{\s*useAppDispatch,\s*useAppSelector\s*\} from '[\.\/]+controllers\/hooks';/g, "import { useAppDispatch, useAppSelector } from '../../../../controllers/hooks/hooks';");
    
    // Replace slices
    content = content.replace(/controllers\/slices\/patientVisitSlice/g, 'controllers/slices/assistant/asstPatientVisitSlice');
    content = content.replace(/\bpatientVisit\b/g, 'asstPatientVisit');
    
    // Replace action creators
    content = content.replace(/updateBasicDetails/g, 'updateAsstBasicDetails');
    content = content.replace(/updateClinicalDetails/g, 'updateAsstClinicalDetails');
    content = content.replace(/updateDiagnosisDetails/g, 'updateAsstDiagnosisDetails');
    content = content.replace(/toggleHistoryDrawer/g, 'toggleAsstHistoryDrawer');
    content = content.replace(/finalizeVisitAsAssistantThunk/g, 'autoSaveDraftToCloud'); // wait, OverviewTab uses finalizeVisitAsAssistantThunk. In PWA it's autoSaveDraftToCloud inside asstThunks
    
    // Replace contexts and services
    content = content.replace(/from '[\.\/]+contexts\/PendingFilesContext'/g, "from '../../../../contexts/PendingFilesContext'");
    content = content.replace(/from '[\.\/]+services\/uploadService'/g, "from '../../../../services/uploadService'");
    content = content.replace(/from '[\.\/]+services\/draftService'/g, "from '../../../../services/draftService'");

    fs.writeFileSync(path.join(destDir, file), content);
}

// Port HistoryDrawer
const srcDrawer = 'e:\\InternShip\\lasttry\\assistant-panel\\src\\views\\pages\\visit\\components\\HistoryDrawer.tsx';
const destDrawer = 'e:\\InternShip\\lasttry\\physcian-app-wpa\\src\\views\\Assistant\\components\\HistoryDrawer.tsx';
if (fs.existsSync(srcDrawer)) {
    let content = fs.readFileSync(srcDrawer, 'utf-8');
    content = content.replace(/import \{\s*useAppDispatch,\s*useAppSelector\s*\} from '[\.\/]+controllers\/hooks';/g, "import { useAppDispatch, useAppSelector } from '../../../controllers/hooks/hooks';");
    content = content.replace(/controllers\/slices\/patientVisitSlice/g, 'controllers/slices/assistant/asstPatientVisitSlice');
    content = content.replace(/\bpatientVisit\b/g, 'asstPatientVisit');
    content = content.replace(/toggleHistoryDrawer/g, 'toggleAsstHistoryDrawer');
    fs.writeFileSync(destDrawer, content);
}
console.log("Migration script complete");
