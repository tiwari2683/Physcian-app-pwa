/**
 * Utility functions for Fitness Certificate feature
 * 100% parity with React Native implementation (business logic)
 */

/**
 * Pure utility function to generate prescription text from medications array
 * @param medications - Array of medication objects
 * @returns Formatted prescription text
 */
export const generatePrescriptionFromMedications = (medications: any[]): string => {
    if (!medications || medications.length === 0) return "";

    return medications
        .map((med, index) => {
            let prescriptionLine = `${index + 1}. ${med.name || "Medication"}`;

            // Process timing values
            if (med.timingValues) {
                try {
                    const timingValuesObj =
                        typeof med.timingValues === "string"
                            ? JSON.parse(med.timingValues)
                            : med.timingValues;

                    const timingInstructions = Object.entries(timingValuesObj)
                        .map(([time, value]) => {
                            const timingLabel =
                                time.charAt(0).toUpperCase() + time.slice(1);
                            return `${timingLabel}: ${value}`;
                        })
                        .join(", ");

                    if (timingInstructions) {
                        prescriptionLine += ` - ${timingInstructions}`;
                    }
                } catch (e: any) {
                    console.warn(
                        `Error parsing timing values for med ${index + 1}`
                    );
                }
            }

            // Add duration if available
            if (med.duration) {
                prescriptionLine += ` for ${med.duration}`;
            }

            // Add special instructions if present
            if (med.specialInstructions && med.specialInstructions.trim() !== "") {
                prescriptionLine += `\n   Special Instructions: ${med.specialInstructions}`;
            }

            return prescriptionLine;
        })
        .join("\n\n");
};

/**
 * Helper to download a string as a file (browser only)
 */
export const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
};
