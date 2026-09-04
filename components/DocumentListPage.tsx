import React, { useState, useMemo, useEffect } from 'react';
import { Document, DocumentType } from '../types';
import { UploadAttachmentModal } from './UploadAttachmentModal';

interface DocumentListPageProps {
    documents: Document[];
    onGoHome: () => void;
    isLoading: boolean; // Add isLoading prop
    onDocumentUpdated?: (updatedDoc: Document) => void;
}

const DocumentListPage: React.FC<DocumentListPageProps> = ({ 
    documents, 
    onGoHome, 
    isLoading,
    onDocumentUpdated 
}) => {
    const [selectedType, setSelectedType] = useState<DocumentType>(DocumentType.Book);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [uploadModalDoc, setUploadModalDoc] = useState<Document | null>(null);
    const [localDocuments, setLocalDocuments] = useState<Document[]>(documents);

    useEffect(() => {
        setLocalDocuments(documents);
    }, [documents]);

    const handleUploadSuccess = (updatedDoc: Document) => {
        setLocalDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
        onDocumentUpdated?.(updatedDoc);
        setUploadModalDoc(updatedDoc);
    };


    const formatDate = (date: any) => {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        return new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'Asia/Bangkok'
        }).format(d);
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
    };

    // แยกแปลงวันที่ YYYY-MM-DD ให้เป็น Date ตามเวลาท้องถิ่น ป้องกันปัญหา Timezone Offset
    const parseBoundaryDate = (dateStr: string, isEndOfDay: boolean): Date | null => {
        if (!dateStr) return null;
        const parts = dateStr.split('-');
        if (parts.length !== 3) return null;
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
        return isEndOfDay
            ? new Date(year, month, day, 23, 59, 59, 999)
            : new Date(year, month, day, 0, 0, 0, 0);
    };

    const filteredDocuments = useMemo(() => {
        const startFilterDate = parseBoundaryDate(startDate, false);
        const endFilterDate = parseBoundaryDate(endDate, true);
        const lowerSearchTerm = searchTerm.trim().toLowerCase();

        return localDocuments
            .filter(doc => {
                // 1. ตรวจสอบประเภทเอกสารให้ตรงกับที่เลือก
                if (!doc.type || doc.type.trim() !== selectedType) {
                    return false;
                }

                // 2. ตรวจสอบวันที่ (ถ้ามีการระบุตัวกรองวันที่)
                if (startFilterDate || endFilterDate) {
                    if (!doc.date) return false;
                    const docDate = new Date(doc.date);
                    const docTime = docDate.getTime();
                    // หากเป็น Invalid Date ให้ตัดออกทันที ป้องกันข้อมูลไม่มีวันที่หลุดเข้ามา
                    if (isNaN(docTime)) return false;

                    if (startFilterDate && docTime < startFilterDate.getTime()) {
                        return false;
                    }
                    if (endFilterDate && docTime > endFilterDate.getTime()) {
                        return false;
                    }
                }

                // 3. ตรวจสอบคำค้นหา (ค้นหาทั้ง เลขที่, เรื่อง, ผู้รับผิดชอบ, ถึง, หมายเหตุ, เวียน)
                if (lowerSearchTerm) {
                    const matchNumber = doc.number && String(doc.number).toLowerCase().includes(lowerSearchTerm);
                    const matchSubject = doc.subject && String(doc.subject).toLowerCase().includes(lowerSearchTerm);
                    const matchResponsible = doc.responsible && String(doc.responsible).toLowerCase().includes(lowerSearchTerm);
                    const matchTo = doc.to && String(doc.to).toLowerCase().includes(lowerSearchTerm);
                    const matchNotes = doc.notes && String(doc.notes).toLowerCase().includes(lowerSearchTerm);
                    const matchCirculate = doc.circulate && String(doc.circulate).toLowerCase().includes(lowerSearchTerm);

                    if (!matchNumber && !matchSubject && !matchResponsible && !matchTo && !matchNotes && !matchCirculate) {
                        return false;
                    }
                }

                return true;
            })
            .sort((a, b) => {
                // เรียงลำดับ timestamp จากใหม่ไปเก่า (ป้องกัน NaN)
                const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                const validTimeA = isNaN(timeA) ? 0 : timeA;
                const validTimeB = isNaN(timeB) ? 0 : timeB;

                if (validTimeB !== validTimeA) {
                    return validTimeB - validTimeA;
                }

                // ถ้า timestamp เท่ากัน ให้ดูที่ date
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                const validDateA = isNaN(dateA) ? 0 : dateA;
                const validDateB = isNaN(dateB) ? 0 : dateB;

                if (validDateB !== validDateA) {
                    return validDateB - validDateA;
                }

                // ถ้ายังเท่ากันอีก ให้เรียงตามเลขเอกสาร/ลำดับจากมากไปน้อย
                const numA = parseInt(String(a.number || '').replace(/\D/g, ''), 10) || 0;
                const numB = parseInt(String(b.number || '').replace(/\D/g, ''), 10) || 0;
                return numB - numA;
            });
    }, [localDocuments, selectedType, searchTerm, startDate, endDate]);

    const hasFilters = Boolean(searchTerm.trim() || startDate || endDate);
    const colSpan = selectedType === DocumentType.Book ? 7 : (selectedType === DocumentType.Notice ? 5 : 6);

    return (
        <div className="animate-fade-in w-full">
            <h2 className="text-3xl font-bold text-center text-gray-700 mb-8">รายการเอกสารทั้งหมด</h2>

            <div className="mb-6 flex justify-center space-x-2 p-1 bg-gray-200 rounded-lg">
                {(Object.values(DocumentType) as DocumentType[]).map((type) => (
                    <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`w-full px-4 py-2 text-base font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                            selectedType === type
                                ? 'bg-blue-600 text-white shadow'
                                : 'bg-transparent text-gray-600 hover:bg-white/60'
                        }`}
                        aria-pressed={selectedType === type}
                    >
                        {type}
                    </button>
                ))}
            </div>

            <div className="mb-4">
                <input
                    type="text"
                    placeholder="ค้นหาตามเลขที่, เรื่อง, หรือผู้รับผิดชอบ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 bg-white text-gray-800 text-lg border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    aria-label="Search documents"
                />
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">จากวันที่</label>
                    <input
                        type="date"
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-3 bg-white text-gray-800 text-lg border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        style={{ colorScheme: 'light' }}
                    />
                </div>
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">ถึงวันที่</label>
                    <input
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-3 bg-white text-gray-800 text-lg border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                         style={{ colorScheme: 'light' }}
                    />
                </div>
            </div>

            {hasFilters && (
                <div className="mb-6 flex justify-between items-center bg-blue-50 px-4 py-2.5 rounded-lg border border-blue-100">
                    <span className="text-sm text-blue-800">
                        พบเอกสารที่ตรงเงื่อนไข <strong>{filteredDocuments.length}</strong> รายการ
                    </span>
                    <button
                        onClick={handleClearFilters}
                        className="text-sm text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 transition-colors hover:underline"
                    >
                        ✕ ล้างตัวกรองทั้งหมด
                    </button>
                </div>
            )}

            <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="w-full min-w-max text-left table-auto">
                    <thead className="border-b bg-gray-50">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600">ประเภท</th>
                            {selectedType === DocumentType.Book && <th className="p-4 font-semibold text-gray-600">เวียน</th>}
                            {selectedType !== DocumentType.Notice && <th className="p-4 font-semibold text-gray-600">เลขที่</th>}
                            <th className="p-4 font-semibold text-gray-600">ลงวันที่</th>
                            <th className="p-4 font-semibold text-gray-600">เรื่อง</th>
                            <th className="p-4 font-semibold text-gray-600">ผู้รับผิดชอบ</th>
                            <th className="p-4 font-semibold text-gray-600">ไฟล์แนบ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                             <tr>
                                <td colSpan={colSpan} className="text-center py-10 px-4">
                                    <p className="text-xl text-gray-500 animate-pulse">กำลังโหลดข้อมูล...</p>
                                </td>
                            </tr>
                        ) : filteredDocuments.length > 0 ? (
                            filteredDocuments.map((doc, index) => (
                                <tr key={`${doc.id || 'doc'}-${index}`} className={`border-b ${index % 2 === 0 ? '' : 'bg-blue-50/20'} hover:bg-blue-100/50 transition-colors`}>
                                    <td className="p-4 text-gray-800">{doc.type}</td>
                                    {selectedType === DocumentType.Book && <td className="p-4 text-gray-900 font-medium text-center">{doc.circulate}</td>}
                                    {selectedType !== DocumentType.Notice && <td className="p-4 text-gray-900 font-medium">{doc.number}</td>}
                                    <td className="p-4 text-gray-700 whitespace-nowrap">{formatDate(doc.date)}</td>
                                    <td className="p-4 text-gray-800">{doc.subject}</td>
                                    <td className="p-4 text-gray-700">{doc.responsible}</td>
                                    <td className="p-4">
                                        {doc.folderUrl ? (
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={doc.folderUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                                >
                                                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                                    </svg>
                                                    ดูไฟล์
                                                </a>
                                                <button
                                                    onClick={() => setUploadModalDoc(doc)}
                                                    title="แนบไฟล์เพิ่มเติมไปยัง Google Drive"
                                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                                                >
                                                    + เพิ่ม
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setUploadModalDoc(doc)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-md border border-blue-200 hover:border-blue-600 transition-all duration-150 shadow-sm"
                                            >
                                                <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                </svg>
                                                แนบไฟล์
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={colSpan} className="text-center py-10 px-4">
                                    <p className="text-xl text-gray-500">
                                        {hasFilters 
                                            ? "ไม่พบเอกสารที่ตรงกับเงื่อนไขการค้นหา" 
                                             : `ยังไม่มีเอกสารประเภท "${selectedType}"`}
                                    </p>
                                    <p className="text-base text-gray-400 mt-2">
                                        {hasFilters
                                            ? "ลองปรับเปลี่ยนเงื่อนไขการค้นหาของคุณ"
                                            : "ลองสร้างเอกสารใหม่ หรือเลือกดูประเภทอื่น"}
                                    </p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-10">
                <button
                    onClick={onGoHome}
                    className="w-full px-8 py-4 bg-blue-600 text-white text-xl font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300"
                >
                    กลับหน้าหลัก
                </button>
            </div>

            {/* Upload Attachment Modal */}
            <UploadAttachmentModal
                document={uploadModalDoc}
                isOpen={Boolean(uploadModalDoc)}
                onClose={() => setUploadModalDoc(null)}
                onSuccess={handleUploadSuccess}
            />
        </div>
    );
};

export default DocumentListPage;
