// types/index.ts
export type UserRole = 'farmer' | 'buyer';

export type AppUser = {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  phone?: string;
  location?: string;
  photoURL?: string;
};

export type Post = {
  id: string;
  farmerUid: string;
  produceName: string;
  description: string;
  quantity: number;
  price: number;
  unit: string;           // e.g. "kg", "basket", "piece"
  location: string;
  images: string[];       // URLs from Firebase Storage
  createdAt: any;         // Timestamp
  status: 'available' | 'sold';
};
