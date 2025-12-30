
export interface Donation {
  id: string;
  event_id: string;
  donorName: string;
  fatherName?: string;
  mobile?: string;
  amount: number;
  description?: string;
  paymentType: 'pos' | 'cash' | 'card' | 'online';
  hideName: boolean;
  status: 'pending' | 'approved';
  receiptImage?: string;
  createdAt?: string;
}

export interface Event {
  id: string;
  title: string;
  isactive: boolean;
  created_at: string;
}

export interface Admin {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'superadmin';
}

export interface DisplaySettings {
  fontSize: number;
  scrollSpeed: number;
  highThreshold: number;
  midThreshold: number;
  fontHigh: string;
  fontMid: string;
  fontLow: string;
  customFontData?: string;
  deceasedImage?: string;
  bgImage?: string;
  announcementImage?: string;
  showAnnouncement: boolean;
  eventTitle: string;
  titleColor: string;
  titleSize: number;
  deceasedLabel: string;
  deceasedLabelColor: string;
  deceasedLabelSize: number;
  footerText: string;
  footerColor: string;
  footerSize: number;
}

export type ViewType = 'landing' | 'login' | 'admin' | 'display' | 'donor';
