import React, { useState, useCallback, useEffect } from 'react';
import { DocumentType, Document, FormData } from './types';
import { addDocument, getDocuments } from './services/documentService';
import HomePage from './components/HomePage';
import DocumentForm from './components/DocumentForm';
import ResultPage from './components/ResultPage';
import Header from './components/Header';
import DocumentListPage from './components/DocumentListPage';

type View = 'home' | 'form' | 'result' | 'list';

const App: React.FC = () => {
    const [view, setView] = useState<View>('home');
    const [currentDocType, setCurrentDocType] = useState<DocumentType | null>(null);
    const [createdDocument, setCreatedDocument] = useState<Document | null>(null);
    const [allDocuments, setAllDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);


    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const docs = await getDocuments();
            setAllDocuments(docs);
        } catch (error) {
            console.error("Failed to fetch documents:", error);
            setError("ไม่สามารถโหลดข้อมูลเอกสารได้");
        } finally {
            setIsLoading(false);
        }
    }, []);


    useEffect(() => {
        if (view === 'list') {
            fetchDocuments();
        }
    }, [view, fetchDocuments]);

    const handleSelectDocType = useCallback((docType: DocumentType) => {
        setCurrentDocType(docType);
        setView('form');
    }, []);

    const handleFormSubmit = useCallback(async (formData: FormData) => {
        if (!currentDocType) return;
        setIsLoading(true);
        setError(null);
        try {
            const newDocument = await addDocument(currentDocType, formData);
            setCreatedDocument(newDocument);
            setView('result');
        } catch (error) {
            console.error("Failed to add document:", error);
            setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
            // Optionally, stay on the form view to show the error
        } finally {
            setIsLoading(false);
        }
    }, [currentDocType]);

    const handleGoHome = useCallback(() => {
        setView('home');
        setCurrentDocType(null);
        setCreatedDocument(null);
        setError(null);
    }, []);

    const handleCancelForm = useCallback(() => {
        setView('home');
        setCurrentDocType(null);
        setError(null);
    }, []);

    const handleViewAll = useCallback(() => {
        setView('list');
    }, []);

    const renderContent = () => {
        // Global loading spinner for page transitions
        if (isLoading && view !== 'list') {
            return <div className="text-center py-20"><p className="text-xl text-gray-500 animate-pulse">กำลังดำเนินการ...</p></div>;
        }
        
        if (error && view !== 'form') {
             return (
                <div className="text-center py-20">
                    <p className="text-xl text-red-500">{error}</p>
                    <button onClick={handleGoHome} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md">กลับหน้าหลัก</button>
                </div>
            );
        }


        switch (view) {
            case 'form':
                return currentDocType && (
                    <DocumentForm
                        docType={currentDocType}
                        onSubmit={handleFormSubmit}
                        onCancel={handleCancelForm}
                    />
                );
            case 'result':
                return createdDocument && (
                    <ResultPage document={createdDocument} onGoHome={handleGoHome} />
                );
             case 'list':
                return <DocumentListPage documents={allDocuments} onGoHome={handleGoHome} isLoading={isLoading} />;
            case 'home':
            default:
                return <HomePage onSelectDocType={handleSelectDocType} onViewAll={handleViewAll} />;
        }
    };

    return (
         <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 text-gray-800 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden">
                <Header />
                <main className="p-8 md:p-10">
                   {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default App;