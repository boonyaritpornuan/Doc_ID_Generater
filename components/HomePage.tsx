import React from 'react';
import { DocumentType } from '../types';

interface HomePageProps {
    onSelectDocType: (docType: DocumentType) => void;
    onViewAll: () => void;
}

const ActionButton: React.FC<{
    title: string;
    description: string;
    // Fix: Changed JSX.Element to React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
    icon: React.ReactElement;
    onClick: () => void;
}> = ({ title, description, icon, onClick }) => (
    <button
        onClick={onClick}
        className="w-full bg-white p-6 rounded-xl shadow-md hover:shadow-lg hover:border-blue-500 transition-all duration-300 text-left flex items-center space-x-6 border-2 border-transparent"
    >
        <div className="flex-shrink-0 bg-blue-600 text-white rounded-full p-3">
            {icon}
        </div>
        <div>
            <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
            <p className="text-lg text-gray-500 mt-1">{description}</p>
        </div>
    </button>
);

const HomePage: React.FC<HomePageProps> = ({ onSelectDocType, onViewAll }) => {
    const FileIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    );

    const CommandIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
    );

    const MegaphoneIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-2.236 9.168-5.514C18.378 1.18 17.76.5 17.14.5H6.86c-.62.001-1.238.68-1.424 1.286L3.436 9.683a4.001 4.001 0 012 4z" />
        </svg>
    );
    
    const ListIcon = (
         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
    );


    return (
        <div className="animate-fade-in">
            <h2 className="text-3xl font-bold text-center text-gray-700 mb-8">เลือกประเภทเอกสารที่ต้องการ</h2>
            <div className="space-y-4">
                <ActionButton 
                    title={DocumentType.Book} 
                    description="สำหรับหนังสือราชการส่งออกภายนอก"
                    icon={FileIcon}
                    onClick={() => onSelectDocType(DocumentType.Book)} 
                />
                <ActionButton 
                    title={DocumentType.Order} 
                    description="สำหรับออกคำสั่งภายในหน่วยงาน"
                    icon={CommandIcon}
                    onClick={() => onSelectDocType(DocumentType.Order)} 
                />
                <ActionButton 
                    title={DocumentType.Notice} 
                    description="สำหรับประกาศข่าวสารให้ทราบโดยทั่วกัน"
                    icon={MegaphoneIcon}
                    onClick={() => onSelectDocType(DocumentType.Notice)} 
                />
            </div>
             <div className="mt-10 border-t border-gray-200 pt-8 text-center">
                <button
                    onClick={onViewAll}
                    className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-lg font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                    {ListIcon}
                    <span className="ml-3">ดูเอกสารทั้งหมด</span>
                </button>
            </div>
        </div>
    );
};

export default HomePage;