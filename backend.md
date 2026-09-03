
// ===============================================
// โค้ดสำหรับระบบออกเลข V4.1 (เพิ่มระบบแนบไฟล์)
// แก้ไขปัญหา: เปลี่ยนไปใช้การแยกเก็บ "เลขที่" และ "ปีงบ" ออกจากกัน
// เพิ่ม: ระบบอัปโหลดไฟล์แนบไปเก็บใน Google Drive
// ===============================================

// *** SPREADSHEET ID ของคุณ (ใส่ให้แล้ว) ***
const SPREADSHEET_ID = '121bHncuvg9vXmNfFTgxEob2e5Sr_pixHud0Eza9BHMs'; 

const BOOK_SHEET_NAME = 'หนังสือส่ง';
const ORDER_SHEET_NAME = 'คำสั่ง';
const NOTICE_SHEET_NAME = 'ประกาศ';

// เพิ่มคอลัมน์ใหม่: running_number, budget_year, folder_url
const BOOK_HEADERS = ["id", "timestamp", "type", "number", "date", "subject", "to", "responsible", "notes", "running_number", "budget_year", "folder_url"];
const ORDER_HEADERS = ["id", "timestamp", "type", "number", "date", "subject", "responsible", "notes", "running_number", "budget_year", "folder_url"];
const NOTICE_HEADERS = ["id", "timestamp", "type", "number", "date", "subject", "responsible", "notes", "running_number", "budget_year", "folder_url"];

// ชื่อ Root Folder ใน Google Drive สำหรับเก็บไฟล์แนบ
const DRIVE_ROOT_FOLDER_NAME = 'เอกสารราชการ - ระบบออกเลข';



function doGet(e) {
  return ContentService.createTextOutput("Backend V4.1 (File Attachments) is running. Use POST requests for data operations.");
}

function doPost(e) {
  // VERSION LOGGING to confirm deployment
  Logger.log("EXECUTING BACKEND V4.1 - File Attachments");

  if (!e || !e.postData || !e.postData.contents) {
    return createJsonResponse({ 
      error: 'Invalid request. This function must be triggered by a POST request.' 
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
    
    // ACTION สำหรับอัปโหลดไฟล์แนบ
    if (action === 'uploadAttachments') {
      const { documentId, docType, docNumber, files } = payload;
      if (!documentId || !docType || !files || !Array.isArray(files)) {
        throw new Error("Invalid post data for uploadAttachments. Missing documentId, docType, or files.");
      }
      const result = uploadAttachments_(documentId, docType, docNumber, files);
      return createJsonResponse(result);
    }

    // ACTION พิเศษสำหรับ Migrating ข้อมูลเก่า (เรียกครั้งเดียวพอ)
    if (action === 'migrateData') {
       const result = migrateDataToV3_();
       return createJsonResponse(result);
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
  let spreadsheet;
  if (SPREADSHEET_ID) {
      try {
          spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      } catch(e) {
          spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      }
  } else {
      spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!spreadsheet) throw new Error("Could not find any spreadsheet.");

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
  } else {
    // Check if we need to add new columns to existing sheet
    const finalCol = sheet.getLastColumn();
    const headersInRange = sheet.getRange(1, 1, 1, finalCol).getValues()[0];
    if (headersInRange.indexOf('running_number') === -1) {
       sheet.getRange(1, finalCol + 1).setValue('running_number');
       sheet.getRange(1, finalCol + 2).setValue('budget_year');
    }
    // เพิ่มคอลัมน์ folder_url ถ้ายังไม่มี
    const updatedFinalCol = sheet.getLastColumn();
    const updatedHeaders = sheet.getRange(1, 1, 1, updatedFinalCol).getValues()[0];
    if (updatedHeaders.indexOf('folder_url') === -1) {
       sheet.getRange(1, updatedFinalCol + 1).setValue('folder_url');
    }
  }
  return sheet;
}

function parseSheetData_(sheet) {
    const range = sheet.getDataRange();
    const values = range.getValues();
    const displayValues = range.getDisplayValues(); 
    
    if (values.length <= 1) return [];

    const headers = values.shift();
    displayValues.shift(); 

    const headerMap = headers.reduce((map, header, i) => ({ ...map, [header]: i }), {});

    const documents = [];
    values.forEach((row, index) => {
        try {
            if (row.every(cell => cell === "")) return;
            
            const doc = {};
            // Basic fields
            headers.forEach((header, colIndex) => { 
                const val = row[colIndex];
                const displayVal = displayValues[index][colIndex];
                
                if ((header === 'date' || header === 'timestamp')) {
                    const dateVal = new Date(val);
                    doc[header] = isNaN(dateVal.getTime()) ? null : dateVal;
                } else if (header === 'number') {
                     doc[header] = displayVal ? String(displayVal).trim() : null;
                } else {
                    doc[header] = (val === null || val === undefined) ? null : String(val);
                }
            });

            // V3 LOGIC: 
            // If running_number and budget_year exist, use them to reconstruct 'number' for display guarantees
            // But fallback to existing 'number' if they are missing (for old data before migration)
            if (doc['running_number'] && doc['budget_year']) {
               // Reconstruct number string based on type
               // Note: We don't change the 'number' field here to avoid confusion on frontend, 
               // but we could use this to validation.
            }

            documents.push(doc);
        } catch (e) {}
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
            Logger.log("Error loading " + type + ": " + e.message);
        }
    });
    
    return allDocuments.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

function getBuddhistYear(date) {
    return date.getFullYear() + 543;
}

function generateNextNumberV3_(docType, docDate, allDocuments) {
    const yearBuddhist = getBuddhistYear(docDate);
    
    // Filter docs of the same type and year
    const relevantDocs = allDocuments.filter(doc => {
        if (doc.type !== docType) return false;
        
        let docYear = 0;
        // Try to get year from new column first
        if (doc.budget_year) {
            docYear = parseInt(doc.budget_year, 10);
        } else if (doc.date) {
             // Fallback for old data: use date year (adjust for academic/fiscal year if needed)
             // For simplicity, using calendar year + 543 here matching generateDocumentNumber_ logic
             docYear = getBuddhistYear(doc.date);
        }
        
        // Logic specific to type
        if (docType === 'หนังสือส่ง') {
             // Books reset every calendar year usually? Or Fiscal? Assuming Calendar based on previous code
             return doc.date.getFullYear() === docDate.getFullYear();
        } else {
             return docYear === yearBuddhist;
        }
    });

    // Find Max Running Number
    let maxNum = 0;
    relevantDocs.forEach(doc => {
        if (doc.running_number) {
            const num = parseInt(doc.running_number, 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
        } else if (doc.number) {
            // Fallback: Parse from string for old data
            try {
                let match;
                if (docType === 'หนังสือส่ง') match = doc.number.match(/\/(\d+)$/); // xxx/NUM
                else if (docType === 'คำสั่ง') match = doc.number.match(/^(\d+)/); // NUM/YEAR
                else if (docType === 'ประกาศ') match = doc.number.match(/(\d+)\/\d{4}$/); // NUM/YEAR

                if (match && match[1]) {
                     const parsed = parseInt(match[1], 10);
                     if (parsed > maxNum) maxNum = parsed;
                }
            } catch(e) {}
        }
    });

    return maxNum + 1;
}


function addDocument_(docType, formData) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000); 

    try {
        const allDocuments = getDocuments_(); 
        
        const docDate = new Date(formData.date);
        if (isNaN(docDate.getTime())) throw new Error("Invalid date provided.");
        
        const yearBuddhist = getBuddhistYear(docDate);
        const nextRunningNum = generateNextNumberV3_(docType, docDate, allDocuments);
        
        // Construct the display number string
        let newDocNumberString = "";
        switch (docType) {
            case 'หนังสือส่ง':
                newDocNumberString = `ศธ 04115.0316/${nextRunningNum}`;
                break;
            case 'คำสั่ง':
                newDocNumberString = `${nextRunningNum}/${yearBuddhist}`;
                break;
            case 'ประกาศ':
                newDocNumberString = `ประกาศโรงเรียนบ้านหนองแห้ง เรื่อง ${nextRunningNum}/${yearBuddhist}`;
                break;
            default:
                newDocNumberString = `${nextRunningNum}/${yearBuddhist}`;
        }

        const newDocument = {
            id: Utilities.getUuid(),
            timestamp: new Date(),
            type: docType,
            number: newDocNumberString,
            date: docDate,
            subject: formData.subject || '',
            to: (docType === 'หนังสือส่ง' ? formData.to : null), 
            responsible: formData.responsible || '',
            notes: formData.notes || '',
            running_number: nextRunningNum, // NEW FIELD
            budget_year: yearBuddhist      // NEW FIELD
        };

        const sheet = getSheetByType_(docType);
        
        // Dynamic Header Mapping
        const lastCol = sheet.getLastColumn();
        const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        
        const newRow = headers.map(header => {
             if (header === 'timestamp' || header === 'date') return newDocument[header];
             if (header === 'number') return "'" + newDocument[header]; // Maintain ' prefix for safety
             return newDocument[header] || '';
        });

        sheet.appendRow(newRow);
        
        return newDocument;
    } finally {
        lock.releaseLock();
    }
}

// ==============================================
// ฟังก์ชันสำหรับอัปโหลดไฟล์แนบไปเก็บใน Google Drive
// ==============================================

function getOrCreateFolder_(parent, folderName) {
  var folders = parent.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parent.createFolder(folderName);
}

function uploadAttachments_(documentId, docType, docNumber, files) {
  var lock = LockService.getScriptLock();
  lock.waitLock(60000); // ให้เวลามากขึ้นสำหรับอัปโหลดไฟล์

  try {
    // 1. หา/สร้าง Root Folder
    var rootFolder = getOrCreateFolder_(DriveApp.getRootFolder(), DRIVE_ROOT_FOLDER_NAME);
    
    // 2. หา/สร้าง Sub-folder ตามประเภทเอกสาร
    var typeFolder = getOrCreateFolder_(rootFolder, docType);
    
    // 3. สร้าง Sub-folder ตามเลขที่เอกสาร
    // ทำความสะอาดชื่อ folder (แทนที่ / ด้วย _)
    var safeFolderName = docNumber ? String(docNumber).replace(/\//g, '_') : documentId;
    var docFolder = getOrCreateFolder_(typeFolder, safeFolderName);
    
    // 4. วนลูปสร้างไฟล์ใน Google Drive
    var uploadedFiles = [];
    files.forEach(function(file) {
      try {
        var blob = Utilities.newBlob(
          Utilities.base64Decode(file.base64),
          file.mimeType,
          file.name
        );
        var driveFile = docFolder.createFile(blob);
        
        // Set sharing: Anyone with the link can view
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        uploadedFiles.push({
          name: driveFile.getName(),
          url: driveFile.getUrl(),
          id: driveFile.getId()
        });
      } catch(fileErr) {
        Logger.log('Error uploading file ' + file.name + ': ' + fileErr.message);
      }
    });
    
    // 5. Set folder sharing too
    docFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var folderUrl = docFolder.getUrl();
    
    // 6. อัปเดตคอลัมน์ folder_url ใน Sheet ที่ตรงกับ documentId
    updateFolderUrl_(documentId, docType, folderUrl);
    
    return {
      folderUrl: folderUrl,
      uploadedFiles: uploadedFiles,
      count: uploadedFiles.length
    };
  } finally {
    lock.releaseLock();
  }
}

function updateFolderUrl_(documentId, docType, folderUrl) {
  var sheet = getSheetByType_(docType);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idIdx = headers.indexOf('id');
  var folderUrlIdx = headers.indexOf('folder_url');
  
  if (idIdx === -1 || folderUrlIdx === -1) {
    Logger.log('Cannot find id or folder_url column');
    return;
  }
  
  // อ่านคอลัมน์ id ทั้งหมดเพื่อหาแถวที่ตรง
  var idValues = sheet.getRange(2, idIdx + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]) === String(documentId)) {
      sheet.getRange(i + 2, folderUrlIdx + 1).setValue(folderUrl);
      return;
    }
  }
  Logger.log('Document ID not found in sheet: ' + documentId);
}

// ==============================================
// ฟังก์ชันสำหรับ "อพยพ" ข้อมูลเก่า (Migrate)
// ให้รันฟังก์ชันนี้ 1 ครั้ง เพื่อเติมเลข running_number ให้ข้อมูลเก่า
// ==============================================
function migrateDataToV3_() {
    const docTypes = ['หนังสือส่ง', 'คำสั่ง', 'ประกาศ'];
    const log = [];

    docTypes.forEach(type => {
        try {
            const sheet = getSheetByType_(type);
            const lastRow = sheet.getLastRow();
            if (lastRow <= 1) return;

            const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
            const numIdx = headers.indexOf('number');
            const dateIdx = headers.indexOf('date');
            const runNumIdx = headers.indexOf('running_number');
            const yearIdx = headers.indexOf('budget_year');

            if (runNumIdx === -1 || yearIdx === -1) {
                log.push(`Skipping ${type}: Columns missing (Run again?)`);
                return;
            }

            const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
            const values = dataRange.getDisplayValues(); // Use Display Values to parse number string safely
            const dateValues = sheet.getRange(2, dateIdx + 1, lastRow - 1, 1).getValues(); // Get real dates

            const updates = values.map((row, i) => {
                const docNumStr = String(row[numIdx]);
                const docDate = new Date(dateValues[i][0]);
                
                let runNum = row[runNumIdx];
                let year = row[yearIdx];

                // Only fill if empty
                if (!runNum || !year) {
                    try {
                        let match;
                        if (type === 'หนังสือส่ง') match = docNumStr.match(/\/(\d+)$/);
                        else if (type === 'คำสั่ง') match = docNumStr.match(/^(\d+)/);
                        else if (type === 'ประกาศ') match = docNumStr.match(/(\d+)\/\d{4}$/);

                        if (match && match[1]) {
                             runNum = parseInt(match[1], 10);
                        }
                        
                        if (docDate && !isNaN(docDate.getTime())) {
                            year = getBuddhistYear(docDate);
                        }
                    } catch(e) {}
                }
                return { runNum, year };
            });

            // Bulk update
            // Note: This is simplified. Ideally we write column by column.
            updates.forEach((u, i) => {
                 if (u.runNum) sheet.getRange(i + 2, runNumIdx + 1).setValue(u.runNum);
                 if (u.year) sheet.getRange(i + 2, yearIdx + 1).setValue(u.year);
            });
            
            log.push(`Migrated ${type}: ${updates.length} rows.`);

        } catch(e) {
            log.push(`Error ${type}: ${e.message}`);
        }
    });

    return { status: 'Success', log: log };
}
