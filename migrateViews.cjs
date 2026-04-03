const fs = require('fs');
const path = require('path');

const applyReplacements = (content) => {
    // Replace Redux hooks
    content = content.replace(/import \{\s*useAppDispatch,\s*useAppSelector\s*\} from '[\.\/]+controllers\/hooks';/g, "import { useAppDispatch, useAppSelector } from '../../../../controllers/hooks/hooks';");
    content = content.replace(/import \{\s*useAppDispatch,\s*useAppSelector\s*\} from '\.\.\/\.\.\/controllers\/hooks';/g, "import { useAppDispatch, useAppSelector } from '../../../controllers/hooks/hooks';");
    
    // Slices and APIs
    content = content.replace(/controllers\/slices\/patientVisitSlice/g, 'controllers/slices/assistant/asstPatientVisitSlice');
    content = content.replace(/controllers\/slices\/patientsSlice/g, 'controllers/slices/assistant/asstPatientsSlice');
    content = content.replace(/controllers\/apiThunks/g, 'controllers/assistant/asstThunks');
    content = content.replace(/\bpatientVisit\b/g, 'asstPatientVisit');
    
    // Services
    content = content.replace(/from '[\.\/]+services\/draftService'/g, "from '../../../../services/draftService'");
    content = content.replace(/from '[\.\/]+services\/uploadService'/g, "from '../../../../services/uploadService'");
    
    // UI
    content = content.replace(/from '\.\.\/components\/UI'/g, "from '../../components/UI'");
    content = content.replace(/from '\.\.\/\.\.\/components\/UI'/g, "from '../../components/UI'");

    return content;
};

// 1. NewPatientForm -> AssistantVisitWizard
const srcWizard = 'e:\\InternShip\\lasttry\\assistant-panel\\src\\views\\pages\\visit\\NewPatientForm.tsx';
const destWizard = 'e:\\InternShip\\lasttry\\physcian-app-wpa\\src\\views\\Assistant\\Visit\\AssistantVisitWizard.tsx';
if (fs.existsSync(srcWizard)) {
    let content = fs.readFileSync(srcWizard, 'utf-8');
    content = applyReplacements(content);
    // Also fix specific paths in NewPatientForm
    content = content.replace(/from '\.\/BasicTab'/g, "from './Tabs/BasicTab'");
    content = content.replace(/from '\.\/ClinicalTab'/g, "from './Tabs/ClinicalTab'");
    content = content.replace(/from '\.\/DiagnosisTab'/g, "from './Tabs/DiagnosisTab'");
    content = content.replace(/from '\.\/OverviewTab'/g, "from './Tabs/OverviewTab'");
    content = content.replace(/from '\.\/components\/HistoryDrawer'/g, "from '../components/HistoryDrawer'");
    fs.writeFileSync(destWizard, content.replace('export const NewPatientForm', 'export const AssistantVisitWizard'));
}

// 2. PatientsDirectory -> AssistantPatientsDirectory
const srcDir = 'e:\\InternShip\\lasttry\\assistant-panel\\src\\views\\pages\\patients\\PatientsDirectory.tsx';
const destDir = 'e:\\InternShip\\lasttry\\physcian-app-wpa\\src\\views\\Assistant\\Patients\\AssistantPatientsDirectory.tsx';
if (fs.existsSync(srcDir)) {
    let content = fs.readFileSync(srcDir, 'utf-8');
    content = applyReplacements(content);
    // Assistant directory is inside Assistant/Patients, need to check internal imports
    content = content.replace(/from '\.\.\/\.\.\/components\/UI'/g, "from '../components/UI'");
    
    fs.writeFileSync(destDir, content.replace('export const PatientsDirectory', 'export const AssistantPatientsDirectory'));
}

// 3. PatientProfileModal -> PatientProfileModal
const srcMod = 'e:\\InternShip\\lasttry\\assistant-panel\\src\\views\\pages\\patients\\PatientProfileModal.tsx';
const destMod = 'e:\\InternShip\\lasttry\\physcian-app-wpa\\src\\views\\Assistant\\Patients\\PatientProfileModal.tsx';
if (fs.existsSync(srcMod)) {
    let content = fs.readFileSync(srcMod, 'utf-8');
    content = applyReplacements(content);
    content = content.replace(/from '\.\.\/\.\.\/components\/UI'/g, "from '../components/UI'");
    fs.writeFileSync(destMod, content);
}

console.log('Wizard and Directory migration complete.');
