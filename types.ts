
export enum DocumentType {
  Book = 'หนังสือส่ง',
  Order = 'คำสั่ง',
  Notice = 'ประกาศ',
}

export interface Document {
  id: string;
  timestamp: Date;
  type: DocumentType;
  number: string;
  date: Date;
  subject: string;
  to?: string;
  responsible: string;
  notes?: string;
  circulate?: string;
}

export interface FormData {
    date: string;
    subject: string;
    to: string;
    responsible: string;
    notes: string;
    circulate: boolean;
}
