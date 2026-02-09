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
        }));
    } catch (error) {
        console.error("Failed to fetch documents:", error);
        alert(`ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้: ${error.message}`);
        return [];
    }
}
