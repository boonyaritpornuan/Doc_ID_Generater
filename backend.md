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
                    if (isNaN(dateVal.getTime())) throw new Error(`Invalid date format for header '${header}'.`);
                    doc[header] = dateVal;
                } else {
                    doc[header] = value || null; // Return null for empty cells
                }
            });
            documents.push(doc);

        } catch (e) {
            Logger.log(`Skipping problematic row ${index + 2} in sheet "${sheet.getName()}": ${e.message}. Row data: [${row.join(', ')}]`);
        }
    });
    return documents;
}


function getDocuments_() {
    const docTypes = ['หนังสือส่ง', 'คำสั่ง', 'ประกาศ'];
    let allDocuments = [];

    docTypes.forEach(type => {
        try {
            const sheet = getSheetByType_(type);
            const docsFromSheet = parseSheetData_(sheet);
            allDocuments = allDocuments.concat(docsFromSheet);
        } catch (e) {
            Logger.log("Could not get or parse documents for type: " + type + ". Error: " + e.message);
        }
    });
    
    return allDocuments.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}


function generateDocumentNumber_(docType, docDate, allDocuments) {
    const yearBuddhist = docDate.getFullYear() + 543;
    let lastDocNumber = 0;

    const relevantDocs = allDocuments.filter(doc => {
        try {
            if (!doc || doc.type !== docType || !(doc.date instanceof Date) || isNaN(doc.date.getTime())) return false;
            
            if (docType === 'หนังสือส่ง') {
                return doc.date.getFullYear() === docDate.getFullYear();
            } else {
                if (!doc.number) return false;
                const match = doc.number.match(/\/(\d{4})$/);
                const docYear = match ? parseInt(match[1], 10) : 0;
                return docYear === yearBuddhist;
            }
        } catch(e) {
            return false;
        }
    });

    if (relevantDocs.length > 0) {
        const numbers = relevantDocs.map(doc => {
            if (!doc.number) return 0;
            let numPart = 0;
            try {
                let match;
                if (docType === 'หนังสือส่ง') {
                    match = doc.number.match(/\/(\d+)$/);
                } else if (docType === 'คำสั่ง') {
                    match = doc.number.match(/^(\d+)/);
                } else if (docType === 'ประกาศ') {
                    match = doc.number.match(/(\d+)\/\d{4}$/);
                }
                
                if (match && match[1]) {
                    numPart = parseInt(match[1], 10);
                }
            } catch (e) {}
            return isNaN(numPart) ? 0 : numPart;
        });
        lastDocNumber = Math.max(0, ...numbers);
    }

    const newNumber = lastDocNumber + 1;

    switch (docType) {
        case 'หนังสือส่ง':
            return `ศธ 04115.0316/${newNumber}`;
        case 'คำสั่ง':
            return `${newNumber}/${yearBuddhist}`;
        case 'ประกาศ':
            return `ประกาศโรงเรียนบ้านหนองแห้ง เรื่อง ${newNumber}/${yearBuddhist}`;
        default:
            return `${docType}-${newNumber}/${yearBuddhist}`;
    }
}


function addDocument_(docType, formData) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000); 

    try {
        const allDocuments = getDocuments_(); // Fetch all docs for consistent numbering
        
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
            to: (docType === 'หนังสือส่ง' ? formData.to : null), // Set to null if not applicable
            responsible: formData.responsible || '',
            notes: formData.notes || '',
        };

        const sheet = getSheetByType_(docType);
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const newRow = headers.map(header => {
            if (header === 'number' && newDocument[header]) {
                return "'" + newDocument[header];
            }
            return newDocument[header] || '';
        });

        sheet.appendRow(newRow);
        
        return newDocument;
    } finally {
        lock.releaseLock();
    }
}
