import React, { useState, useRef, useCallback } from 'react';
import { Document } from '../types';
import { uploadAttachments } from '../services/documentService';

interface UploadAttachmentModalProps {
    document: Document | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (updatedDoc: Document) => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export const UploadAttachmentModal: React.FC<UploadAttachmentModalProps> = ({
    document,
    isOpen,
    onClose,
    onSuccess,
}) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadState, setUploadState] = useState<UploadState>('idle');
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadedFolderUrl, setUploadedFolderUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = useCallback(() => {
        setSelectedFiles([]);
        setIsDragging(false);
        setUploadState('idle');
        setUploadError(null);
        setUploadedFolderUrl(null);
    }, []);

    const handleClose = () => {
        if (uploadState === 'uploading') return;
        resetState();
        onClose();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...newFiles]);
        }
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
            const droppedFiles = Array.from(e.dataTransfer.files);
            setSelectedFiles(prev => [...prev, ...droppedFiles]);
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== indexToRemove));
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleUpload = async () => {
        if (!document || selectedFiles.length === 0) return;

        setUploadState('uploading');
        setUploadError(null);

        try {
            const result = await uploadAttachments(
                document.id,
                document.type,
                document.number,
                selectedFiles
            );

            setUploadedFolderUrl(result.folderUrl);
            setUploadState('success');

            const updated: Document = {
                ...document,
                folderUrl: result.folderUrl,
            };
            onSuccess(updated);
        } catch (error: any) {
            setUploadError(error.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
            setUploadState('error');
        }
    };

    if (!isOpen || !document) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget && uploadState !== 'uploading') {
                    handleClose();
                }
            }}
        >
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <svg className="w-6 h-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                            </svg>
                            แนบไฟล์เอกสาร
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            เพิ่มไฟล์แนบสำหรับเอกสารนี้ใน Google Drive
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={uploadState === 'uploading'}
                        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40"
                        aria-label="Close modal"
                    >
                        <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-4">
                    {/* Document Info Card */}
                    <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3.5 text-sm space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-blue-900">{document.type}</span>
                            <span className="text-xs px-2 py-0.5 bg-blue-200/80 text-blue-900 rounded font-medium">
                                {document.number || 'เลขประกาศ'}
                            </span>
                        </div>
                        <p className="text-gray-700 font-medium line-clamp-2">{document.subject}</p>
                        {document.folderUrl && (
                            <div className="pt-1.5 border-t border-blue-200/60 mt-1 flex items-center justify-between text-xs">
                                <span className="text-gray-500">เอกสารนี้มีโฟลเดอร์อยู่แล้ว:</span>
                                <a
                                    href={document.folderUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-700 hover:text-blue-900 font-semibold underline inline-flex items-center gap-1"
                                >
                                    📁 เปิด Google Drive
                                </a>
                            </div>
                        )}
                    </div>

                    {uploadState === 'success' ? (
                        /* Success View */
                        <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-2">
                                <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-lg font-bold text-green-800">อัปโหลดไฟล์สำเร็จ!</p>
                            <p className="text-sm text-green-700 mt-1 mb-4">
                                ไฟล์ทั้งหมด {selectedFiles.length} ไฟล์ ถูกจัดเก็บลง Google Drive เรียบร้อย
                            </p>
                            {uploadedFolderUrl && (
                                <a
                                    href={uploadedFolderUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium text-sm rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                >
                                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                    </svg>
                                    เปิดโฟลเดอร์ Google Drive
                                </a>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Drop Zone */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
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
                                <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                                </svg>
                                <p className="text-base text-gray-700 font-medium">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
                                <p className="text-xs text-gray-400 mt-0.5">ไม่จำกัดนามสกุลและจำนวนไฟล์</p>
                            </div>

                            {/* File List */}
                            {selectedFiles.length > 0 && (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        ไฟล์ที่เลือก ({selectedFiles.length} ไฟล์)
                                    </p>
                                    {selectedFiles.map((file, index) => (
                                        <div
                                            key={`${file.name}_${file.size}_${index}`}
                                            className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                                </svg>
                                                <span className="text-gray-800 truncate font-medium">{file.name}</span>
                                                <span className="text-xs text-gray-400 flex-shrink-0">({formatFileSize(file.size)})</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveFile(index)}
                                                disabled={uploadState === 'uploading'}
                                                className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-50"
                                                aria-label={`ลบไฟล์ ${file.name}`}
                                            >
                                                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Error Alert */}
                            {uploadState === 'error' && uploadError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm flex items-start gap-2">
                                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                    </svg>
                                    <div>
                                        <p className="font-semibold text-red-800">อัปโหลดไม่สำเร็จ</p>
                                        <p className="text-red-600 text-xs mt-0.5">{uploadError}</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    {uploadState === 'success' ? (
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-5 py-2 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            เสร็จสิ้น
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={uploadState === 'uploading'}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleUpload}
                                disabled={selectedFiles.length === 0 || uploadState === 'uploading'}
                                className="px-5 py-2 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {uploadState === 'uploading' ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        กำลังอัปโหลด...
                                    </>
                                ) : uploadState === 'error' ? (
                                    'ลองใหม่อีกครั้ง'
                                ) : (
                                    `อัปโหลด (${selectedFiles.length} ไฟล์)`
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
