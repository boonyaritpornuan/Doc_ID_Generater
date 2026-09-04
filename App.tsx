import React, { useState, useCallback, useEffect } from 'react';
import { DocumentType, Document, FormData, User } from './types';
import { addDocument, getDocuments } from './services/documentService';
import HomePage from './components/HomePage';
import DocumentForm from './components/DocumentForm';
import ResultPage from './components/ResultPage';
import Header from './components/Header';
import DocumentListPage from './components/DocumentListPage';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './components/Login';

type View = 'home' | 'form' | 'result' | 'list';

// REPLACE WITH YOUR ACTUAL GOOGLE CLIENT ID
const GOOGLE_CLIENT_ID = '804958584803-fg497vpc8uvu3mmuvvi5q49eh061sb51.apps.googleusercontent.com';

const App: React.FC = () => {
    const [view, setView] = useState<View>('home');
    const [currentDocType, setCurrentDocType] = useState<DocumentType | null>(null);
    const [createdDocument, setCreatedDocument] = useState<Document | null>(null);
    const [allDocuments, setAllDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);


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
        const storedUser = localStorage.getItem('user_session');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse stored user", e);
                localStorage.removeItem('user_session');
            }
        }
    }, []);

    useEffect(() => {
        if (view === 'list' && user) {
            fetchDocuments();
        }
    }, [view, fetchDocuments, user]);

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

    const handleDocumentUpdated = useCallback((updatedDoc: Document) => {
        setAllDocuments(prev => prev.map(doc => doc.id === updatedDoc.id ? updatedDoc : doc));
    }, []);

    const handleLoginSuccess = (loggedInUser: User) => {
        setUser(loggedInUser);
        localStorage.setItem('user_session', JSON.stringify(loggedInUser));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('user_session');
        setView('home');
    };

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
                return (
                    <DocumentListPage 
                        documents={allDocuments} 
                        onGoHome={handleGoHome} 
                        isLoading={isLoading} 
                        onDocumentUpdated={handleDocumentUpdated}
                    />
                );
            case 'home':
            default:
                return <HomePage onSelectDocType={handleSelectDocType} onViewAll={handleViewAll} />;
        }
    };

    if (!user) {
        return (
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <Login onLoginSuccess={handleLoginSuccess} />
            </GoogleOAuthProvider>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 text-gray-800 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
                    <Header />
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            {user.picture ? (
                                <img
                                    src={user.picture}
                                    alt={user.name}
                                    className="w-8 h-8 rounded-full"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                    {user.name.charAt(0)}
                                </div>
                            )}
                            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.name}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-xs text-red-600 hover:text-red-800 border border-red-200 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                            ออกจากระบบ
                        </button>
                    </div>
                </div>
                <main className="p-8 md:p-10">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default App;