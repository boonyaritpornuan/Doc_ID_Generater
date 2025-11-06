import React, { useState } from 'react';
import { DocumentType, FormData } from '../types';

interface DocumentFormProps {
    docType: DocumentType;
    onSubmit: (formData: FormData) => void;
    onCancel: () => void;
}

const InputField: React.FC<{label: string, name: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, type?: string, required?: boolean}> = 
    ({ label, name, value, onChange, type = 'text', required = false}) => (
    <div>
        <label htmlFor={name} className="block text-base font-medium text-gray-600 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            className="w-full px-4 py-3 bg-white text-gray-800 text-lg border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            style={type === 'date' ? { colorScheme: 'light' } : {}}
        />
    </div>
);

const DocumentForm: React.FC<DocumentFormProps> = ({ docType, onSubmit, onCancel }) => {
    const today = new Date().toISOString().split('T')[0];
    const [formData, setFormData] = useState<FormData>({
        date: today,
        subject: '',
        to: '',
        responsible: '',
        notes: '',
    });
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.date || !formData.subject || !formData.responsible) {
            setError('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ลงวันที่, เรื่อง, ผู้รับผิดชอบ)');
            return;
        }
        if (docType === DocumentType.Book && !formData.to) {
            setError('กรุณากรอกข้อมูล "ถึง" สำหรับหนังสือส่ง');
            return;
        }
        setError('');
        onSubmit(formData);
    };

    return (
        <div className="animate-fade-in">
            <h2 className="text-2xl font-semibold text-gray-800">กรอกข้อมูลสำหรับ: {docType}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                {error && <p className="text-red-500 text-base text-center bg-red-50 p-3 rounded-md">{error}</p>}
                
                <InputField label="ลงวันที่" name="date" type="date" value={formData.date} onChange={handleChange} required />
                <InputField label="เรื่อง" name="subject" value={formData.subject} onChange={handleChange} required />
                
                {docType === DocumentType.Book && (
                     <InputField label="ถึง" name="to" value={formData.to} onChange={handleChange} required />
                )}
                
                <InputField label="ผู้รับผิดชอบ/ผู้จัดทำ" name="responsible" value={formData.responsible} onChange={handleChange} required />

                <div>
                    <label htmlFor="notes" className="block text-base font-medium text-gray-600 mb-2">
                        หมายเหตุ
                    </label>
                    <textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={4}
                        className="w-full px-4 py-3 bg-white text-gray-800 text-lg border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                </div>

                <div className="flex justify-end space-x-4 pt-5">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all text-lg"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all text-lg"
                    >
                        ออกเลข
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DocumentForm;