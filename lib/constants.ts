// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  TIMEOUT: 30000,
}

// Supported file types for custom print requests
export const SUPPORTED_FILE_TYPES = [
  'application/vnd.ms-pki.stl',
  'model/stl',
  'text/plain', // STL can be text or binary
  'model/obj',
  'application/x-obj',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]

export const SUPPORTED_FILE_EXTENSIONS = ['.stl', '.obj', '.step', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.jfif', '.gif']

export const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500 MB

export const MAX_FILES_PER_REQUEST = 5

// Custom Request Status Labels
export const CUSTOM_REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending Review',
  REVIEWED: 'Reviewed',
  QUOTED: 'Quoted',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

// Custom Request Status Colors
export const CUSTOM_REQUEST_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  REVIEWED: 'bg-blue-500',
  QUOTED: 'bg-purple-500',
  ACCEPTED: 'bg-green-500',
  REJECTED: 'bg-red-500',
  COMPLETED: 'bg-green-600',
  CANCELLED: 'bg-gray-500',
}

// Order Status Labels
export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

// Common API Endpoints
export const ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  VERIFY_EMAIL: '/auth/verify-email',
  VERIFY_OTP: '/auth/verify-otp',
  RESEND_OTP: '/auth/resend-otp',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  REFRESH_TOKEN: '/auth/refresh',

  // Products
  PRODUCTS: '/products',
  FEATURED_PRODUCTS: '/products/featured',
  PRODUCT_DETAIL: (slug: string) => `/products/slug/${slug}`,
  CATEGORIES: '/categories',

  // Cart
  CART: '/cart',

  // Orders
  ORDERS: '/orders',
  ORDER_DETAIL: (id: string) => `/orders/${id}`,

  // Custom Requests
  CUSTOM_REQUESTS: '/custom-requests',
  CUSTOM_REQUEST_DETAIL: (id: string) => `/custom-requests/${id}`,
  UPLOAD_FILE: '/custom-requests/upload',

  // Reviews
  REVIEWS: '/reviews',
  PRODUCT_REVIEWS: (productId: string) => `/reviews/product/${productId}`,

  // Contact/Inquiries
  INQUIRIES: '/inquiries',

  // Razorpay
  CREATE_PAYMENT_ORDER: '/payments/create-order',
  VERIFY_PAYMENT: '/payments/verify',
}
