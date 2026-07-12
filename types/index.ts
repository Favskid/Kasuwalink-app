// types/index.ts
export type UserRole = 'farmer' | 'buyer' | 'admin';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type AppUser = {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  phone?: string;
  location?: string;
  photoURL?: string;
  accountStatus?: 'active' | 'suspended';
  verificationStatus?: VerificationStatus;
  createdAt?: any;
};

export type VerificationData = {
  uid: string;
  role: UserRole;
  fullLegalName: string;
  nin: string;              // National Identification Number
  phone: string;
  address: string;
  state: string;
  // Farmer specific
  farmName?: string;
  farmSize?: string;
  produceTypes?: string;
  // Buyer specific
  businessName?: string;
  deliveryAddress?: string;
  submittedAt: any;
  status: VerificationStatus;
  reviewedAt?: any;
  reviewNote?: string;
};

export type Post = {
  id: string;
  farmerUid: string;
  farmerName?: string;
  farmerEmail?: string;
  produceName: string;
  description: string;
  quantity: number;
  price: number;
  unit: string;           // e.g. "kg", "basket", "piece"
  location: string;
  images: string[];       // Cloudinary image URLs
  videoUrl?: string;      // Cloudinary video URL (live produce video)
  createdAt: any;
  status: 'available' | 'sold';
  farmerVerified?: boolean;
};

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'paid'          // Buyer paid — in escrow
  | 'delivered'     // Farmer marked as delivered
  | 'completed'     // Buyer confirmed receipt — farmer gets paid
  | 'cancelled'
  | 'disputed';

export type Order = {
  id: string;
  postId: string;
  produceName: string;
  buyerUid: string;
  buyerName?: string;
  buyerEmail?: string;
  farmerUid: string;
  farmerName?: string;
  farmerEmail?: string;
  priceOffered: number;
  quantity: number;
  status: OrderStatus;
  createdAt: any;
  paidAt?: any;
  deliveredAt?: any;
  completedAt?: any;
  paystackRef?: string;    // Paystack transaction reference
  escrowNote?: string;
};

export type ChatThread = {
  id: string;            // threadId = postId_buyerUid
  postId: string;
  produceName: string;
  farmerUid: string;
  farmerName: string;
  farmerEmail: string;
  buyerUid: string;
  buyerName: string;
  buyerEmail: string;
  lastMessage?: string;
  lastMessageAt?: any;
  createdAt: any;
};

export type ChatMessage = {
  id: string;
  text: string;
  sender: string;        // uid
  senderName: string;
  senderEmail: string;
  senderRole: UserRole;
  createdAt: any;
};
