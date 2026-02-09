---
สำคัญมาก: โค้ดนี้สำหรับ Google Apps Script เท่านั้น
- ก่อน Deploy โค้ดใหม่นี้ กรุณาลบชีทเก่าที่ชื่อ "documents" ทิ้งก่อน
- ห้ามกดปุ่ม "Run" หรือ "Debug" ในหน้าแก้ไขโค้ดเด็ดขาด เพราะจะทำให้เกิด Error
- การทดสอบต้องทำผ่านการใช้งานบนเว็บแอปพลิเคชันเท่านั้น
- ทุกครั้งที่แก้ไขโค้ด จะต้อง Deploy ใหม่ (New Deployment) เสมอ
---

const BOOK_SHEET_NAME = 'หนังสือส่ง';
const ORDER_SHEET_NAME = 'คำสั่ง';
const NOTICE_SHEET_NAME = 'ประกาศ';

const BOOK_HEADERS = ["id", "timestamp", "type", "number", "date", "subject", "to", "responsible", "notes"];
const ORDER_HEADERS = ["id", "timestamp", "type", "number", "date", "subject", "responsible", "notes"];
const NOTICE_HEADERS = ["id", "timestamp", "type", "number", "date", "subject", "responsible", "notes"];


function doGet(e) {
  return ContentService.createTextOutput("Backend is running. Use POST requests for data operations.");
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    Logger.log('doPost was called without postData. This usually happens when "Run" is pressed in the editor.');
    return createJsonResponse({ 
      error: 'Invalid request. This function must be triggered by a POST request from the web app, not by pressing "Run" in the editor.' 
    });
  }

  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === 'getDocuments') {
      const documents = getDocuments_();
      return createJsonResponse(documents);
    } 
    
    if (action === 'addDocument') {
      const { docType, formData } = payload;
      if (!docType || !formData) {
        throw new Error("Invalid post data for addDocument. Missing docType or formData.");
      }
      const newDocument = addDocument_(docType, formData);
      return createJsonResponse(newDocument);
    }

    return createJsonResponse({ error: 'Invalid action specified: ' + action });

  } catch (error) {
    Logger.log('Error in doPost: ' + error.stack);
    return createJsonResponse({ error: 'Error in doPost: ' + error.message });
  }
}

function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetByType_(docType) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheetName;
  let headers;

  switch (docType) {
    case 'หนังสือส่ง':
      sheetName = BOOK_SHEET_NAME;
      headers = BOOK_HEADERS;
      break;
    case 'คำสั่ง':
      sheetName = ORDER_SHEET_NAME;
      headers = ORDER_HEADERS;
      break;
    case 'ประกาศ':
      sheetName = NOTICE_SHEET_NAME;
      headers = NOTICE_HEADERS;
      break;
    default:
      throw new Error("Unknown document type: " + docType);
  }

  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    sheet.appendRow(headers);
    SpreadsheetApp.flush();
  }
  return sheet;
}

function parseSheetData_(sheet) {
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const headers = data.shift();
    const headerMap = headers.reduce((map, header, i) => ({ ...map, [header]: i }), {});

    const documents = [];
    data.forEach((row, index) => {
        try {
            if (row.every(cell => cell === "")) return;
            if (!row[headerMap['id']] || !row[headerMap['timestamp']]) {
                throw new Error("Missing ID or timestamp.");
            }
            
            const doc = {};
            headers.forEach(header => {
                const value = row[headerMap[header]];
                if ((header === 'date' || header === 'timestamp')) {
                    const dateVal = new Date(value);
                    if (isNaN(dateVal.getTime())) {
                         // Fallback: try to see if it's a string date
                         doc[header] = null; 
                    } else {
                         doc[header] = dateVal;
                    }
                } else {
                    // Force String conversion for number/subject to handle auto-converted types safely
                    doc[header] = (value === null || value === undefined) ? null : String(value);
                }
            });
            documents.push(doc);

        } catch (e) {
            Logger.log(`Skipping problematic row ${index + 2} in sheet "${sheet.getName()}": ${e.message}.`);
        }
    });
    return documents;
}


function addDocument_(docType, formData) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000); 

    try {
        const allDocuments = getDocuments_(); 
        
        const docDate = new Date(formData.date);
        if (isNaN(docDate.getTime())) throw new Error("Invalid date provided in form data.");
        
        const newDocNumber = generateDocumentNumber_(docType, docDate, allDocuments);

        const newDocument = {
            id: Utilities.getUuid(),
            timestamp: new Date(),
            type: docType,
            number: newDocNumber,
            date: docDate,
            subject: formData.subject || '',
            to: (docType === 'หนังสือส่ง' ? formData.to : null), 
            responsible: formData.responsible || '',
            notes: formData.notes || '',
        };

        const sheet = getSheetByType_(docType);
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        
        // Prepare row data
        const newRow = headers.map(header => {
             if (header === 'timestamp' || header === 'date') {
                 return newDocument[header];
             }
             return newDocument[header] || '';
        });

        // Append the row
        sheet.appendRow(newRow);

        // FORCE FORMATTING: Ensure the 'number' cell is strictly Plain Text
        const lastRow = sheet.getLastRow();
        const numberColIndex = headers.indexOf('number') + 1;
        if (numberColIndex > 0) {
            const numberCell = sheet.getRange(lastRow, numberColIndex);
            numberCell.setNumberFormat("@"); // Set directly to Plain Text
            numberCell.setValue(newDocument.number); // Write value again to strip any auto-formatting
        }
        
        return newDocument;
    } finally {
        lock.releaseLock();
    }
}

