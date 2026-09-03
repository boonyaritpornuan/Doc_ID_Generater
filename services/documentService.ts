// ===================================================================================
//  สำคัญมาก: แก้ไข URL นี้เป็น Web App URL ที่ได้จากการ Deploy ใหม่บน Google Apps Script
// ===================================================================================
// Fix: Explicitly typing SCRIPT_URL as `string` to prevent a TypeScript error.
// The error occurs on line 23 because comparing a constant string literal to another string literal
// is flagged as an impossible condition, as the value is known at compile time.
const SCRIPT_URL: string = 'https://script.google.com/macros/s/AKfycbyUR6OVdPY_fYbJPJP6qLZnqRNAI1BCz1SQjT18awBM8sujf9LzPdS2mW246yKh9Q/exec';
// ===================================================================================


import { DocumentType, Document, FormData } from '../types';

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Network response was not ok: ${errorText}`);
    }
    const data = await response.json();
    if (data.error) {
        throw new Error(`Backend error: ${data.error}`);
    }
    return data;
}

const checkScriptUrl = () => {
    if (!SCRIPT_URL || SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
        alert("กรุณาตั้งค่า SCRIPT_URL ในไฟล์ services/documentService.ts ก่อนใช้งาน");
        throw new Error("SCRIPT_URL is not configured.");
    }
};

export const addDocument = async (docType: DocumentType, formData: FormData): Promise<Document> => {
    checkScriptUrl();
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // Use text/plain for Apps Script POST
            },
            body: JSON.stringify({ action: 'addDocument', docType, formData }),
        });
        const newDocument = await handleResponse(response);
        // Convert date strings from JSON back into Date objects for consistency
        return {
            ...newDocument,
            date: new Date(newDocument.date),
            timestamp: new Date(newDocument.timestamp),
        };
    } catch (error) {
        console.error("Failed to add document:", error);
        alert(`เกิดข้อผิดพลาดในการบันทึก: ${error.message}`);
        throw error;
    }
};

export const getDocuments = async (): Promise<Document[]> => {
    checkScriptUrl();
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({ action: 'getDocuments' }),
        });
        const data = await handleResponse(response);
        // Convert date strings from JSON back into Date objects
        return data.map((doc: any) => ({
            ...doc,
            date: new Date(doc.date),
            timestamp: new Date(doc.timestamp),
            folderUrl: doc.folder_url || null,
        }));
    } catch (error) {
        console.error("Failed to fetch documents:", error);
        alert(`ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้: ${error.message}`);
        return [];
    }
}

// === File Attachment ===

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Strip the data URL prefix (e.g. "data:application/pdf;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export interface AttachmentPayload {
    name: string;
    mimeType: string;
    base64: string;
}

export const uploadAttachments = async (
    documentId: string,
    docType: string,
    docNumber: string,
    files: File[]
): Promise<{ folderUrl: string }> => {
    checkScriptUrl();
    try {
        const attachments: AttachmentPayload[] = await Promise.all(
            files.map(async (file) => ({
                name: file.name,
                mimeType: file.type || 'application/octet-stream',
                base64: await fileToBase64(file),
            }))
        );

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'uploadAttachments',
                documentId,
                docType,
                docNumber,
                files: attachments,
            }),
        });

        return await handleResponse(response);
    } catch (error) {
        console.error("Failed to upload attachments:", error);
        alert(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${error.message}`);
        throw error;
    }
};