import React from 'react';
import { Document, DocumentType } from '../types';

interface ResultPageProps {
    document: Document;
    onGoHome: () => void;
}

const ResultPage: React.FC<ResultPageProps> = ({ document, onGoHome }) => {
    
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Bangkok'
        }).format(date);
    };

    // Fix: Add helper function for more natural document number labels
    const getNumberLabel = (docType: DocumentType): string => {
        switch(docType) {
            case DocumentType.Book:
                return 'เลขหนังสือส่ง';
            case DocumentType.Order:
                return 'เลขคำสั่ง';
            case DocumentType.Notice:
                // This label is still needed for the list page, but won't be shown here.
                return 'เลขประกาศ';
            default:
                return 'เลขที่เอกสาร';
        }
    };

    const DetailItem: React.FC<{ label: string; value?: string | null; isHighlight?: boolean }> = ({ label, value, isHighlight = false }) => {
        if (!value) return null;
        
        return (
            <div className="border-t border-gray-200 py-5">
                <p className="text-lg text-gray-500">{label}</p>
                {isHighlight ? (
                    <p className="text-3xl font-bold text-blue-600 mt-1">{value}</p>
                ) : (
                    <p className="text-2xl text-gray-900 mt-1">{value}</p>
                )}
            </div>
        );
    };

    return (
        <div className="animate-fade-in w-full">
            <div className="text-center mb-8">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                     <svg className="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">ออกเลขสำเร็จ!</h2>
                <p className="text-xl text-gray-500 mt-2">ข้อมูลเอกสารที่ออกเลขเรียบร้อยแล้ว</p>
            </div>

            <div>
                {/* Conditionally render the document number, hiding it for 'ประกาศ' type */}
                {document.type !== DocumentType.Notice && (
                    <DetailItem label={getNumberLabel(document.type)} value={document.number} isHighlight />
                )}
                <DetailItem label="เรื่อง" value={document.subject} isHighlight={document.type === DocumentType.Notice} />
                <DetailItem label="ลงวันที่" value={formatDate(document.date)} />
                <DetailItem label="ถึง" value={document.to} />
                <DetailItem label="การเวียน" value={document.circulate} />
                <DetailItem label="ผู้รับผิดชอบ/ผู้จัดทำ" value={document.responsible} />
                <DetailItem label="หมายเหตุ" value={document.notes} />
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

export default ResultPage;
