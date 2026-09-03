import React, { useState, useRef, useCallback } from 'react';
import { Document, DocumentType } from '../types';
import { uploadAttachments } from '../services/documentService';

interface ResultPageProps {
    document: Document;
    onGoHome: () => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

const ResultPage: React.FC<ResultPageProps> = ({ document, onGoHome }) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadState, setUploadState] = useState<UploadState>('idle');
    const [folderUrl, setFolderUrl] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Bangkok'
        }).format(date);
    };

    const getNumberLabel = (docType: DocumentType): string => {
        switch(docType) {
            case DocumentType.Book:
                return 'เลขหนังสือส่ง';
            case DocumentType.Order:
                return 'เลขคำสั่ง';
            case DocumentType.Notice:
                return 'เลขประกาศ';
            default:
                return 'เลขที่เอกสาร';
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const addFiles = useCallback((newFiles: FileList | File[]) => {
        const filesArray = Array.from(newFiles);
        setSelectedFiles(prev => {
            // Avoid duplicates by name+size
            const existing = new Set(prev.map(f => `${f.name}_${f.size}`));
            const unique = filesArray.filter(f => !existing.has(`${f.name}_${f.size}`));
            return [...prev, ...unique];
        });
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(e.target.files);
            // Reset input so the same file can be selected again
            e.target.value = '';
        }
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFiles(e.dataTransfer.files);
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;

        setUploadState('uploading');
        setUploadError(null);

        try {
            const result = await uploadAttachments(
                document.id,
                document.type,
                document.number,
                selectedFiles
            );
            setFolderUrl(result.folderUrl);
            setUploadState('success');
        } catch (error: any) {
            setUploadError(error.message || 'เกิดข้อผิดพลาดในการอัปโหลด');
            setUploadState('error');
        }
    };

    const handleRetry = () => {
        setUploadState('idle');
        setUploadError(null);
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

            {/* === File Attachment Section === */}
            <div className="border-t-2 border-dashed border-gray-300 mt-8 pt-8">
                <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                    </svg>
                    แนบไฟล์เอกสาร
                </h3>

                {uploadState === 'success' ? (
                    /* Success State */
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-3">
                            <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-lg font-semibold text-green-800 mb-2">อัปโหลดไฟล์สำเร็จ!</p>
                        <p className="text-base text-green-700 mb-4">ไฟล์ทั้งหมด {selectedFiles.length} ไฟล์ ถูกบันทึกลง Google Drive เรียบร้อย</p>
                        {folderUrl && (
                            <a
                                href={folderUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                </svg>
                                เปิดโฟลเดอร์ Google Drive
                            </a>
                        )}
                    </div>
                ) : (
                    /* Idle / Uploading / Error States */
                    <>
                        {/* Drop Zone */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                                isDragging
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                            } ${uploadState === 'uploading' ? 'pointer-events-none opacity-50' : ''}`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                className="hidden"
                                disabled={uploadState === 'uploading'}
                            />
                            <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                            </svg>
                            <p className="text-lg text-gray-600 font-medium">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
                            <p className="text-sm text-gray-400 mt-1">ไม่จำกัดนามสกุลและจำนวนไฟล์</p>
                        </div>

                        {/* File List */}
                        {selectedFiles.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <p className="text-sm font-medium text-gray-600 mb-2">
                                    ไฟล์ที่เลือก ({selectedFiles.length} ไฟล์)
                                </p>
                                {selectedFiles.map((file, index) => (
                                    <div
                                        key={`${file.name}_${file.size}_${index}`}
                                        className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                            </svg>
                                            <span className="text-base text-gray-800 truncate">{file.name}</span>
                                            <span className="text-sm text-gray-400 flex-shrink-0">({formatFileSize(file.size)})</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFile(index)}
                                            disabled={uploadState === 'uploading'}
                                            className="text-red-400 hover:text-red-600 transition-colors p-1 flex-shrink-0 disabled:opacity-50"
                                            aria-label={`ลบไฟล์ ${file.name}`}
                                        >
                                            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Error Message */}
                        {uploadState === 'error' && uploadError && (
                            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                                <div>
                                    <p className="text-base text-red-800 font-medium">อัปโหลดไม่สำเร็จ</p>
                                    <p className="text-sm text-red-600 mt-1">{uploadError}</p>
                                </div>
                            </div>
                        )}

                        {/* Upload Button */}
                        {selectedFiles.length > 0 && (
                            <button
                                type="button"
                                onClick={uploadState === 'error' ? handleRetry : handleUpload}
                                disabled={uploadState === 'uploading'}
                                className="mt-4 w-full px-6 py-3 bg-green-600 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {uploadState === 'uploading' ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        กำลังอัปโหลด...
                                    </>
                                ) : uploadState === 'error' ? (
                                    <>
                                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                                        </svg>
                                        ลองอัปโหลดอีกครั้ง
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                        </svg>
                                        อัปโหลดไฟล์แนบ ({selectedFiles.length} ไฟล์)
                                    </>
                                )}
                            </button>
                        )}
                    </>
                )}
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
