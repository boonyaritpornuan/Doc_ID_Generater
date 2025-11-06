import React, { useState, useMemo } from 'react';
import { Document, DocumentType } from '../types';

interface DocumentListPageProps {
    documents: Document[];
    onGoHome: () => void;
    isLoading: boolean; // Add isLoading prop
}

const DocumentListPage: React.FC<DocumentListPageProps> = ({ documents, onGoHome, isLoading }) => {
    const [selectedType, setSelectedType] = useState<DocumentType>(DocumentType.Book);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');


    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'Asia/Bangkok'
        }).format(date);
    };

    const filteredDocuments = useMemo(() => documents
        .filter(doc => {
            if (doc.type !== selectedType) return false;

            const docDate = new Date(doc.date);
            if (startDate) {
                const startFilterDate = new Date(startDate);
                startFilterDate.setHours(0, 0, 0, 0);
                if (docDate < startFilterDate) return false;
            }
            if (endDate) {
                const endFilterDate = new Date(endDate);
                endFilterDate.setHours(23, 59, 59, 999);
                if (docDate > endFilterDate) return false;
            }

            const lowerSearchTerm = searchTerm.toLowerCase();
            if (searchTerm &&
                !doc.number.toLowerCase().includes(lowerSearchTerm) &&
                !doc.subject.toLowerCase().includes(lowerSearchTerm) &&
                !(doc.responsible && doc.responsible.toLowerCase().includes(lowerSearchTerm))
            ) {
                return false;
            }

            return true;
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        [documents, selectedType, searchTerm, startDate, endDate]
    );

    const hasFilters = searchTerm || startDate || endDate;
    const colSpan = selectedType === DocumentType.Notice ? 4 : 5;

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

            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="w-full min-w-max text-left table-auto">
                    <thead className="border-b bg-gray-50">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600">ประเภท</th>
                            {selectedType !== DocumentType.Notice && <th className="p-4 font-semibold text-gray-600">เลขที่</th>}
                            <th className="p-4 font-semibold text-gray-600">ลงวันที่</th>
                            <th className="p-4 font-semibold text-gray-600">เรื่อง</th>
                            <th className="p-4 font-semibold text-gray-600">ผู้รับผิดชอบ</th>
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
                                <tr key={doc.id} className={`border-b ${index % 2 === 0 ? '' : 'bg-blue-50/20'} hover:bg-blue-100/50 transition-colors`}>
                                    <td className="p-4 text-gray-800">{doc.type}</td>
                                    {selectedType !== DocumentType.Notice && <td className="p-4 text-gray-900 font-medium">{doc.number}</td>}
                                    <td className="p-4 text-gray-700 whitespace-nowrap">{formatDate(new Date(doc.date))}</td>
                                    <td className="p-4 text-gray-800">{doc.subject}</td>
                                    <td className="p-4 text-gray-700">{doc.responsible}</td>
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
        </div>
    );
};

export default DocumentListPage;