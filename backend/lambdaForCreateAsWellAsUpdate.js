import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand, DeleteCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
const cognitoClient = new CognitoIdentityProviderClient({ region: "us-east-2" });
const USER_POOL_ID = process.env.USER_POOL_ID;

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: "us-east-2" });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: {
        removeUndefinedValues: true
    }
});
const s3 = new S3Client({
    region: "us-east-2",
    forcePathStyle: true
});

// Table names
const CLINICS_TABLE = process.env.CLINICS_TABLE || 'Clinics';
const CLINIC_STAFF_TABLE = process.env.CLINIC_STAFF_TABLE || 'ClinicStaff';
const PATIENTS_TABLE = process.env.PATIENTS_TABLE || 'Patients';
const VISITS_TABLE = process.env.VISITS_TABLE || 'Visits';
const APPOINTMENTS_TABLE = process.env.APPOINTMENTS_TABLE || 'Appointments';
const CLINICAL_HISTORY_TABLE = 'ClinicalParametersHistory';
const MEDICAL_HISTORY_TABLE = 'MedicalHistoryEntries';
const DIAGNOSIS_HISTORY_TABLE = 'DiagnosisHistoryEntries';
const INVESTIGATIONS_HISTORY_TABLE = 'InvestigationsHistoryEntries';
const REPORTS_BUCKET = 'dr-gawli-patient-files-use2-5694';
const PRESCRIPTIONS_TABLE = 'Prescriptions';

// GSI Index Names
const PATIENT_TENANT_INDEX = 'tenant_id-patientId-index';
const VISIT_TENANT_INDEX = 'tenant_id-visitId-index';
const APPOINTMENT_TENANT_INDEX = 'tenant_id-appointmentId-index';

// ============================================
// FEATURE FLAGS
// ============================================
const ENFORCE_BILLING = process.env.ENFORCE_BILLING === 'true'; // Set to false by default unless in AWS env

// ============================================
// PRESIGNED URL GENERATION FOR UPLOADS
// ============================================

/**
 * Generate presigned URL for direct file upload from frontend
 * This eliminates Base64 encoding entirely
 */
/**
 * Generate a short-lived presigned URL to view/download a file from S3 securely.
 */
async function generatePresignedGetUrl(requestData) {
    try {
        const { s3Key, tenantId, userRole } = requestData;

        if (!s3Key) {
            return formatErrorResponse("Missing s3Key");
        }

        // ============================================
        // ZERO-TRUST TENANT CHECK
        // Validate that the requested file belongs to the user's tenant
        // ============================================
        if (userRole !== 'SuperAdmin' && !s3Key.startsWith(`${tenantId}/`)) {
            console.error(`🚨 SECURITY BLOCK: Tenant ${tenantId} attempted to access file ${s3Key}`);
            return formatErrorResponse("Forbidden: Cross-tenant data access blocked", 403);
        }

        console.log(`📥 Generating presigned GET URL for: ${s3Key}`);

        const command = new GetObjectCommand({
            Bucket: REPORTS_BUCKET,
            Key: s3Key
        });

        // 5-minute expiration
        const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

        return formatSuccessResponse({
            success: true,
            url: presignedUrl,
            expiresIn: 300
        });
    } catch (error) {
        console.error('❌ Error generating presigned GET URL:', error);
        return formatErrorResponse(`Failed to generate GET URL: ${error.message}`);
    }
}

async function generatePresignedUploadUrl(requestData) {
    try {
        const { patientId, fileName, fileType, category = 'uncategorized', tenantId } = requestData;

        if (!patientId || !fileName) {
            return formatErrorResponse("Missing patientId or fileName");
        }

        // Generate unique S3 key using the Tenant ID to isolate clinics!
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 10000);
        const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

        // TASK 3: SECURE S3 PATH INJECTION
        const s3Key = `${tenantId}/patients/${patientId}/${timestamp}-${randomSuffix}-${sanitizedName}`;

        console.log(`📤 Generating presigned URL for: ${s3Key}`);

        const command = new PutObjectCommand({
            Bucket: REPORTS_BUCKET,
            Key: s3Key,
            ContentType: fileType || 'application/octet-stream',
            Metadata: {
                'tenant-id': tenantId, // Track tenant in S3 metadata
                'patient-id': patientId,
                'original-name': sanitizedName,
                'category': category,
                'upload-timestamp': new Date().toISOString()
            }
        });

        const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

        return formatSuccessResponse({
            success: true,
            uploadUrl: presignedUrl,
            s3Key: s3Key,
            fileName: fileName,
            expiresIn: 300
        });
    } catch (error) {
        console.error('❌ Error generating presigned URL:', error);
        return formatErrorResponse(`Failed to generate upload URL: ${error.message}`);
    }
}

/**
 * Confirm file upload and save metadata to DynamoDB
 * Called after frontend successfully uploads to S3
 */
async function confirmFileUpload(requestData) {
    try {
        const { patientId, s3Key, fileName, fileType, category = 'uncategorized', fileSize } = requestData;

        if (!patientId || !s3Key) {
            return formatErrorResponse("Missing patientId or s3Key");
        }

        console.log(`🔍 Confirming upload for: ${s3Key}`);

        // Verify file exists in S3
        try {
            await s3.send(new HeadObjectCommand({
                Bucket: REPORTS_BUCKET,
                Key: s3Key
            }));
            console.log(`✅ File verified in S3: ${s3Key}`);
        } catch (error) {
            console.error(`❌ File not found in S3: ${s3Key}`);
            return formatErrorResponse("File upload verification failed");
        }

        // Get current patient record
        const patientResult = await dynamodb.send(new GetCommand({
            TableName: PATIENTS_TABLE,
            Key: { patientId }
        }));

        if (!patientResult.Item) {
            return formatErrorResponse("Patient not found");
        }

        // ============================================
        // ZERO-TRUST TENANT CHECK
        // ============================================
        if (patientResult.Item.tenant_id !== requestData.tenantId && requestData.userRole !== 'SuperAdmin') {
            console.error(`🚨 SECURITY BLOCK: Tenant ${requestData.tenantId} attempted to confirm upload for ${patientResult.Item.tenant_id}`);
            return formatErrorResponse("Forbidden: Cross-tenant data access blocked", 403);
        }

        // Create file metadata (NO URLs, NO Base64)
        const fileMetadata = {
            s3Key: s3Key,
            fileName: fileName,
            fileType: fileType || 'application/octet-stream',
            category: category,
            fileSize: fileSize || 0,
            uploadedAt: new Date().toISOString(),
            uploadedToS3: true
        };

        // Add to patient's reportFiles array
        const currentFiles = patientResult.Item.reportFiles || [];
        currentFiles.push(fileMetadata);

        // Update patient record
        await dynamodb.send(new UpdateCommand({
            TableName: PATIENTS_TABLE,
            Key: { patientId },
            UpdateExpression: "SET reportFiles = :files, updatedAt = :updatedAt",
            ExpressionAttributeValues: {
                ":files": currentFiles,
                ":updatedAt": new Date().toISOString()
            }
        }));

        console.log(`✅ File metadata saved to DynamoDB for patient ${patientId}`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify({
                success: true,
                message: "File upload confirmed",
                fileMetadata: fileMetadata
            })
        };
    } catch (error) {
        console.error('❌ Error confirming file upload:', error);
        return formatErrorResponse(`Failed to confirm upload: ${error.message}`);
    }
}

// ============================================
// SIGNED URL GENERATION FOR DOWNLOADS
// ============================================

/**
 * Non-destructive helper: Add signed URLs to report files
 * CRITICAL: Never removes data, only enriches it
 */
async function enrichPatientFilesWithSignedUrls(reportFiles) {
    if (!Array.isArray(reportFiles) || reportFiles.length === 0) {
        return [];
    }

    console.log(`🔐 Generating signed URLs for ${reportFiles.length} files`);

    const enrichedFiles = await Promise.all(
        reportFiles.map(async (file) => {
            try {
                // Preserve all original data
                const enrichedFile = { ...file };

                // Check for both 'key' and 's3Key' for backward compatibility
                const s3Key = file.s3Key || file.key;

                // Generate signed URL if we have an S3 key
                if (s3Key) {
                    try {
                        const command = new GetObjectCommand({
                            Bucket: REPORTS_BUCKET,
                            Key: s3Key
                        });

                        const signedUrl = await getSignedUrl(s3, command, {
                            expiresIn: 600 // 10 minutes for viewing
                        });

                        enrichedFile.url = signedUrl; // Set 'url' field for UI compatibility
                        enrichedFile.signedUrl = signedUrl; // Also keep signedUrl
                        enrichedFile.s3Key = s3Key; // Normalize to s3Key
                        enrichedFile.urlExpiresAt = new Date(Date.now() + 600000).toISOString();
                        console.log(`✅ Signed URL generated for: ${file.fileName || file.name}`);
                    } catch (signError) {
                        console.warn(`⚠️ Failed to sign ${file.fileName || file.name}: ${signError.message}`);
                        enrichedFile.signError = signError.message;
                        // File metadata still returned - no data loss
                    }
                } else {
                    console.warn(`⚠️ No S3 key for file: ${file.fileName || file.name}`);
                }

                return enrichedFile;
            } catch (error) {
                console.error(`❌ Error processing file: ${error.message}`);
                // Return original file data - no data loss
                return file;
            }
        })
    );

    return enrichedFiles;
}

// ============================================
// PATIENT DATA RETRIEVAL
// ============================================

async function handleGetPatient(requestData) {
    try {
        const { patientId, tenantId, userRole } = requestData;
        console.log(`🔍 Getting patient data for ID: ${patientId}`);

        const command = new GetItemCommand({
            TableName: PATIENTS_TABLE,
            Key: { "patientId": { "S": patientId } }
        });

        // if (forceRefresh) command.input.ConsistentRead = true; // Dropping forceRefresh from lambda entirely since router no longer provides it, data is real-time anyway

        const result = await dynamoClient.send(command);

        if (!result.Item) {
            return formatErrorResponse(`Patient not found: ${patientId}`);
        }

        const patientData = unmarshallDynamoDBItem(result.Item);

        // ============================================
        // ZERO-TRUST TENANT CHECK
        // ============================================
        if (patientData.tenant_id !== tenantId && userRole !== 'SuperAdmin') {
            console.error(`🚨 SECURITY BLOCK: Tenant ${tenantId} attempted to fetch patient from ${patientData.tenant_id}`);
            return formatErrorResponse("Forbidden: Cross-tenant data access blocked", 403);
        }

        // Enrich report files with signed URLs (non-destructive)
        if (patientData.reportFiles && Array.isArray(patientData.reportFiles)) {
            console.log(`📂 Found ${patientData.reportFiles.length} report files`);
            patientData.reportFiles = await enrichPatientFilesWithSignedUrls(patientData.reportFiles);
        }

        // --- OPTION A MERGE: Fetch Active Visit ---
        // This allows the frontends to resume the current workflow with a single call.
        let activeVisit = null;
        try {
            // Check for WAITING or IN_PROGRESS status
            for (const status of ['WAITING', 'IN_PROGRESS']) {
                const visitRecord = await dynamodb.send(new QueryCommand({
                    TableName: VISITS_TABLE,
                    IndexName: 'patientId-status-index',
                    KeyConditionExpression: "patientId = :pid AND #s = :status",
                    ExpressionAttributeNames: { "#s": "status" },
                    ExpressionAttributeValues: { ":pid": patientId, ":status": status }
                }));
                if (visitRecord.Items && visitRecord.Items.length > 0) {
                    activeVisit = visitRecord.Items[0];
                    break;
                }
            }
        } catch (visitErr) {
            console.warn(`Could not fetch active visit for patient ${patientId}:`, visitErr.message);
        }

        // Enrich the active visit's reportFiles if present
        if (activeVisit && Array.isArray(activeVisit.reportFiles) && activeVisit.reportFiles.length > 0) {
            activeVisit.reportFiles = await enrichPatientFilesWithSignedUrls(activeVisit.reportFiles);
        }

        // Get history data concurrently
        const [
            clinicalHistoryData,
            medicalHistoryData,
            diagnosisHistoryData,
            investigationsHistoryData
        ] = await Promise.all([
            _fetchClinicalHistoryData(patientId),
            _fetchMedicalHistoryData(patientId),
            _fetchDiagnosisHistoryData(patientId),
            _fetchInvestigationsHistoryData(patientId)
        ]);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            body: JSON.stringify({
                success: true,
                patient: patientData,
                clinicalHistory: clinicalHistoryData.clinicalHistory || [],
                medicalHistory: medicalHistoryData.medicalHistory || [],
                diagnosisHistory: diagnosisHistoryData.diagnosisHistory || [],
                investigationsHistory: investigationsHistoryData.investigationsHistory || [],
                freshData: true,
                activeVisit: activeVisit
            })
        };
    } catch (error) {
        console.error('❌ Error getting patient:', error);
        return formatErrorResponse(`Failed to get patient: ${error.message}`);
    }
}

/**
 * Get all patient files with signed URLs
 */
async function handleGetPatientFiles(requestData) {
    try {
        const { patientId, tenantId, userRole } = requestData;
        console.log(`📂 Getting files for patient: ${patientId}`);

        // Get from DynamoDB
        const patientResult = await dynamodb.send(new GetCommand({
            TableName: PATIENTS_TABLE,
            Key: { patientId }
        }));

        if (!patientResult.Item) {
            return formatErrorResponse("Patient not found");
        }

        const patientData = patientResult.Item;

        // ============================================
        // ZERO-TRUST TENANT CHECK
        // ============================================
        if (patientData.tenant_id !== tenantId && userRole !== 'SuperAdmin') {
            console.error(`🚨 SECURITY BLOCK: Tenant ${tenantId} attempted to fetch patient files from ${patientData.tenant_id}`);
            return formatErrorResponse("Forbidden: Cross-tenant data access blocked", 403);
        }

        const reportFiles = patientResult.Item.reportFiles || [];

        // Enrich with signed URLs
        const enrichedFiles = await enrichPatientFilesWithSignedUrls(reportFiles);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify({
                success: true,
                files: enrichedFiles,
                count: enrichedFiles.length
            })
        };
    } catch (error) {
        console.error('❌ Error getting patient files:', error);
        return formatErrorResponse(`Failed to get files: ${error.message}`);
    }
}

/**
 * Delete a patient file
 */
async function deletePatientFile(requestData) {
    try {
        const { patientId, s3Key, fileName } = requestData;

        if (!patientId || (!s3Key && !fileName)) {
            return formatErrorResponse("Missing patientId or file identifier");
        }

        console.log(`🗑️ Deleting file: ${s3Key || fileName}`);

        // Get patient record
        const patientResult = await dynamodb.send(new GetCommand({
            TableName: PATIENTS_TABLE,
            Key: { patientId }
        }));

        if (!patientResult.Item) {
            return formatErrorResponse("Patient not found");
        }

        // ============================================
        // ZERO-TRUST TENANT CHECK
        // ============================================
        if (patientResult.Item.tenant_id !== requestData.tenantId && requestData.userRole !== 'SuperAdmin') {
            console.error(`🚨 SECURITY BLOCK: Tenant ${requestData.tenantId} attempted to delete file for ${patientResult.Item.tenant_id}`);
            return formatErrorResponse("Forbidden: Cross-tenant data access blocked", 403);
        }

        // Find and remove file from array
        let reportFiles = patientResult.Item.reportFiles || [];
        const fileToDelete = reportFiles.find(f =>
            f.s3Key === s3Key || f.fileName === fileName
        );

        if (!fileToDelete) {
            return formatErrorResponse("File not found");
        }

        // Delete from S3 if it exists
        if (fileToDelete.s3Key) {
            try {
                await s3.send(new DeleteObjectCommand({
                    Bucket: REPORTS_BUCKET,
                    Key: fileToDelete.s3Key
                }));
                console.log(`✅ Deleted from S3: ${fileToDelete.s3Key}`);
            } catch (s3Error) {
                console.warn(`⚠️ S3 deletion failed: ${s3Error.message}`);
                // Continue with DynamoDB deletion
            }
        }

        // Remove from array
        reportFiles = reportFiles.filter(f =>
            f.s3Key !== s3Key && f.fileName !== fileName
        );

        // Update DynamoDB
        await dynamodb.send(new UpdateCommand({
            TableName: PATIENTS_TABLE,
            Key: { patientId },
            UpdateExpression: "SET reportFiles = :files, updatedAt = :updatedAt",
            ExpressionAttributeValues: {
                ":files": reportFiles,
                ":updatedAt": new Date().toISOString()
            }
        }));

        console.log(`✅ File deleted successfully`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify({
                success: true,
                message: "File deleted successfully",
                remainingFiles: reportFiles.length
            })
        };
    } catch (error) {
        console.error('❌ Error deleting file:', error);
        return formatErrorResponse(`Failed to delete file: ${error.message}`);
    }
}

// ============================================
// MAIN HANDLER
// ============================================

async function getPatientHistory(requestData) {
    const { patientId, type } = requestData;

    if (!patientId) {
        return formatErrorResponse('patientId is required');
    }

    try {
        console.log(`🔍 Fetching history for patient: ${patientId}, type: ${type}`);

        const command = new QueryCommand({
            TableName: VISITS_TABLE,
            IndexName: 'patientId-status-index',
            KeyConditionExpression: 'patientId = :pid',
            ExpressionAttributeValues: {
                ':pid': patientId
            },
            ScanIndexForward: false
        });

        const data = await dynamodb.send(command);

        // ============================================
        // ZERO-TRUST TENANT CHECK
        // ============================================
        if (data.Items && data.Items.length > 0) {
            const sampleVisit = data.Items[0];
            if (sampleVisit.tenant_id !== requestData.tenantId && requestData.userRole !== 'SuperAdmin') {
                console.error(`🚨 SECURITY BLOCK: Tenant ${requestData.tenantId} attempted to get history from ${sampleVisit.tenant_id}`);
                return formatErrorResponse("Forbidden: Cross-tenant data access blocked", 403);
            }
        }

        let formattedRecords = [];

        if (type === 'diagnoses') {
            formattedRecords = (data.Items || [])
                .filter(item => item.diagnosis)
                .map(item => ({
                    date: item.visitDate || item.visitId || new Date().toISOString(),
                    title: item.diagnosis.split('\n')[0] || 'Diagnosis',
                    details: item.diagnosis,
                    doctorName: item.doctorName || 'Dr. Tiwari'
                }));
        } else if (type === 'investigations') {
            formattedRecords = (data.Items || [])
                .filter(item => (item.selectedInvestigations && item.selectedInvestigations.length > 0) || item.customInvestigations)
                .map(item => {
                    const standard = item.selectedInvestigations ? item.selectedInvestigations.join(', ') : '';
                    const custom = item.customInvestigations ? `Other: ${item.customInvestigations}` : '';
                    const details = [standard, custom].filter(Boolean).join(' | ');

                    return {
                        date: item.visitDate || item.visitId || new Date().toISOString(),
                        title: 'Advised Investigations',
                        details: details,
                        doctorName: item.doctorName || 'Dr. Tiwari'
                    };
                });
        }

        return formatSuccessResponse(formattedRecords);

    } catch (error) {
        console.error("DynamoDB Query Error:", error);
        return formatErrorResponse(`Failed to fetch history: ${error.message}`);
    }
}

export const handler = async (event, context) => {
    try {
        console.log("LOG: Lambda invoked");
        context.callbackWaitsForEmptyEventLoop = false;

        // Handle CORS preflight
        const method = event.httpMethod || event.requestContext?.http?.method || '';
        if (method === "OPTIONS") {
            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Credentials": true,
                    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE,PATCH"
                },
                body: JSON.stringify({ message: "CORS preflight successful" })
            };
        }

        // ============================================================
        // TASK 2: EXTRACT JWT CLAIMS & SECURITY GUARD
        // ============================================================
        let tenantId = null;
        let userRole = null;

        // Extract from API Gateway Request Context (handles REST and HTTP APIs)
        const claims = event.requestContext?.authorizer?.claims || event.requestContext?.authorizer?.jwt?.claims;

        // TEMPORARY DEBUG LOGS
        console.log('🔍 DEBUG requestContext:', JSON.stringify(event.requestContext, null, 2));
        console.log('🔍 DEBUG claims:', JSON.stringify(claims, null, 2));

        if (claims) {
            tenantId = claims['custom:tenant_id'];
            userRole = claims['custom:role'];
            console.log(`🔐 Authenticated as Role: ${userRole} | Tenant: ${tenantId}`);
        }

        // THE HARD BOUNDARY: Block if no tenant ID (unless SuperAdmin)
        if (!tenantId && userRole !== 'SuperAdmin') {
            console.error("❌ Unauthorized: Missing custom:tenant_id in Cognito Token");
            return {
                statusCode: 403,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ success: false, error: "Unauthorized: Missing Clinic ID" })
            };
        }

        // ============================================================
        // HARDENED BODY PARSING
        // ============================================================
        let requestData = {};
        try {
            if (event.body) {
                const rawBody = event.isBase64Encoded
                    ? Buffer.from(event.body, 'base64').toString('utf8')
                    : event.body;
                const parsed = JSON.parse(rawBody);
                requestData = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
            } else if (event.action || event.patientId || event.name) {
                requestData = event;
            } else if (event.requestContext && !event.body) {
                requestData = {};
            } else {
                requestData = event;
            }
        } catch (parseError) {
            console.error('❌ Body parse error:', parseError.message);
            return formatErrorResponse(`Invalid JSON in request body: ${parseError.message}`);
        }

        // Inject security context into payload so all functions can use it in Task 3
        requestData.tenantId = tenantId;
        requestData.userRole = userRole;

        const action = requestData.action;
        console.log(`🎯 Action: ${action}`);

        // ============================================================
        // TASK 2: THE SUBSCRIPTION SOFT GATE
        // ============================================================
        const restrictedWriteActions = new Set([
            'createPatient',
            'processPatientData',
            'initiateVisit',
            'updateVisit',
            'completeVisit',
            'saveFitnessCertificate',
            'savePrescription',
        ]);

        // Detect legacy create/update actions
        const isLegacyWrite = (!action && requestData.patientId && requestData.updateMode) ||
            (!action && requestData.isPartialSave) ||
            (!action && requestData.name && requestData.age && requestData.sex);

        if (restrictedWriteActions.has(action) || isLegacyWrite) {
            if (tenantId && userRole !== 'SuperAdmin') {
                const subscriptionState = await getClinicSubscriptionState(tenantId);

                if (!subscriptionState.isActive) {
                    if (ENFORCE_BILLING) {
                        console.error(`⛔ 402 Payment Required. Tenant ${tenantId} is expired/suspended.`);
                        return {
                            statusCode: 402,
                            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                            body: JSON.stringify({
                                success: false,
                                code: 'SUBSCRIPTION_EXPIRED',
                                error: "Payment Required: Clinic subscription expired or suspended.",
                                subscription: {
                                    status: subscriptionState.status,
                                    expiryIso: subscriptionState.expiryIso,
                                    serverTimeIso: new Date().toISOString(),
                                }
                            })
                        };
                    } else {
                        console.warn(`⚠️ Notice: Clinic subscription expired for ${tenantId}, but allowed due to ENFORCE_BILLING=false`);
                    }
                }
            }
        }

        // ============================================================
        // ROUTER
        // ============================================================
        switch (action) {
            case 'onboardClinic': return await onboardClinic(requestData);
            case 'renewClinicSubscription': return await renewClinicSubscription(requestData);
            case 'getAllClinics': return await getAllClinics(requestData);
            case 'getClinicDetails': return await getClinicDetails(requestData);
            case 'resendDoctorInvite': return await resendDoctorInvite(requestData);
            case 'addStaffToClinic': return await addStaffToClinic(requestData);
            case 'fixClinicCounts': return await fixClinicCounts(requestData);
            case 'getClinicStaff': return await getClinicStaff(requestData);
            case 'syncLegacyStaffToDynamo': return await syncLegacyStaffToDynamo(requestData);
            case 'getPatientHistory': return await getPatientHistory(requestData);
            case 'getPresignedUploadUrl': return await generatePresignedUploadUrl(requestData);
            case 'getPresignedGetUrl': return await generatePresignedGetUrl(requestData);
            case 'validateRegistration': return await validateRegistration(requestData);
            case 'confirmFileUpload': return await confirmFileUpload(requestData);
            case 'getPatient': return await handleGetPatient(requestData);
            case 'getPatientFiles': return await handleGetPatientFiles(requestData);
            case 'deletePatientFile': return await deletePatientFile(requestData);
            case 'initiateVisit': return await initiateVisit(requestData);
            case 'getActiveVisit': return await getActiveVisit(requestData);
            case 'getAllPatientVisits': return await getAllPatientVisits(requestData);
            case 'updateVisit': return await updateVisit(requestData);
            case 'completeVisit': return await completeVisit(requestData);
            case 'updateVisitStatus': return await updateVisitStatus(requestData);
            case 'getClinicalHistory': return await fetchClinicalHistory(requestData);
            case 'getMedicalHistory': return await fetchMedicalHistory(requestData);
            case 'getReportsHistory': return await fetchReportsHistory(requestData);
            case 'getDiagnosisHistory': return await fetchDiagnosisHistory(requestData);
            case 'getInvestigationsHistory': return await fetchInvestigationsHistory(requestData);
            case 'getAllPatients': return await getAllPatients(requestData);
            case 'getWaitingRoom': return await handleGetWaitingRoom(requestData);
            case 'searchPatients': return await searchPatients(requestData);
            case "deleteDraft": return await deleteDraft(requestData);
            case "saveFitnessCertificate": return await saveFitnessCertificate(requestData);
            case "getFitnessCertificates": return await getFitnessCertificates(requestData);
            case "searchMedicines": return await searchMedicines(requestData);
            case "addMedicine": return await addMedicine(requestData);
            case "deletePatient": return await deletePatient(requestData);
            case 'savePrescription': return await savePrescription(requestData);
            case 'getPatientPrescriptions': return await getPatientPrescriptions(requestData);
            case 'getAllPrescriptions': return await getAllPrescriptions(requestData);
            default:
                if (requestData.patientId && requestData.updateMode) return await updatePatientData(requestData);
                else if (requestData.isPartialSave) return await processSectionSave(requestData);
                else if (requestData.name && requestData.age && requestData.sex) return await processPatientData(requestData);
                else {
                    console.error(`❌ Unknown action: "${action}"`);
                    return formatErrorResponse(`Unknown action: "${action}"`);
                }
        }
    } catch (error) {
        console.error('❌ Handler error:', error);
        return formatErrorResponse(error.message || "Request failed");
    }
};

// ============================================
// VALIDATION LOGIC
// ============================================

/**
 * Validates registration data against existing records
 * Checks for duplicate email or phone
 */
async function validateRegistration(requestData) {
    try {
        const { email, phone } = requestData;

        if (!email && !phone) {
            return formatErrorResponse("Email or phone is required for validation");
        }

        console.log(`🔍 Validating registration for: Email=${email}, Phone=${phone}`);

        const filterExpressions = [];
        const expressionAttributeValues = {};
        const expressionAttributeNames = {};

        if (email) {
            filterExpressions.push("contains(#email, :email)");
            expressionAttributeNames["#email"] = "email"; // Assuming 'email' attribute exists
            expressionAttributeValues[":email"] = email.toLowerCase().trim();
        }

        // For phone, we might need to be careful with formatting, but for now let's try direct match
        // or contain match if formats vary. 'mobile' seems to be the attribute name in Patients table
        if (phone) {
            filterExpressions.push("contains(#mobile, :mobile)");
            expressionAttributeNames["#mobile"] = "mobile";
            // Basic sanitation for phone match - this might need refinement based on exact storage format
            // The searchPatients uses digits ONLY, let's try to match that pattern if possible,
            // but 'contains' with the raw input is safer if we don't know the stored format perfectly yet.
            // Let's stick to safe 'contains' for now.
            expressionAttributeValues[":mobile"] = phone.replace(/[^\d+]/g, ''); // Keep digits and plus
        }

        // OR logic: invalid if EITHER exists
        const filterExpression = filterExpressions.join(" OR ");

        // Using Scan is not ideal for high volume but works for now. 
        // Ideally we should have GSI on email and mobile.
        const command = new ScanCommand({
            TableName: PATIENTS_TABLE,
            FilterExpression: filterExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ProjectionExpression: "patientId, mobile, #email", // Optimize projection
        });

        const result = await dynamodb.send(command);
        const matches = result.Items || [];

        if (matches.length > 0) {
            console.log(`⚠️ Found ${matches.length} matches for registration validation`);

            // Determine SPECIFICALLY what collided
            const emailTaken = email && matches.some(m => m.email && m.email.toLowerCase() === email.toLowerCase());
            const phoneTaken = phone && matches.some(m => m.mobile && m.mobile.includes(phone.replace(/[^\d+]/g, '')));

            let errorMessage = "";
            if (emailTaken && phoneTaken) errorMessage = "Email and Phone are already registered";
            else if (emailTaken) errorMessage = "Email is already registered";
            else if (phoneTaken) errorMessage = "Phone number is already registered";
            else errorMessage = "User already exists"; // Fallback

            return {
                statusCode: 409, // Conflict
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true
                },
                body: JSON.stringify({
                    success: false,
                    error: errorMessage,
                    field: emailTaken ? "email" : (phoneTaken ? "phone" : "unknown")
                })
            };
        }

        console.log("✅ Registration validation passed (No duplicates found)");

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify({
                success: true,
                message: "Validation successful"
            })
        };

    } catch (error) {
        console.error('❌ Validation error:', error);
        return formatErrorResponse(`Validation failed: ${error.message}`);
    }
}

// ============================================
// HELPER FUNCTIONS (Minimal Stubs)
// ============================================

/**
 * Checks if a clinic's subscription is active
 */
async function getClinicSubscriptionState(tenantId) {
    if (!tenantId) return { isActive: false, status: 'UNKNOWN', expiryIso: null };

    try {
        const clinicResult = await dynamodb.send(new GetCommand({
            TableName: CLINICS_TABLE,
            Key: { tenant_id: tenantId },
            ConsistentRead: true
        }));

        if (!clinicResult.Item) {
            console.warn(`⚠️ Clinic record not found for tenant: ${tenantId}`);
            return { isActive: false, status: 'MISSING', expiryIso: null };
        }

        const status = clinicResult.Item.status || 'ACTIVE';
        const expiryIso = clinicResult.Item.subscription_expiry || null;
        const expiryMs = expiryIso ? Date.parse(expiryIso) : NaN;
        const nowMs = Date.now();
        const expiredByTime = !Number.isFinite(expiryMs) || nowMs >= expiryMs;
        const suspended = status === 'SUSPENDED';

        return {
            isActive: !expiredByTime && !suspended,
            status,
            expiryIso
        };
    } catch (error) {
        console.error("❌ Error checking subscription:", error.message);
        return { isActive: false, status: 'UNKNOWN', expiryIso: null };
    }
}

/**
 * Returns clinic metadata (name, subscription_expiry, status) for the
 * calling user's own tenant. Isolation is guaranteed because tenantId is
 * always injected from the verified Cognito token — never from the request body.
 */
async function getClinicDetails(requestData) {
    const { tenantId, userRole } = requestData;
    if (!tenantId && userRole !== 'SuperAdmin') {
        return formatErrorResponse('Missing clinic ID.');
    }
    try {
        const result = await dynamodb.send(new GetCommand({
            TableName: CLINICS_TABLE,
            Key: { tenant_id: tenantId }
        }));
        if (!result.Item) {
            return formatErrorResponse('Clinic record not found.');
        }
        // Only expose safe, non-sensitive fields
        const { clinic_name, subscription_expiry, status, address, contactNumber } = result.Item;
        return formatSuccessResponse({
            clinic_name,
            subscription_expiry,
            status,
            address,
            contactNumber
        });
    } catch (error) {
        console.error('❌ getClinicDetails error:', error);
        return formatErrorResponse(error.message);
    }
}

function unmarshallDynamoDBItem(item) {
    if (!item) return null;
    const result = {};
    for (const key in item) {
        const value = item[key];
        if (value.S !== undefined) result[key] = value.S;
        else if (value.N !== undefined) result[key] = Number(value.N);
        else if (value.BOOL !== undefined) result[key] = value.BOOL;
        else if (value.M !== undefined) result[key] = unmarshallDynamoDBItem(value.M);
        else if (value.L !== undefined) result[key] = value.L.map(i => {
            if (i.M) return unmarshallDynamoDBItem(i.M);
            if (i.S) return i.S;
            if (i.N) return Number(i.N);
            return null;
        });
        else result[key] = value;
    }
    return result;
}

function formatErrorResponse(message, error = null) {
    console.error(`ERROR: ${message}`, error ? error : "");
    return {
        statusCode: 400,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({
            success: false,
            error: message,
            details: error ? error.message : undefined,
            code: error ? error.name : undefined
        })
    };
}

function formatSuccessResponse(data) {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify(data)
    };
}

// ============================================
// FILE DEDUPLICATION LOGIC
// ============================================

/**
 * Verify if a file exists in S3 (for corrupted metadata recovery)
 * @param {string} s3Key - The S3 key to verify
 * @returns {Promise<boolean>} - True if file exists in S3
 */
async function verifyFileExistsInS3(s3Key) {
    if (!s3Key) return false;
    try {
        await s3.send(new HeadObjectCommand({
            Bucket: REPORTS_BUCKET,
            Key: s3Key
        }));
        return true;
    } catch (error) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            return false;
        }
        console.warn(`⚠️ S3 verification error for ${s3Key}:`, error.message);
        return false;
    }
}

/**
 * Deduplicate report files - prevents re-uploading existing files
 * 
 * @param {Array} existingFiles - Files already in DynamoDB for this patient
 * @param {Array} incomingFiles - Files sent from frontend in update request
 * @returns {Object} - { mergedFiles, stats: { kept, skipped, new, corrupted } }
 */
async function deduplicateReportFiles(existingFiles = [], incomingFiles = []) {
    console.log(`🔍 Deduplicating files: ${existingFiles.length} existing, ${incomingFiles.length} incoming`);

    const stats = { kept: 0, skipped: 0, new: 0, corrupted: 0, fixed: 0 };

    // Create a Map of existing files by s3Key for O(1) lookup
    const existingByKey = new Map();
    const existingByName = new Map(); // Fallback for legacy files

    for (const file of existingFiles) {
        const key = file.s3Key || file.key;
        if (key) {
            existingByKey.set(key, file);
        }
        // Also track by fileName for fallback matching
        if (file.fileName || file.name) {
            existingByName.set(file.fileName || file.name, file);
        }
    }

    const mergedFiles = [];
    const processedKeys = new Set();

    // Process incoming files
    for (const incomingFile of incomingFiles) {
        const incomingKey = incomingFile.s3Key || incomingFile.key;

        // Case 1: File already has S3 key and uploadedToS3 flag - KEEP as-is
        if (incomingKey && incomingFile.uploadedToS3 === true) {
            console.log(`⏭️ Keeping already-uploaded file: ${incomingFile.fileName || incomingFile.name}`);
            mergedFiles.push(incomingFile);
            processedKeys.add(incomingKey);
            stats.kept++;
            continue;
        }

        // Case 2: File has S3 key but uploadedToS3 is false/missing (corrupted metadata)
        if (incomingKey && incomingFile.uploadedToS3 !== true) {
            console.warn(`⚠️ Detected corrupted metadata for file: ${incomingFile.fileName || incomingFile.name}`);
            stats.corrupted++;

            // Verify with S3 HeadObject
            const existsInS3 = await verifyFileExistsInS3(incomingKey);

            if (existsInS3) {
                console.log(`✅ File exists in S3, fixing metadata for: ${incomingKey}`);
                mergedFiles.push({
                    ...incomingFile,
                    uploadedToS3: true, // Fix the corrupted flag
                    metadataFixedAt: new Date().toISOString()
                });
                processedKeys.add(incomingKey);
                stats.fixed++;
            } else {
                console.log(`❌ File NOT in S3, marking as failed: ${incomingKey}`);
                mergedFiles.push({
                    ...incomingFile,
                    uploadedToS3: false,
                    uploadFailed: true,
                    verifiedAt: new Date().toISOString()
                });
            }
            continue;
        }

        // Case 3: File matches existing by s3Key - SKIP (duplicate from frontend)
        if (incomingKey && existingByKey.has(incomingKey)) {
            console.log(`⏭️ Skipping duplicate file (matches existing s3Key): ${incomingKey}`);
            stats.skipped++;
            // Use the existing file data instead
            if (!processedKeys.has(incomingKey)) {
                mergedFiles.push(existingByKey.get(incomingKey));
                processedKeys.add(incomingKey);
            }
            continue;
        }

        // Case 4: Genuinely NEW file (no s3Key, needs upload)
        console.log(`📤 New file detected (needs upload): ${incomingFile.fileName || incomingFile.name}`);
        mergedFiles.push({
            ...incomingFile,
            isNew: true,
            pendingUpload: true
        });
        stats.new++;
    }

    // Add any existing files that weren't in the incoming array
    // (This preserves files that frontend didn't send - partial array support)
    for (const [key, existingFile] of existingByKey) {
        if (!processedKeys.has(key)) {
            console.log(`📁 Preserving existing file not in update: ${existingFile.fileName || existingFile.name}`);
            mergedFiles.push(existingFile);
            processedKeys.add(key);
            stats.kept++;
        }
    }

    console.log(`✅ Deduplication complete: ${JSON.stringify(stats)}`);
    console.log(`📊 Final merged files count: ${mergedFiles.length}`);

    return { mergedFiles, stats };
}

// ============================================
// HISTORY FETCH FUNCTIONS (Consolidated via Visits Table)
// ============================================

async function _fetchCompletedVisits(patientId) {
    const result = await dynamodb.send(new QueryCommand({
        TableName: VISITS_TABLE,
        IndexName: 'patientId-status-index',
        KeyConditionExpression: "patientId = :pid AND #s = :status",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":pid": patientId, ":status": "COMPLETED" },
        ScanIndexForward: false, // Latest first
        Limit: 50
    }));
    return result.Items || [];
}

async function _fetchClinicalHistoryData(patientId) {
    try {
        console.log(`📊 Fetching clinical history for: ${patientId}`);
        const visits = await _fetchCompletedVisits(patientId);

        const clinicalHistory = visits
            .filter(v => v.clinicalParameters && Object.keys(v.clinicalParameters).length > 0)
            .map(v => ({
                visitId: v.visitId,
                patientId: v.patientId,
                createdAt: v.createdAt || v.updatedAt || new Date().toISOString(),
                doctorName: v.doctorName || 'Dr. Tiwari',
                ...v.clinicalParameters
            }));

        console.log(`✅ Found ${clinicalHistory.length} clinical history entries in Visits`);
        return { success: true, clinicalHistory };
    } catch (error) {
        console.error(`❌ Clinical history fetch error:`, error.message);
        return { success: false, clinicalHistory: [], error: error.message };
    }
}

async function fetchClinicalHistory(requestData) {
    const { patientId, tenantId, userRole } = requestData;
    const raw = await _fetchClinicalHistoryData(patientId);
    if (raw?.clinicalHistory && userRole !== 'SuperAdmin') {
        raw.clinicalHistory = raw.clinicalHistory.filter(v => !v.tenant_id || v.tenant_id === tenantId);
    }
    return formatSuccessResponse(raw);
}

async function _fetchMedicalHistoryData(patientId) {
    try {
        console.log(`🏥 Fetching medical history for: ${patientId}`);
        const visits = await _fetchCompletedVisits(patientId);

        const medicalHistory = visits
            .filter(v => v.newHistoryEntry || v.historyDetails || v.medicalHistory)
            .map(v => ({
                visitId: v.visitId,
                patientId: v.patientId,
                createdAt: v.createdAt || v.updatedAt || new Date().toISOString(),
                doctorName: v.doctorName || 'Dr. Tiwari',
                historyDetails: v.newHistoryEntry || v.historyDetails || v.medicalHistory,
                medicalHistory: v.medicalHistory || v.newHistoryEntry || v.historyDetails
            }));

        console.log(`✅ Found ${medicalHistory.length} medical history entries in Visits`);
        return { success: true, medicalHistory };
    } catch (error) {
        console.error(`❌ Medical history fetch error:`, error.message);
        return { success: false, medicalHistory: [], error: error.message };
    }
}

async function fetchMedicalHistory(requestData) {
    const { patientId, tenantId, userRole } = requestData;
    const raw = await _fetchMedicalHistoryData(patientId);
    if (raw?.medicalHistory && userRole !== 'SuperAdmin') {
        raw.medicalHistory = raw.medicalHistory.filter(v => !v.tenant_id || v.tenant_id === tenantId);
    }
    return formatSuccessResponse(raw);
}

async function _fetchReportsHistoryData(patientId) {
    try {
        console.log(`📄 Fetching reports history for: ${patientId}`);
        const visits = await _fetchCompletedVisits(patientId);

        const reportsHistory = visits
            .filter(v => v.reportNotes || v.reports)
            .map(v => ({
                visitId: v.visitId,
                patientId: v.patientId,
                createdAt: v.createdAt || v.updatedAt || new Date().toISOString(),
                doctorName: v.doctorName || 'Dr. Tiwari',
                reportNotes: v.reportNotes || v.reports || 'No notes provided',
                filesAttached: v.reportFiles ? v.reportFiles.length : 0
            }));

        console.log(`✅ Found ${reportsHistory.length} reports history entries in Visits`);
        return { success: true, reportsHistory };
    } catch (error) {
        console.error(`❌ Reports history fetch error:`, error.message);
        return { success: false, reportsHistory: [], error: error.message };
    }
}

async function fetchReportsHistory(requestData) {
    const { patientId, tenantId, userRole } = requestData;
    const raw = await _fetchReportsHistoryData(patientId);
    if (raw?.reportsHistory && userRole !== 'SuperAdmin') {
        raw.reportsHistory = raw.reportsHistory.filter(v => !v.tenant_id || v.tenant_id === tenantId);
    }
    return formatSuccessResponse(raw);
}

async function _fetchDiagnosisHistoryData(patientId) {
    try {
        console.log(`🩺 Fetching diagnosis history for: ${patientId}`);
        const visits = await _fetchCompletedVisits(patientId);

        const diagnosisHistory = visits
            .filter(v => v.diagnosis)
            .map(v => ({
                visitId: v.visitId,
                patientId: v.patientId,
                createdAt: v.createdAt || v.updatedAt || new Date().toISOString(),
                doctorName: v.doctorName || 'Dr. Tiwari',
                diagnosis: v.diagnosis
            }));

        console.log(`✅ Found ${diagnosisHistory.length} diagnosis history entries in Visits`);
        return { success: true, diagnosisHistory };
    } catch (error) {
        console.error(`❌ Diagnosis history fetch error:`, error.message);
        return { success: false, diagnosisHistory: [], error: error.message };
    }
}

async function fetchDiagnosisHistory(requestData) {
    const { patientId, tenantId, userRole } = requestData;
    const raw = await _fetchDiagnosisHistoryData(patientId);
    if (raw?.diagnosisHistory && userRole !== 'SuperAdmin') {
        raw.diagnosisHistory = raw.diagnosisHistory.filter(v => !v.tenant_id || v.tenant_id === tenantId);
    }
    return formatSuccessResponse(raw);
}

async function _fetchInvestigationsHistoryData(patientId) {
    try {
        console.log(`🔬 Fetching investigations history for: ${patientId}`);
        const visits = await _fetchCompletedVisits(patientId);

        const investigationsHistory = visits
            .filter(v => (v.advisedInvestigations && v.advisedInvestigations.length > 0) || v.customInvestigations)
            .map(v => {
                // ── BUG #4 FIX: Normalize advisedInvestigations ──────────────────
                // DynamoDB stores this as a raw bullet-point string from the doctor's
                // app (e.g. "• X-Ray Chest\n• Blood Test"). Normalize it to a
                // proper string[] so the frontend can render individual items.
                let rawInv = v.advisedInvestigations || [];
                if (typeof rawInv === 'string') {
                    const trimmed = rawInv.trim();
                    // ── BUG #8 FIX: Detect JSON-serialized arrays vs bullet-point strings ──
                    // The assistant portal serializes as JSON: "[\"X-Ray\",\"CBC\"]"
                    // The doctor's mobile app uses bullet-point text: "• X-Ray\n• CBC"
                    // Both must be correctly parsed into string[].
                    if (trimmed.startsWith('[') || trimmed.startsWith('"')) {
                        try {
                            const parsed = JSON.parse(trimmed);
                            rawInv = Array.isArray(parsed) ? parsed : [parsed].filter(Boolean);
                        } catch {
                            // Fallback: treat as bullet-point string
                            rawInv = trimmed
                                .split('\n')
                                .map(line => line.replace(/^[\u2022\-\*]\s*/, '').trim())
                                .filter(line => line.length > 0);
                        }
                    } else {
                        // Plain bullet-point string from doctor's mobile app
                        rawInv = trimmed
                            .split('\n')
                            .map(line => line.replace(/^[\u2022\-\*]\s*/, '').trim())
                            .filter(line => line.length > 0);
                    }
                } else if (!Array.isArray(rawInv)) {
                    rawInv = [];
                }

                return {
                    visitId: v.visitId,
                    patientId: v.patientId,
                    createdAt: v.createdAt || v.updatedAt || new Date().toISOString(),
                    doctorName: v.doctorName || 'Dr. Tiwari',
                    investigations: rawInv,
                    customInvestigations: v.customInvestigations || ""
                };
            });

        console.log(`✅ Found ${investigationsHistory.length} investigations history entries in Visits`);
        return { success: true, investigationsHistory };
    } catch (error) {
        console.error(`❌ Investigations history fetch error:`, error.message);
        return { success: false, investigationsHistory: [], error: error.message };
    }
}

async function fetchInvestigationsHistory(requestData) {
    const { patientId, tenantId, userRole } = requestData;
    const raw = await _fetchInvestigationsHistoryData(patientId);
    if (raw?.investigationsHistory && userRole !== 'SuperAdmin') {
        raw.investigationsHistory = raw.investigationsHistory.filter(v => !v.tenant_id || v.tenant_id === tenantId);
    }
    return formatSuccessResponse(raw);
}

async function getAllPatients(requestData) {
    try {
        const { tenantId, userRole } = requestData;
        let command;

        if (userRole === 'SuperAdmin') {
            // SuperAdmin can see global metrics (Scan)
            command = new ScanCommand({ TableName: PATIENTS_TABLE });
        } else {
            // Clinics strictly query their own partition
            command = new QueryCommand({
                TableName: PATIENTS_TABLE,
                IndexName: PATIENT_TENANT_INDEX,
                KeyConditionExpression: "tenant_id = :tid",
                ExpressionAttributeValues: { ":tid": tenantId }
            });
        }

        const result = await dynamodb.send(command);
        const patients = result.Items || [];

        console.log(`📋 Retrieved ${patients.length} patients for Tenant: ${tenantId}`);

        const enrichedPatients = await Promise.all(
            patients.map(async (patient) => {
                if (patient.reportFiles && Array.isArray(patient.reportFiles)) {
                    patient.reportFiles = await enrichPatientFilesWithSignedUrls(patient.reportFiles);
                }
                return patient;
            })
        );

        return formatSuccessResponse({ success: true, patients: enrichedPatients, count: enrichedPatients.length });
    } catch (error) {
        console.error('ERROR getting all patients:', error);
        return formatErrorResponse(`Failed to get patients: ${error.message}`, error);
    }
}

async function searchPatients(requestData) {
    try {
        const { searchTerm } = requestData;

        if (!searchTerm || searchTerm.length < 2) {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true
                },
                body: JSON.stringify({
                    success: true,
                    patients: [],
                    message: "Search term too short"
                })
            };
        }

        console.log(`🔍 Searching patients with term: "${searchTerm}"`);

        const searchTermLower = searchTerm.toLowerCase().trim();
        const searchTermClean = searchTerm.replace(/\D/g, ''); // Digits only for phone search
        const isPhoneSearch = /^\d{8,10}$/.test(searchTermClean);

        // Replace the ScanCommand with this:
        const command = new QueryCommand({
            TableName: PATIENTS_TABLE,
            IndexName: PATIENT_TENANT_INDEX,
            KeyConditionExpression: "tenant_id = :tid",
            ProjectionExpression: "patientId, #n, age, sex, mobile, address, #s",
            ExpressionAttributeNames: { "#n": "name", "#s": "status" },
            ExpressionAttributeValues: { ":tid": requestData.tenantId }
        });

        const result = await dynamodb.send(command);

        const allPatients = result.Items || [];
        console.log(`📋 Scanned ${allPatients.length} patients`);

        // Filter patients based on search term
        let matchedPatients = [];

        if (isPhoneSearch) {
            // Phone number search - exact or partial match
            console.log(`📞 Phone search mode: ${searchTermClean}`);
            matchedPatients = allPatients.filter(patient => {
                const patientMobile = (patient.mobile || '').replace(/\D/g, '');
                return patientMobile.includes(searchTermClean) || searchTermClean.includes(patientMobile);
            });
        } else {
            // Name search - case-insensitive contains
            console.log(`👤 Name search mode: ${searchTermLower}`);
            matchedPatients = allPatients.filter(patient => {
                const patientName = (patient.name || '').toLowerCase();
                const patientMobile = (patient.mobile || '').replace(/\D/g, '');
                // Match by name OR partial phone
                return patientName.includes(searchTermLower) ||
                    patientMobile.includes(searchTermClean);
            });
        }

        // Format results
        const formattedPatients = matchedPatients.map(p => ({
            patientId: p.patientId,
            name: p.name || 'Unknown',
            age: p.age ? String(p.age) : '0',
            sex: p.sex || 'N/A',
            mobile: p.mobile || '',
            address: p.address || '',
            status: p.status || 'ACTIVE'
        }));

        console.log(`✅ Found ${formattedPatients.length} matching patients`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify({
                success: true,
                patients: formattedPatients,
                count: formattedPatients.length,
                searchType: isPhoneSearch ? 'phone' : 'name'
            })
        };
    } catch (error) {
        console.error('❌ Search error:', error);
        return formatErrorResponse(`Search failed: ${error.message}`);
    }
}

async function deletePatient(requestData) {
    const { patientId, tenantId, userRole } = requestData;
    if (!patientId) return formatErrorResponse("Missing patientId");

    // ============================================
    // ZERO-TRUST TENANT CHECK
    // ============================================
    const record = await dynamodb.send(new GetCommand({ TableName: PATIENTS_TABLE, Key: { patientId } }));
    if (record.Item && record.Item.tenant_id !== tenantId && userRole !== 'SuperAdmin') {
        console.error(`🚨 SECURITY BLOCK: Tenant ${tenantId} attempted to delete patient from ${record.Item.tenant_id}`);
        return formatErrorResponse("Forbidden: Cross-tenant data access blocked", 403);
    }

    await dynamodb.send(new DeleteCommand({
        TableName: PATIENTS_TABLE,
        Key: { patientId: requestData.patientId }
    }));
    return formatSuccessResponse({ success: true });
}

async function updatePatientData(requestData) {
    try {
        const { patientId, ...updateData } = requestData;

        if (!patientId) {
            return formatErrorResponse("Missing patientId for update");
        }

        console.log(`🔄 Updating patient: ${patientId}`);

        // ============================================
        // STEP 1: Fetch existing patient data first
        // ============================================
        let existingPatient = null;
        try {
            const existingResult = await dynamodb.send(new GetCommand({
                TableName: PATIENTS_TABLE,
                Key: { patientId }
            }));
            existingPatient = existingResult.Item;
            console.log(`📋 Fetched existing patient, has ${existingPatient?.reportFiles?.length || 0} files`);

            // ============================================
            // ZERO-TRUST TENANT CHECK
            // ============================================
            if (existingPatient && existingPatient.tenant_id !== requestData.tenantId && requestData.userRole !== 'SuperAdmin') {
                console.error(`🚨 SECURITY BLOCK: Tenant ${requestData.tenantId} attempted to update patient from ${existingPatient.tenant_id}`);
                return formatErrorResponse("Forbidden: Cross-tenant data access blocked", 403);
            }
        } catch (fetchError) {
            console.warn(`⚠️ Could not fetch existing patient: ${fetchError.message}`);
            // Continue anyway - will create if not exists
        }

        // ============================================
        // STEP 2: Deduplicate reportFiles if present
        // ============================================
        let fileStats = null;
        if (updateData.reportFiles && Array.isArray(updateData.reportFiles)) {
            const existingFiles = existingPatient?.reportFiles || [];
            const incomingFiles = updateData.reportFiles;

            console.log(`📁 Processing reportFiles update...`);
            console.log(`   ⏭️ Existing files in DB: ${existingFiles.length}`);
            console.log(`   📥 Incoming files from frontend: ${incomingFiles.length}`);

            // Deduplicate files
            const { mergedFiles, stats } = await deduplicateReportFiles(existingFiles, incomingFiles);
            fileStats = stats;

            // Replace updateData.reportFiles with deduplicated array
            updateData.reportFiles = mergedFiles;

            // Log the action summary
            console.log(`✅ File deduplication result:`);
            console.log(`   ⏭️ Skipped (already uploaded): ${stats.skipped}`);
            console.log(`   📁 Kept (preserved existing): ${stats.kept}`);
            console.log(`   📤 New (pending upload): ${stats.new}`);
            console.log(`   🔧 Fixed (corrupted metadata): ${stats.fixed}`);
            console.log(`   📊 Final file count: ${mergedFiles.length}`);
        } else if (existingPatient?.reportFiles && !updateData.reportFiles) {
            // If frontend didn't send reportFiles, preserve existing ones
            console.log(`📁 No reportFiles in update, preserving existing ${existingPatient.reportFiles.length} files`);
            // Don't add to updateData - let existing files remain unchanged
        }

        // ============================================
        // STEP 3: Build update expression
        // ============================================
        const updateExpression = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        Object.keys(updateData).forEach((key) => {
            if (key !== 'action' && key !== 'updateMode' && key !== 'patientId') {
                const attrName = `#${key}`;
                const attrValue = `:${key}`;
                updateExpression.push(`${attrName} = ${attrValue}`);
                expressionAttributeNames[attrName] = key;
                expressionAttributeValues[attrValue] = updateData[key];
            }
        });

        updateExpression.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();

        // ============================================
        // VISIT LOCK: Mark visit as completed when this is a final prescription save
        // isPartialSave === false means the doctor clicked Save/Update on the Prescription tab
        // ============================================
        const isFinalPrescriptionSave = updateData.isPartialSave === false ||
            updateData.saveSection === 'prescription';

        if (isFinalPrescriptionSave) {
            const todayDate = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
            console.log(`🔒 Final prescription save detected. Locking visit for date: ${todayDate}`);
            updateExpression.push('#lastLockedVisitDate = :lastLockedVisitDate');
            expressionAttributeNames['#lastLockedVisitDate'] = 'lastLockedVisitDate';
            expressionAttributeValues[':lastLockedVisitDate'] = todayDate;

            updateExpression.push('#visitCompletedAt = :visitCompletedAt');
            expressionAttributeNames['#visitCompletedAt'] = 'visitCompletedAt';
            expressionAttributeValues[':visitCompletedAt'] = new Date().toISOString();
        }

        // ============================================
        // STEP 4: Execute conditional update
        // ============================================
        const params = {
            TableName: PATIENTS_TABLE,
            Key: { patientId },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        };

        const result = await dynamodb.send(new UpdateCommand(params));
        console.log(`✅ Patient updated: ${patientId}`);

        // Return response with file stats if applicable
        const response = {
            success: true,
            patientId,
            updatedFields: Object.keys(updateData).filter(k => k !== 'action' && k !== 'updateMode')
        };

        if (fileStats) {
            response.fileStats = fileStats;
            response.message = `Updated with ${fileStats.kept} existing files preserved, ${fileStats.new} new files added`;
        }

        return formatSuccessResponse(response);
    } catch (error) {
        console.error('❌ Error updating patient:', error);
        return formatErrorResponse(`Failed to update patient: ${error.message}`);
    }
}

async function processSectionSave(requestData) {
    try {
        const { patientId, section, ...sectionData } = requestData;

        if (!patientId || !section) {
            return formatErrorResponse("Missing patientId or section");
        }

        console.log(`💾 Saving ${section} section for patient: ${patientId}`);

        // Build update expression for the specific section
        const updateExpression = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        Object.keys(sectionData).forEach((key) => {
            if (key !== 'action' && key !== 'isPartialSave' && key !== 'section' && key !== 'patientId') {
                const attrName = `#${key}`;
                const attrValue = `:${key}`;
                updateExpression.push(`${attrName} = ${attrValue}`);
                expressionAttributeNames[attrName] = key;
                expressionAttributeValues[attrValue] = sectionData[key];
            }
        });

        if (updateExpression.length === 0) {
            return formatSuccessResponse({
                success: true,
                patientId,
                message: "No changes to save"
            });
        }

        updateExpression.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();

        const params = {
            TableName: PATIENTS_TABLE,
            Key: { patientId },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'UPDATED_NEW'
        };

        await dynamodb.send(new UpdateCommand(params));
        console.log(`✅ Section saved: ${section} for ${patientId}`);

        return formatSuccessResponse({
            success: true,
            patientId,
            section,
            message: `${section} section saved successfully`
        });
    } catch (error) {
        console.error('❌ Error saving section:', error);
        return formatErrorResponse(`Failed to save section: ${error.message}`);
    }
}

async function processPatientData(requestData) {
    try {
        const { name, age, sex, mobile, address, patientId: providedPatientId } = requestData;

        if (!name) return formatErrorResponse("Missing required field: name (fullName)");

        // ============================================
        // SUBSCRIPTION CHECK
        // ============================================
        if (requestData.tenantId && requestData.userRole !== 'SuperAdmin') {
            const subState = await getClinicSubscriptionState(requestData.tenantId);
            if (!subState.isActive) {
                return formatErrorResponse("Subscription expired. Patient registration is blocked.", 403);
            }
        }

        // DEDUP CHECK 1: explicit patientId
        if (providedPatientId) {
            const existingById = await dynamodb.send(new GetCommand({
                TableName: PATIENTS_TABLE,
                Key: { patientId: providedPatientId }
            }));
            if (existingById.Item) {
                console.log(`♻️ Patient ${providedPatientId} already exists. Returning existing record.`);
                return formatSuccessResponse({
                    success: true,
                    patientId: providedPatientId,
                    message: "Existing patient record returned"
                });
            }
        }

        // DEDUP CHECK 2: mobile number
        if (mobile) {
            const mobileScan = await dynamodb.send(new ScanCommand({
                TableName: PATIENTS_TABLE,
                FilterExpression: 'mobile = :m',
                ExpressionAttributeValues: { ':m': mobile }
            }));
            if (mobileScan.Items && mobileScan.Items.length > 0) {
                const existing = mobileScan.Items[0];
                console.log(`♻️ Found existing patient ${existing.patientId} with mobile ${mobile}.`);
                return formatSuccessResponse({
                    success: true,
                    patientId: existing.patientId,
                    message: "Existing patient record returned"
                });
            }
        }

        console.log("🆕 Creating new patient...");
        const newPatientId = providedPatientId || `patient_${randomUUID().split('-')[0]}`;

        const patientRecord = {
            patientId: newPatientId,
            tenant_id: requestData.tenantId, // TASK 3: INJECT TENANT ID
            name,
            age: parseInt(age),
            sex,
            mobile: mobile || "",
            address: address || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            reportFiles: [],
            medications: [],
            clinicalParameters: {},
            diagnosis: "",
            treatment: "",
            prescription: "",
            advisedInvestigations: ""
        };

        await dynamodb.send(new PutCommand({ TableName: PATIENTS_TABLE, Item: patientRecord }));
        console.log(`✅ Patient created: ${newPatientId}`);

        return formatSuccessResponse({
            success: true,
            patientId: newPatientId,
            message: "Patient created successfully"
        });
    } catch (error) {
        console.error('❌ Error creating patient:', error);
        return formatErrorResponse(`Failed to create patient: ${error.message}`);
    }
}

/**
 * Initiate a new visit (Assistant Intake)
 * Creates a record in the Visits table with status WAITING
 */
async function initiateVisit(requestData) {
    try {
        const { patientId, name, age, sex, mobile, address } = requestData;

        if (!patientId) {
            return formatErrorResponse("Missing patientId");
        }

        // ============================================
        // SUBSCRIPTION CHECK
        // ============================================
        if (requestData.tenantId && requestData.userRole !== 'SuperAdmin') {
            const subState = await getClinicSubscriptionState(requestData.tenantId);
            if (!subState.isActive) {
                return formatErrorResponse("Subscription expired. New visits cannot be initiated.", 403);
            }
        }

        // ── IDEMPOTENCY GUARD ──────────────────────────────────────────────
        // Before creating anything, check if an active visit already exists.
        // If yes, return the existing visitId — do NOT create a duplicate.
        console.log(`🔍 Checking for existing active visit for patient ${patientId}...`);
        for (const status of ['WAITING', 'IN_PROGRESS']) {
            const existing = await dynamodb.send(new QueryCommand({
                TableName: VISITS_TABLE,
                IndexName: 'patientId-status-index',
                KeyConditionExpression: 'patientId = :pid AND #status = :s',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: { ':pid': patientId, ':s': status }
            }));
            if (existing.Items && existing.Items.length > 0) {
                const existingVisit = existing.Items[0];
                console.log(`♻️ Patient ${patientId} already has an active visit (${existingVisit.visitId}). Returning existing.`);
                return formatSuccessResponse({
                    success: true,
                    visitId: existingVisit.visitId,
                    message: "Existing active visit returned"
                });
            }
        }
        // ──────────────────────────────────────────────────────────────────

        // Auto-create patient record if it doesn't exist yet
        const patientResult = await dynamodb.send(new GetCommand({
            TableName: PATIENTS_TABLE,
            Key: { patientId }
        }));

        if (!patientResult.Item) {
            console.log(`🆕 Patient ${patientId} not found. Creating patient record...`);
            await dynamodb.send(new PutCommand({
                TableName: PATIENTS_TABLE,
                Item: {
                    patientId,
                    tenant_id: requestData.tenantId, // TASK 3: INJECT TENANT ID
                    name: name || "Unknown",
                    age: age ? parseInt(age) : 0,
                    sex: sex || "",
                    mobile: mobile || "",
                    address: address || "",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    reportFiles: []
                }
            }));
        } else {
            // ============================================
            // ZERO-TRUST TENANT CHECK ON EXISTING PATIENT
            // ============================================
            if (patientResult.Item.tenant_id !== requestData.tenantId && requestData.userRole !== 'SuperAdmin') {
                console.error(`🚨 SECURITY BLOCK: Tenant ${requestData.tenantId} attempted to initiate visit for patient from clinic ${patientResult.Item.tenant_id}`);
                return formatErrorResponse("Forbidden: Cross-tenant data access blocked", 403);
            }
        }

        const visitId = `visit_${randomUUID()}`;

        const visitItem = {
            visitId,
            patientId,
            tenant_id: requestData.tenantId, // TASK 3: INJECT TENANT ID
            status: 'WAITING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            name: name || (patientResult.Item?.name || "Unknown"),
            age: age ? parseInt(age) : (patientResult.Item?.age || 0),
            sex: sex || (patientResult.Item?.sex || ""),
            mobile: mobile || (patientResult.Item?.mobile || ""),
            address: address || (patientResult.Item?.address || ""),
            diagnosis: "",
            medications: [],
            clinicalParameters: {},
            reportFiles: [],
            advisedInvestigations: []
        };

        console.log(`🎬 Initiating visit ${visitId} for patient ${patientId}`);

        await dynamodb.send(new PutCommand({
            TableName: VISITS_TABLE,
            Item: visitItem
        }));

        return formatSuccessResponse({
            success: true,
            visitId,
            message: "Visit initiated successfully"
        });
    } catch (error) {
        console.error('❌ Error initiating visit:', error);
        return formatErrorResponse(`Failed to initiate visit: ${error.message}`);
    }
}

/**
 * Retrieves the active visit for a patient
 * Queries for WAITING or IN_PROGRESS status
 */
async function handleGetWaitingRoom(requestData) {
    try {
        const { tenantId } = requestData;
        console.log(`📡 Fetching Waiting Room Queue for Tenant: ${tenantId}`);

        // Secure Query using the Tenant Index
        const params = {
            TableName: VISITS_TABLE,
            IndexName: VISIT_TENANT_INDEX,
            KeyConditionExpression: "tenant_id = :tid",
            FilterExpression: "#s = :waiting",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: {
                ":tid": tenantId,
                ":waiting": "WAITING"
            }
        };

        const result = await dynamodb.send(new QueryCommand(params));

        // Because GSIs don't easily sort by a third attribute without composite keys, 
        // we sort the waiting room array in memory by arrival time.
        let visits = result.Items || [];
        visits.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        console.log(`✅ Found ${visits.length} patients in Waiting Room for this clinic`);

        return formatSuccessResponse({ success: true, patients: visits, count: visits.length });
    } catch (error) {
        console.error('ERROR getting waiting room:', error);
        return formatErrorResponse(`Failed to get waiting room: ${error.message}`, error);
    }
}

async function getAllPatientVisits(requestData) {
    try {
        const { patientId, tenantId, userRole } = requestData;
        if (!patientId) return formatErrorResponse("Missing patientId");

        console.log(`🔍 Getting all historical visits for patient: ${patientId}`);

        // Query the GSI using only the Partition Key (patientId) to fetch all statuses
        const result = await dynamodb.send(new QueryCommand({
            TableName: VISITS_TABLE,
            IndexName: 'patientId-status-index',
            KeyConditionExpression: 'patientId = :pid',
            ExpressionAttributeValues: { ':pid': patientId }
        }));

        let visits = result.Items || [];

        // ============================================
        // ZERO-TRUST TENANT CHECK
        // ============================================
        if (visits.length > 0) {
            const sampleVisit = visits[0];
            if (sampleVisit.tenant_id && sampleVisit.tenant_id !== tenantId && userRole !== 'SuperAdmin') {
                console.error(`🚨 SECURITY BLOCK: Tenant ${tenantId} attempted to get visits from ${sampleVisit.tenant_id}`);
                return formatErrorResponse("Forbidden: Cross-tenant data access blocked", 403);
            }
        }

        // Sort dynamically from newest to oldest based on creation
        visits.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Enrich all embedded report files across all historical visits
        const enrichedVisits = await Promise.all(visits.map(async (visit) => {
            if (visit.reportFiles && Array.isArray(visit.reportFiles) && visit.reportFiles.length > 0) {
                visit.reportFiles = await enrichPatientFilesWithSignedUrls(visit.reportFiles);
            }
            return visit;
        }));

        return formatSuccessResponse({
            success: true,
            visits: enrichedVisits
        });
    } catch (error) {
        console.error('❌ Error getting all patient visits:', error);
        return formatErrorResponse(`Failed to fetch patient visits: ${error.message}`);
    }
}

async function getActiveVisit(requestData) {
    try {
        const { patientId, tenantId, userRole } = requestData;
        if (!patientId) return formatErrorResponse("Missing patientId");

        console.log(`🔍 Checking for active visit for patient: ${patientId}`);

        // We check for WAITING or IN_PROGRESS using the GSI
        const statuses = ['WAITING', 'IN_PROGRESS'];
        let activeVisit = null;

        for (const status of statuses) {
            const result = await dynamodb.send(new QueryCommand({
                TableName: VISITS_TABLE,
                IndexName: 'patientId-status-index',
                KeyConditionExpression: 'patientId = :pid AND #status = :s',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: { ':pid': patientId, ':s': status }
            }));

            if (result.Items && result.Items.length > 0) {
                activeVisit = result.Items[0];

                // ============================================
                // ZERO-TRUST TENANT CHECK
                // ============================================
                if (activeVisit.tenant_id !== tenantId && userRole !== 'SuperAdmin') {
                    console.error(`🚨 SECURITY BLOCK: Tenant ${tenantId} attempted to get active visit from ${activeVisit.tenant_id}`);
                    return formatErrorResponse("Forbidden: Cross-tenant data access blocked", 403);
                }

                break;
            }
        }

        return formatSuccessResponse({
            success: true,
            activeVisit
        });
    } catch (error) {
        console.error('❌ Error getting active visit:', error);
        return formatErrorResponse(`Failed to get active visit: ${error.message}`);
    }
}

/**
 * Updates ONLY the status of a visit (e.g., WAITING -> IN_PROGRESS)
 * Used to immediately remove patients from the Assistant's Waiting Room queue
 */
async function updateVisitStatus(requestData) {
    try {
        const { visitId, status } = requestData;

        if (!visitId || !status) {
            return formatErrorResponse("Missing visitId or status");
        }

        console.log(`🔄 Updating visit ${visitId} status to ${status}`);

        // ============================================
        // ZERO-TRUST TENANT CHECK
        // ============================================
        const existingVisit = await dynamodb.send(new GetCommand({ TableName: VISITS_TABLE, Key: { visitId } }));
        if (existingVisit.Item && existingVisit.Item.tenant_id !== requestData.tenantId && requestData.userRole !== 'SuperAdmin') {
            console.error(`🚨 SECURITY BLOCK: Tenant ${requestData.tenantId} attempted to update status on visit from ${existingVisit.Item.tenant_id}`);
            return formatErrorResponse("Forbidden: Cross-tenant data access blocked", 403);
        }

        const params = {
            TableName: VISITS_TABLE,
            Key: { visitId },
            UpdateExpression: "SET #status = :s, updatedAt = :t",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: {
                ":s": status,
                ":t": new Date().toISOString()
            }
        };

        await dynamodb.send(new UpdateCommand(params));

        return formatSuccessResponse({
            success: true,
            message: `Visit status updated to ${status}`
        });
    } catch (error) {
        console.error('❌ Error updating visit status:', error);
        return formatErrorResponse(`Failed to update status: ${error.message}`);
    }
}

/**
 * Completes a visit (Doctor Consultation)
 * Atomically marks visit as COMPLETED, saves final clinical data, and appends snapshot to Master record
 */
async function completeVisit(requestData) {
    try {
        // FIX 1: Correctly extract the explicitly nested acuteData object
        const { visitId, patientId, acuteData = {} } = requestData;

        if (!visitId || !patientId) {
            return formatErrorResponse("Missing visitId or patientId");
        }

        const timestamp = new Date().toISOString();
        console.log(`🏁 Completing visit ${visitId} for patient ${patientId}`);

        // ============================================
        // ZERO-TRUST TENANT CHECK
        // ============================================
        const visitRecord = await dynamodb.send(new GetCommand({ TableName: VISITS_TABLE, Key: { visitId } }));
        if (visitRecord.Item && visitRecord.Item.tenant_id !== requestData.tenantId && requestData.userRole !== 'SuperAdmin') {
            console.error(`🚨 SECURITY BLOCK: Tenant ${requestData.tenantId} attempted to complete visit from ${visitRecord.Item.tenant_id}`);
            return formatErrorResponse("Forbidden: Cross-tenant data access blocked", 403);
        }

        // Prepare snapshot for Master record
        const visitSummary = {
            visitId,
            date: timestamp,
            diagnosis: acuteData.diagnosis || "",
            medications: acuteData.medications || [],
            vitalsSummary: acuteData.clinicalParameters || {}
        };

        const params = {
            TransactItems: [
                {
                    // FIX 2: Update the Visits table with the Doctor's final edits AND the status
                    Update: {
                        TableName: VISITS_TABLE,
                        Key: { visitId },
                        UpdateExpression: 'SET #status = :c, updatedAt = :t, completedAt = :t, diagnosis = :diag, medications = :meds, clinicalParameters = :vitals, reportNotes = :reports, medicalHistory = :hist, advisedInvestigations = :inv',
                        ExpressionAttributeNames: { '#status': 'status' },
                        ExpressionAttributeValues: {
                            ':c': 'COMPLETED',
                            ':t': timestamp,
                            ':diag': acuteData.diagnosis || "",
                            ':meds': acuteData.medications || [],
                            ':vitals': acuteData.clinicalParameters || {},
                            ':reports': acuteData.reports || acuteData.reportNotes || "",
                            ':hist': acuteData.newHistoryEntry || acuteData.medicalHistory || "",
                            ':inv': acuteData.advisedInvestigations || ""
                        }
                    }
                },
                {
                    // Append to Patient Master visitHistory (Safe null handling)
                    Update: {
                        TableName: PATIENTS_TABLE,
                        Key: { patientId },
                        UpdateExpression: 'SET visitHistory = list_append(if_not_exists(visitHistory, :empty_list), :new_visit), updatedAt = :t',
                        ExpressionAttributeValues: {
                            ':new_visit': [visitSummary],
                            ':empty_list': [],
                            ':t': timestamp
                        }
                    }
                }
            ]
        };

        await dynamodb.send(new TransactWriteCommand(params));
        console.log(`✅ Visit ${visitId} completed and archived to master`);

        return formatSuccessResponse({
            success: true,
            message: "Visit completed and archived successfully"
        });
    } catch (error) {
        console.error('❌ Error completing visit:', error);
        return formatErrorResponse(`Failed to complete visit: ${error.message}`);
    }
}

/**
 * Updates an existing visit record
 */
async function updateVisit(requestData) {
    try {
        const { visitId, ...updateData } = requestData;

        if (!visitId) {
            return formatErrorResponse("Missing visitId for update");
        }

        console.log(`🔄 Updating visit: ${visitId}`);

        // ============================================
        // ZERO-TRUST TENANT CHECK
        // ============================================
        const visitFetch = await dynamodb.send(new GetCommand({ TableName: VISITS_TABLE, Key: { visitId } }));
        if (visitFetch.Item && visitFetch.Item.tenant_id !== requestData.tenantId && requestData.userRole !== 'SuperAdmin') {
            console.error(`🚨 SECURITY BLOCK: Tenant ${requestData.tenantId} attempted to update visit from ${visitFetch.Item.tenant_id}`);
            return formatErrorResponse("Forbidden: Cross-tenant data access blocked", 403);
        }

        const updateExpression = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        Object.keys(updateData).forEach((key) => {
            if (key !== 'action' && key !== 'visitId' && key !== 'patientId') {
                const attrName = `#${key}`;
                const attrValue = `:${key}`;
                updateExpression.push(`${attrName} = ${attrValue}`);
                expressionAttributeNames[attrName] = key;
                expressionAttributeValues[attrValue] = updateData[key];
            }
        });

        if (updateExpression.length === 0) {
            return formatSuccessResponse({ success: true, message: "No changes to update" });
        }

        updateExpression.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();

        const params = {
            TableName: VISITS_TABLE,
            Key: { visitId },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        };

        const result = await dynamodb.send(new UpdateCommand(params));
        console.log(`✅ Visit updated: ${visitId}`);

        return formatSuccessResponse({
            success: true,
            visitId,
            updatedVisit: result.Attributes
        });
    } catch (error) {
        console.error('❌ Error updating visit:', error);
        return formatErrorResponse(`Failed to update visit: ${error.message}`);
    }
}

// ============================================
// FITNESS CERTIFICATE OPERATIONS
// ============================================

async function saveFitnessCertificate(requestData) {
    try {
        const { patientId, data } = requestData;

        if (!patientId || !data || !data.certificateId) {
            return formatErrorResponse("Missing required fields: patientId, data.certificateId");
        }

        console.log(`💾 Saving fitness certificate for patient: ${patientId}, ID: ${data.certificateId}`);

        // Get current patient to append to list
        const patientResult = await dynamodb.send(new GetCommand({
            TableName: PATIENTS_TABLE,
            Key: { patientId }
        }));

        if (!patientResult.Item) {
            return formatErrorResponse("Patient not found");
        }

        // ============================================
        // ZERO-TRUST TENANT CHECK
        // ============================================
        if (patientResult.Item.tenant_id !== requestData.tenantId && requestData.userRole !== 'SuperAdmin') {
            console.error(`🚨 SECURITY BLOCK: Tenant ${requestData.tenantId} attempted to save fitness cert for ${patientResult.Item.tenant_id}`);
            return formatErrorResponse("Forbidden: Cross-tenant data access blocked", 403);
        }

        const currentCertificates = patientResult.Item.fitnessCertificates || [];

        // Check if certificate exists (by ID) to support updates vs inserts
        const exists = currentCertificates.some(cert => cert.certificateId === data.certificateId);

        let updatedCertificates;
        if (exists) {
            console.log(`⚠️ Certificate ${data.certificateId} already exists, updating it.`);
            updatedCertificates = currentCertificates.map(cert =>
                cert.certificateId === data.certificateId ? { ...data, updatedAt: new Date().toISOString() } : cert
            );
        } else {
            // Prepend new certificate to keep latest first
            updatedCertificates = [data, ...currentCertificates];
        }

        // Update Patient Record
        await dynamodb.send(new UpdateCommand({
            TableName: PATIENTS_TABLE,
            Key: { patientId },
            UpdateExpression: "SET fitnessCertificates = :certs, updatedAt = :updatedAt",
            ExpressionAttributeValues: {
                ":certs": updatedCertificates,
                ":updatedAt": new Date().toISOString()
            }
        }));

        console.log(`✅ Fitness Certificate saved successfully. Total count: ${updatedCertificates.length}`);

        return formatSuccessResponse({
            success: true,
            certificateId: data.certificateId,
            message: "Certificate saved successfully"
        });

    } catch (error) {
        console.error('❌ Error saving fitness certificate:', error);
        return formatErrorResponse(`Failed to save certificate: ${error.message}`);
    }
}

async function getFitnessCertificates(requestData) {
    try {
        const { patientId, tenantId, userRole } = requestData;
        console.log(`📜 Fetching fitness certificates for: ${patientId}`);

        const result = await dynamodb.send(new GetCommand({
            TableName: PATIENTS_TABLE,
            Key: { patientId }
        }));

        if (!result.Item) {
            return formatErrorResponse("Patient not found");
        }

        // ============================================
        // ZERO-TRUST TENANT CHECK
        // ============================================
        if (result.Item.tenant_id !== tenantId && userRole !== 'SuperAdmin') {
            console.error(`🚨 SECURITY BLOCK: Tenant ${tenantId} attempted to get fitness certs from ${result.Item.tenant_id}`);
            return formatErrorResponse("Forbidden: Cross-tenant data access blocked", 403);
        }

        const certificates = result.Item.fitnessCertificates || [];
        console.log(`✅ Found ${certificates.length} fitness certificates`);

        return formatSuccessResponse({
            success: true,
            certificates: certificates
        });

    } catch (error) {
        console.error('❌ Error fetching fitness certificates:', error);
        return formatErrorResponse(`Failed to fetch certificates: ${error.message}`);
    }
}

// ============================================
// DYNAMIC MEDICINE MASTER LOGIC
// ============================================

/**
 * Normalizes medicine name for consistent storage and search
 * TRIMS whitespace -> COLLAPSES multiple spaces -> UPPERCASE
 * Example: "  para   500 " -> "PARA 500"
 */
function normalizeMedicineName(name) {
    if (!name) return "";
    return name
        .trim()
        .replace(/\s+/g, ' ') // Collapse multiple spaces to single
        .toUpperCase();
}

/**
 * Searches for medicines using prefix search
 * Input: { query: "par" }
 * Output: ["PARA 500", "PARACETAMOL"]
 */
async function searchMedicines(requestData) {
    try {
        const { query } = requestData;
        if (!query || query.length < 1) { // Relaxed check
            return {
                statusCode: 200,
                body: JSON.stringify({ medicines: [] })
            };
        }

        const normalizedQuery = normalizeMedicineName(query);
        console.log(`🔍 Searching medicines with prefix: ${normalizedQuery}`);

        const command = new QueryCommand({
            TableName: "Medicines", // Constant table name
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": "MEDICINE",
                ":sk": normalizedQuery
            },
            Limit: 20 // Performance limit
        });

        const result = await dynamodb.send(command);

        // Extract just the display name
        const medicines = (result.Items || []).map(item => item.name);

        return formatSuccessResponse({
            success: true,
            medicines: medicines
        });

    } catch (error) {
        console.error("❌ Error searching medicines:", error);
        return formatSuccessResponse({ success: false, error: error.message }); // Return 200 with error to avoid 500 crash
    }
}

/**
 * Adds a new medicine to the master database
 * Input: { name: "Azithral 500" }
 * Output: Success
 */
async function addMedicine(requestData) {
    try {
        const { name } = requestData;
        if (!name) return formatErrorResponse("Medicine name is required");

        const normalizedSK = normalizeMedicineName(name);
        const displayName = name.trim().replace(/\s+/g, ' ');

        const params = {
            TableName: "Medicines",
            Item: {
                PK: "MEDICINE",
                SK: normalizedSK,
                name: displayName,
                createdAt: new Date().toISOString()
            },
            ConditionExpression: "attribute_not_exists(SK)" // Prevent overwrite
        };

        try {
            await dynamodb.send(new PutCommand(params));
            console.log(`✅ Added new medicine: ${normalizedSK}`);

            return formatSuccessResponse({
                success: true,
                medicine: { name: displayName }
            });

        } catch (dbError) {
            if (dbError.name === "ConditionalCheckFailedException") {
                console.log(`ℹ️ Medicine already exists: ${normalizedSK}`);
                return formatSuccessResponse({
                    success: true,
                    message: "Medicine already exists",
                    medicine: { name: displayName }
                });
            }
            console.error("❌ DynamoDB error:", dbError);
            throw dbError; // Rethrow so main catch handles it
        }

    } catch (error) {
        console.error("❌ Error adding medicine:", error);
        return formatErrorResponse(`Add failed: ${error.message}`);
    }
}

async function savePrescription(requestData) {
    try {
        // Support both direct requestData and nested payload for backward compat
        const payload = requestData.payload || requestData;
        const {
            patientId, patientName, age, gender, visitDate,
            doctorName, medications, diagnosis,
            advisedInvestigations, additionalNotes, prescriptionDate
        } = payload;

        if (!patientId) return formatErrorResponse("Missing patientId");

        // ============================================
        // ZERO-TRUST TENANT CHECK
        // ============================================
        const patientRecord = await dynamodb.send(new GetCommand({ TableName: PATIENTS_TABLE, Key: { patientId } }));
        if (patientRecord.Item && patientRecord.Item.tenant_id !== requestData.tenantId && requestData.userRole !== 'SuperAdmin') {
            console.error(`🚨 SECURITY BLOCK: Tenant ${requestData.tenantId} attempted to save prescription for ${patientRecord.Item.tenant_id}`);
            return formatErrorResponse("Forbidden: Cross-tenant data access blocked", 403);
        }

        const prescriptionId = randomUUID();
        const timestamp = new Date().toISOString();

        const item = {
            prescriptionId,
            patientId,
            tenant_id: requestData.tenantId,   // ← Stamped for clinic-wise isolation
            patientName: patientName || 'Unknown',
            age: age || 'N/A',
            gender: gender || 'N/A',
            visitDate: visitDate || timestamp,
            doctorName: doctorName || 'System',
            medications: medications || [],
            diagnosis: diagnosis || null,
            advisedInvestigations: advisedInvestigations || null,
            additionalNotes: additionalNotes || null,
            prescriptionDate: prescriptionDate || timestamp,
            createdAt: timestamp
        };

        await dynamodb.send(new PutCommand({
            TableName: PRESCRIPTIONS_TABLE,
            Item: item
        }));

        // Best-effort update of patient's last prescription date
        try {
            await dynamodb.send(new UpdateCommand({
                TableName: PATIENTS_TABLE,
                Key: { patientId },
                UpdateExpression: "SET lastPrescriptionDate = :date",
                ExpressionAttributeValues: { ":date": timestamp }
            }));
        } catch (updateErr) {
            console.warn("Could not update lastPrescriptionDate:", updateErr.message);
        }

        return formatSuccessResponse({
            success: true,
            prescriptionId,
            message: "Prescription saved successfully."
        });
    } catch (error) {
        console.error("❌ Error in savePrescription:", error);
        return formatErrorResponse(error.message);
    }
}

async function getPatientPrescriptions(requestData) {
    const { patientId, tenantId, userRole } = requestData;
    if (!patientId) return formatErrorResponse("Missing patientId");
    
    try {
        // 1. Legacy Prescriptions
        let legacyItems = [];
        try {
            const result = await dynamodb.send(new QueryCommand({
                TableName: PRESCRIPTIONS_TABLE,
                IndexName: 'PatientIdIndex',
                KeyConditionExpression: "patientId = :pid",
                ExpressionAttributeValues: { ":pid": patientId }
            }));
            legacyItems = result.Items || [];
        } catch (e) {
            console.warn("GSI PatientIdIndex missing, falling back to Scan.");
            const scan = await dynamodb.send(new ScanCommand({
                TableName: PRESCRIPTIONS_TABLE,
                FilterExpression: "patientId = :pid",
                ExpressionAttributeValues: { ":pid": patientId }
            }));
            legacyItems = scan.Items || [];
        }
        
        const filteredLegacy = legacyItems.filter(p => !p.tenant_id || p.tenant_id === tenantId || userRole === 'SuperAdmin');

        // 2. Completed visits containing medications or diagnosis
        const visitResult = await dynamodb.send(new QueryCommand({
            TableName: VISITS_TABLE,
            IndexName: 'patientId-status-index',
            KeyConditionExpression: "patientId = :pid",
            ExpressionAttributeValues: { ":pid": patientId }
        }));
        
        const visitFiltered = (visitResult.Items || []).filter(v => 
            v.status === 'COMPLETED' && 
            (!v.tenant_id || v.tenant_id === tenantId || userRole === 'SuperAdmin') &&
            ((v.medications && v.medications.length > 0) || (v.diagnosis && v.diagnosis.trim() !== ''))
        ).map(v => ({
            ...v,
            patientName: v.name || v.patientName || 'Unknown Patient',
            gender: v.sex || v.gender || 'N/A',
            prescriptionDate: v.visitDate || v.createdAt
        }));

        const mergedItems = [...filteredLegacy, ...visitFiltered].sort((a, b) => {
            const dateA = new Date(a.prescriptionDate || a.visitDate || a.createdAt).getTime();
            const dateB = new Date(b.prescriptionDate || b.visitDate || b.createdAt).getTime();
            return dateB - dateA;
        });

        return formatSuccessResponse(mergedItems);
    } catch (e) {
        return formatErrorResponse(e.message);
    }
}

async function getAllPrescriptions(requestData) {
    try {
        const { tenantId, userRole } = requestData;

        // 1. Scan Legacy Prescriptions
        let legacyItems = [];
        if (userRole === 'SuperAdmin') {
            const result = await dynamodb.send(new ScanCommand({ TableName: PRESCRIPTIONS_TABLE }));
            legacyItems = result.Items || [];
        } else {
            const result = await dynamodb.send(new ScanCommand({
                TableName: PRESCRIPTIONS_TABLE,
                FilterExpression: "tenant_id = :tid",
                ExpressionAttributeValues: { ":tid": tenantId }
            }));
            legacyItems = result.Items || [];
        }

        // 2. Scan Visits for COMPLETED visits with meds/diagnosis
        let vParams = {
            TableName: VISITS_TABLE,
            FilterExpression: "#status = :c AND (size(medications) > :zero OR attribute_exists(diagnosis))",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: { ":c": "COMPLETED", ":zero": 0 }
        };
        
        if (userRole !== 'SuperAdmin' && tenantId) {
            vParams.FilterExpression += " AND tenant_id = :tid";
            vParams.ExpressionAttributeValues[":tid"] = tenantId;
        }

        const vResult = await dynamodb.send(new ScanCommand(vParams));
        
        // Final sanity filter, just in case Dynamo's size() logic is tricky
        const visitFiltered = (vResult.Items || []).filter(v => 
            (v.medications && v.medications.length > 0) || (v.diagnosis && v.diagnosis.trim() !== '')
        ).map(v => ({
            ...v,
            patientName: v.name || v.patientName || 'Unknown Patient',
            gender: v.sex || v.gender || 'N/A',
            prescriptionDate: v.visitDate || v.createdAt
        }));

        const mergedItems = [...legacyItems, ...visitFiltered].sort((a, b) => {
            const dateA = new Date(a.prescriptionDate || a.visitDate || a.createdAt).getTime();
            const dateB = new Date(b.prescriptionDate || b.visitDate || b.createdAt).getTime();
            return dateB - dateA;
        });

        return formatSuccessResponse(mergedItems);
    } catch (error) {
        console.error("❌ Error running getAllPrescriptions:", error);
        return formatErrorResponse(error.message);
    }
}

/**
 * TASK 6: Onboards a new Clinic and its first Admin Doctor
 * ONLY Accessible by SuperAdmins
 */
async function onboardClinic(requestData) {
    try {
        const { clinicName, adminEmail, adminName, userRole } = requestData;

        // HARD SECURITY GUARD
        if (userRole !== 'SuperAdmin') {
            return formatErrorResponse("Forbidden: Only SuperAdmins can onboard clinics.");
        }
        if (!clinicName || !adminEmail || !USER_POOL_ID) {
            return formatErrorResponse("Missing required fields or USER_POOL_ID environment variable.");
        }

        // 1. Generate new Tenant ID
        const newTenantId = `clinic_${randomUUID()}`;
        console.log(`🏢 Onboarding new clinic: ${clinicName} with ID: ${newTenantId}`);

        // 2. Set Subscription Expiry based on requested validity (Default: 12 months)
        const validityMonths = requestData.validityMonths ? parseInt(requestData.validityMonths, 10) : 12;
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + validityMonths);

        // 3. Save Clinic to DynamoDB (including address, contactNumber, and initial staff counts)
        const { address = '', contactNumber = '' } = requestData;
        await dynamodb.send(new PutCommand({
            TableName: CLINICS_TABLE,
            Item: {
                tenant_id: newTenantId,
                clinic_name: clinicName,
                address: address.trim(),
                contactNumber: contactNumber.trim(),
                subscription_expiry: expiryDate.toISOString(),
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
                // Option B: store staff counters directly on the clinic record
                doctorCount: 1,        // The admin Doctor being created right now
                assistantCount: 0      // No assistants yet
            }
        }));

        // 4. Provision the Doctor in AWS Cognito
        // DesiredDeliveryMediums: ['EMAIL'] sends a welcome email with temp credentials
        const createUserCommand = new AdminCreateUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: adminEmail.trim().toLowerCase(),
            UserAttributes: [
                { Name: 'email', Value: adminEmail.trim().toLowerCase() },
                { Name: 'email_verified', Value: 'true' },
                { Name: 'name', Value: adminName || 'Doctor' },
                { Name: 'custom:role', Value: 'Doctor' },
                { Name: 'custom:tenant_id', Value: newTenantId }
            ],
            DesiredDeliveryMediums: ['EMAIL']
            // MessageAction: 'SUPPRESS' removed — Doctor must receive welcome email with temp password
        });

        const cognitoResponse = await cognitoClient.send(createUserCommand);
        console.log(`✅ Provisioned Doctor account for ${adminEmail}`);
        console.log(`📧 Temporary credentials sent to: ${adminEmail}`);

        // 5. Write Doctor profile to ClinicStaff DynamoDB table
        //    Without this, getClinicStaff returns 0 results even though doctorCount = 1
        await dynamodb.send(new PutCommand({
            TableName: CLINIC_STAFF_TABLE,
            Item: {
                tenant_id: newTenantId,
                email: adminEmail.trim().toLowerCase(),
                username: cognitoResponse.User?.Username || adminEmail.trim().toLowerCase(),
                name: adminName || 'Doctor',
                role: 'Doctor',
                status: 'FORCE_CHANGE_PASSWORD',
                enabled: true,
                createdAt: new Date().toISOString()
            }
        }));
        console.log(`✅ Doctor profile written to ClinicStaff table for ${adminEmail}`);

        return formatSuccessResponse({
            success: true,
            tenant_id: newTenantId,
            doctorUsername: cognitoResponse.User?.Username,
            message: `Clinic '${clinicName}' created. Doctor account provisioned and temporary credentials sent to ${adminEmail}.`
        });
    } catch (error) {
        console.error('❌ Error onboarding clinic:', error);
        return formatErrorResponse(`Failed to onboard clinic: ${error.message}`);
    }
}

// ============================================
// SUPERADMIN: GET ALL CLINICS WITH STATS
// ============================================

/**
 * Counts patients belonging to a specific tenant using the GSI.
 * Uses SELECT COUNT for efficiency (no data fetched, just count).
 */
async function countPatientsByTenant(tenantId) {
    if (!tenantId) return 0;
    try {
        const result = await dynamodb.send(new QueryCommand({
            TableName: PATIENTS_TABLE,
            IndexName: PATIENT_TENANT_INDEX,
            KeyConditionExpression: 'tenant_id = :tid',
            ExpressionAttributeValues: { ':tid': tenantId },
            Select: 'COUNT'
        }));
        return result.Count || 0;
    } catch (e) {
        console.warn(`⚠️ Could not count patients for ${tenantId}: ${e.message}`);
        return 0;
    }
}

/**
 * Returns all clinics from the Clinics table, enriched with live patient count.
 * Staff counts (doctorCount, assistantCount) are stored directly on clinic record (Option B).
 * ONLY accessible by SuperAdmins.
 */
async function getAllClinics(requestData) {
    if (requestData.userRole !== 'SuperAdmin') {
        return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, error: 'Forbidden: SuperAdmin access required.' })
        };
    }

    try {
        console.log('🏢 SuperAdmin: fetching all clinics...');

        const clinicsResult = await dynamodb.send(new ScanCommand({ TableName: CLINICS_TABLE }));
        const clinics = clinicsResult.Items || [];

        console.log(`📋 Found ${clinics.length} clinics. Enriching with patient counts...`);

        // Fetch patient counts concurrently for all clinics
        const enriched = await Promise.all(
            clinics.map(async (clinic) => ({
                ...clinic,
                patientCount: await countPatientsByTenant(clinic.tenant_id)
            }))
        );

        // Sort by createdAt descending (newest first)
        enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        console.log('✅ Clinics enriched successfully.');

        return formatSuccessResponse({
            success: true,
            clinics: enriched,
            count: enriched.length
        });
    } catch (error) {
        console.error('❌ Error fetching all clinics:', error);
        return formatErrorResponse(`Failed to fetch clinics: ${error.message}`);
    }
}

// ============================================
// SUPERADMIN: RESEND DOCTOR INVITE / RESET PASSWORD
// ============================================

/**
 * Resends a Cognito invitation email to a Doctor/Assistant with a fresh temporary password.
 * Workflow:
 *   1. Tries RESEND (user must be in FORCE_CHANGE_PASSWORD state) — sends a new temp password.
 *   2. If the user is already CONFIRMED (already set their password), falls back to
 *      AdminSetUserPassword (Permanent: false) so they can log in again with a known temp password.
 * ONLY accessible by SuperAdmins.
 */
async function resendDoctorInvite(requestData) {
    if (requestData.userRole !== 'SuperAdmin') {
        return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, error: 'Forbidden: SuperAdmin access required.' })
        };
    }

    const { doctorEmail } = requestData;
    if (!doctorEmail || !USER_POOL_ID) {
        return formatErrorResponse('Missing doctorEmail or USER_POOL_ID environment variable.');
    }

    const username = doctorEmail.trim().toLowerCase();
    console.log(`📧 SuperAdmin: resending invite for ${username}`);

    try {
        // Step 1: Try RESEND — only works if user is in FORCE_CHANGE_PASSWORD state
        await cognitoClient.send(new AdminCreateUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: username,
            MessageAction: 'RESEND',
            DesiredDeliveryMediums: ['EMAIL']
        }));

        console.log(`✅ Invite resent to ${username} via RESEND`);
        return formatSuccessResponse({
            success: true,
            message: `A new temporary password has been emailed to ${doctorEmail}. They can log in and will be prompted to set a permanent password.`
        });

    } catch (resendError) {
        // If user is CONFIRMED (already has a permanent password), RESEND fails.
        // Fall back to AdminSetUserPassword to force a new temp password.
        if (resendError.name === 'InvalidParameterException' || resendError.name === 'NotAuthorizedException') {
            console.warn(`⚠️ RESEND not applicable (user may be CONFIRMED). Falling back to AdminSetUserPassword...`);

            try {
                // Generate a predictable but secure temp password: Doctor@<4 random digits>
                const tempPassword = `Doctor@${Math.floor(1000 + Math.random() * 9000)}`;

                await cognitoClient.send(new AdminSetUserPasswordCommand({
                    UserPoolId: USER_POOL_ID,
                    Username: username,
                    Password: tempPassword,
                    Permanent: false  // Forces FORCE_CHANGE_PASSWORD status again
                }));

                console.log(`✅ Temp password reset for ${username}: ${tempPassword}`);
                return formatSuccessResponse({
                    success: true,
                    tempPassword,  // Return to SuperAdmin so they can communicate it
                    message: `Password reset. Share this temporary password with the Doctor: ${tempPassword}. They will be forced to change it on first login.`
                });

            } catch (setError) {
                console.error('❌ AdminSetUserPassword failed:', setError);
                return formatErrorResponse(`Failed to reset password: ${setError.message}`);
            }
        }

        console.error('❌ Error resending invite:', resendError);
        return formatErrorResponse(`Failed to resend invite: ${resendError.message}`);
    }
}

// ============================================
// SUPERADMIN: ADD STAFF (DOCTOR/ASSISTANT) TO EXISTING CLINIC
// ============================================

/**
 * Provisions a new Doctor or Assistant for an already-registered clinic.
 * 1. Validates clinic exists.
 * 2. Creates Cognito user with correct role + tenant_id.
 * 3. Atomically increments doctorCount or assistantCount on the Clinics table.
 * ONLY accessible by SuperAdmins.
 */
async function addStaffToClinic(requestData) {
    if (requestData.userRole !== 'SuperAdmin') {
        return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, error: 'Forbidden: SuperAdmin access required.' })
        };
    }

    const { clinicId, staffEmail, staffName, staffRole } = requestData;

    if (!clinicId || !staffEmail || !staffRole || !USER_POOL_ID) {
        return formatErrorResponse('Missing required fields: clinicId, staffEmail, staffRole, or USER_POOL_ID.');
    }
    if (!['Doctor', 'Assistant'].includes(staffRole)) {
        return formatErrorResponse("Invalid staffRole. Must be 'Doctor' or 'Assistant'.");
    }

    const username = staffEmail.trim().toLowerCase();
    console.log(`➕ Adding ${staffRole} (${username}) to clinic ${clinicId}`);

    // 1. Verify clinic exists
    const clinicResult = await dynamodb.send(new GetCommand({
        TableName: CLINICS_TABLE,
        Key: { tenant_id: clinicId }
    }));
    if (!clinicResult.Item) {
        return formatErrorResponse(`Clinic with ID '${clinicId}' not found.`);
    }
    const clinicName = clinicResult.Item.clinic_name;

    try {
        // 2. Create user in Cognito
        await cognitoClient.send(new AdminCreateUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: username,
            UserAttributes: [
                { Name: 'email', Value: username },
                { Name: 'email_verified', Value: 'true' },
                { Name: 'name', Value: staffName?.trim() || staffRole },
                { Name: 'custom:role', Value: staffRole },
                { Name: 'custom:tenant_id', Value: clinicId }
            ],
            DesiredDeliveryMediums: ['EMAIL']
        }));
        console.log(`✅ Cognito user created for ${username} as ${staffRole}`);

        // 2.5 Also write to ClinicStaff DynamoDB Table
        await dynamodb.send(new PutCommand({
            TableName: CLINIC_STAFF_TABLE,
            Item: {
                tenant_id: clinicId,
                email: username,
                name: staffName?.trim() || staffRole,
                role: staffRole,
                status: 'FORCE_CHANGE_PASSWORD',
                enabled: true,
                createdAt: new Date().toISOString()
            }
        }));
        console.log(`✅ DynamoDB Staff profile created for ${username}`);

        // 3. Increment count — if_not_exists handles legacy clinics (Cl 1 fix)
        const countField = staffRole === 'Doctor' ? 'doctorCount' : 'assistantCount';
        await dynamodb.send(new UpdateCommand({
            TableName: CLINICS_TABLE,
            Key: { tenant_id: clinicId },
            UpdateExpression: `SET ${countField} = if_not_exists(${countField}, :zero) + :inc`,
            ExpressionAttributeValues: { ':zero': 0, ':inc': 1 }
        }));
        console.log(`📊 ${countField} incremented for clinic ${clinicId}`);

        return formatSuccessResponse({
            success: true,
            message: `${staffRole} '${staffName}' added to '${clinicName}'. Invite email sent to ${staffEmail}.`
        });

    } catch (error) {
        if (error.name === 'UsernameExistsException') {
            return formatErrorResponse(`A user with email '${staffEmail}' already exists in Cognito. Use 'Resend Invite' if they need a new password.`);
        }
        console.error('❌ Error adding staff:', error);
        return formatErrorResponse(`Failed to add staff: ${error.message}`);
    }
}

// ============================================
// SUPERADMIN: FIX LEGACY CLINIC COUNTS (ONE-TIME MAINTENANCE)
// ============================================

/**
 * Patches all clinic records that are missing doctorCount or assistantCount.
 * Sets doctorCount = 1 (at least the initial admin doctor) and assistantCount = 0.
 * Safe to run multiple times — only updates records that are missing these fields.
 * ONLY accessible by SuperAdmins.
 */
async function fixClinicCounts(requestData) {
    if (requestData.userRole !== 'SuperAdmin') {
        return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, error: 'Forbidden: SuperAdmin access required.' })
        };
    }

    try {
        const clinicsResult = await dynamodb.send(new ScanCommand({ TableName: CLINICS_TABLE }));
        const clinics = clinicsResult.Items || [];

        const needsFix = clinics.filter(c => c.doctorCount === undefined || c.assistantCount === undefined);
        console.log(`🔧 Found ${needsFix.length} clinics needing count fix.`);

        if (needsFix.length === 0) {
            return formatSuccessResponse({ success: true, message: 'All clinics already have correct count fields. No changes needed.' });
        }

        await Promise.all(needsFix.map(clinic =>
            dynamodb.send(new UpdateCommand({
                TableName: CLINICS_TABLE,
                Key: { tenant_id: clinic.tenant_id },
                // Only set if NOT already present — safe to call multiple times
                UpdateExpression: 'SET doctorCount = if_not_exists(doctorCount, :d), assistantCount = if_not_exists(assistantCount, :a)',
                ExpressionAttributeValues: { ':d': 1, ':a': 0 }
            }))
        ));

        console.log(`✅ Fixed count fields for ${needsFix.length} clinics.`);
        return formatSuccessResponse({
            success: true,
            fixed: needsFix.map(c => c.clinic_name),
            message: `Fixed count fields for ${needsFix.length} clinic(s): ${needsFix.map(c => c.clinic_name).join(', ')}.`
        });
    } catch (error) {
        console.error('❌ fixClinicCounts error:', error);
        return formatErrorResponse(`Fix failed: ${error.message}`);
    }
}

// ============================================
// SUPERADMIN: GET STAFF LIST FOR A CLINIC
// ============================================

/**
 * Returns all Doctors and Assistants registered under a specific clinic (tenant_id).
 * Uses DynamoDB Query for O(1) instantaneous lookup.
 * ONLY accessible by SuperAdmins.
 */
async function getClinicStaff(requestData) {
    if (requestData.userRole !== 'SuperAdmin') {
        return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, error: 'Forbidden: SuperAdmin access required.' })
        };
    }

    const { clinicId } = requestData;
    if (!clinicId) {
        return formatErrorResponse('Missing clinicId.');
    }

    console.log(`🔍 Fetching staff for clinic from DynamoDB: ${clinicId}`);

    try {
        const response = await dynamodb.send(new QueryCommand({
            TableName: CLINIC_STAFF_TABLE,
            KeyConditionExpression: 'tenant_id = :tid',
            ExpressionAttributeValues: {
                ':tid': clinicId
            }
        }));

        let allStaff = response.Items || [];

        // Sort: Doctors first, then Assistants, then alphabetically by name
        allStaff.sort((a, b) => {
            if (a.role !== b.role) return a.role === 'Doctor' ? -1 : 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        console.log(`✅ Found ${allStaff.length} staff members for clinic ${clinicId}`);
        return formatSuccessResponse({ success: true, staff: allStaff });

    } catch (error) {
        console.error('❌ getClinicStaff error:', error);
        return formatErrorResponse(`Failed to fetch staff from DB: ${error.message}`);
    }
}

// ============================================
// SUPERADMIN: SYNC LEGACY STAFF TO DYNAMODB
// ============================================

/**
 * Sweeps the entire Cognito user pool, finds Doctors and Assistants, 
 * and inserts/upserts them into the ClinicStaff DynamoDB table.
 * ONLY accessible by SuperAdmins.
 */
async function syncLegacyStaffToDynamo(requestData) {
    if (requestData.userRole !== 'SuperAdmin') {
        return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, error: 'Forbidden: SuperAdmin access required.' })
        };
    }

    if (!USER_POOL_ID) {
        return formatErrorResponse('Missing USER_POOL_ID environment variable.');
    }

    console.log(`🔄 Syncing legacy staff from Cognito to DynamoDB`);

    try {
        let syncedCount = 0;
        let paginationToken;

        // Paginate through all Cognito users
        do {
            const response = await cognitoClient.send(new ListUsersCommand({
                UserPoolId: USER_POOL_ID,
                Limit: 60,
                ...(paginationToken ? { PaginationToken: paginationToken } : {})
            }));

            const users = response.Users || [];
            for (const user of users) {
                const attrs = {};
                (user.Attributes || []).forEach(a => { attrs[a.Name] = a.Value; });

                const tenantId = attrs['custom:tenant_id'];
                const role = attrs['custom:role'];
                const email = attrs['email'] || user.Username;

                if (!tenantId || !role) continue; // Skip superadmins or malformed

                // Only sync Doctors and Assistants
                if (role === 'Doctor' || role === 'Assistant') {
                    await dynamodb.send(new PutCommand({
                        TableName: CLINIC_STAFF_TABLE,
                        Item: {
                            tenant_id: tenantId,
                            email: email,
                            username: user.Username,
                            name: attrs.name || 'Unknown',
                            role: role,
                            status: user.UserStatus,
                            enabled: user.Enabled,
                            createdAt: user.UserCreateDate ? new Date(user.UserCreateDate).toISOString() : new Date().toISOString()
                        }
                    }));
                    syncedCount++;
                }
            }

            paginationToken = response.PaginationToken;
        } while (paginationToken);

        console.log(`✅ Legacy sync complete. Migrated ${syncedCount} staff profiles.`);
        return formatSuccessResponse({
            success: true,
            message: `Successfully migrated ${syncedCount} staff members from Cognito to DynamoDB.`,
            syncedCount
        });

    } catch (error) {
        console.error('❌ syncLegacyStaffToDynamo error:', error);
        return formatErrorResponse(`Failed to sync legacy staff: ${error.message}`);
    }
}
// ============================================
// SUPERADMIN: RENEW CLINIC SUBSCRIPTION
// ============================================
async function renewClinicSubscription(requestData) {
    if (requestData.userRole !== 'SuperAdmin') {
        return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: false, error: 'Forbidden: SuperAdmin access required.' })
        };
    }

    const { clinicId, validityMonths } = requestData;
    if (!clinicId || !validityMonths) {
        return formatErrorResponse('Missing required fields: clinicId, validityMonths');
    }

    try {
        const clinicResult = await dynamodb.send(new GetCommand({
            TableName: CLINICS_TABLE,
            Key: { tenant_id: clinicId }
        }));

        if (!clinicResult.Item) {
            return formatErrorResponse('Clinic not found.', 404);
        }

        const currentExpiry = new Date(clinicResult.Item.subscription_expiry);

        let newExpiry = new Date();
        // If it's already expired, add from today. If it's not expired yet, add from the current expiry.
        if (currentExpiry > newExpiry) {
            newExpiry = currentExpiry;
        }

        newExpiry.setMonth(newExpiry.getMonth() + parseInt(validityMonths, 10));

        await dynamodb.send(new UpdateCommand({
            TableName: CLINICS_TABLE,
            Key: { tenant_id: clinicId },
            UpdateExpression: 'SET subscription_expiry = :newExpiry, #status = :activeStatus',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
                ':newExpiry': newExpiry.toISOString(),
                ':activeStatus': 'ACTIVE'
            }
        }));

        console.log(`✅ Clinic ${clinicId} subscription renewed. New expiry: ${newExpiry.toISOString()}`);

        return formatSuccessResponse({
            success: true,
            message: `Subscription extended. New expiry: ${newExpiry.toLocaleDateString()}`
        });

    } catch (error) {
        console.error('❌ Error renewing subscription:', error);
        return formatErrorResponse(`Failed to renew subscription: ${error.message}`);
    }
}
