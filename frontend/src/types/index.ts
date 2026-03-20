// Typescript interfaces

export interface Product {
  id: string;
  externalId: string;
  title: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
  listings: ProductListing[];
}

export interface ProductListing {
  id: string;
  productId: string;
  retailerId: string;
  currentPrice: string;
  url?: string;
  isActive: boolean;
  retailer: Retailer;
  priceHistory: PriceHistory[];
}

export interface Retailer {
  id: string;
  name: string;
  apiUrl?: string;
  isActive: boolean;
}

export interface PriceHistory {
  id: string;
  listingId: string;
  price: string;
  currency: string;
  timestamp: string;
}

export interface PriceAlert {
  id: string;
  userId: string;
  productId: string;
  targetPrice?: string;
  percentageThreshold?: string;
  isActive: boolean;
  createdAt: string;
  lastNotifiedPrice?: string;
  lastNotifiedAt?: string;
  product: Product;
}

export interface Notification {
  id: string;
  type: "PRICE_DROP" | "TARGET_REACHED" | "SALE_STARTED";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  alert?: {
    product?: Product;
  };
}

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt?: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}
