import { z } from 'zod'

// Auth Schemas
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const ResetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

// Address Schema
export const AddressSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Invalid phone number'),
  street: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(5, 'Postal code is required'),
  country: z.string().min(2, 'Country is required'),
})

// Review Schema
export const ReviewSchema = z.object({
  productId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10, 'Comment must be at least 10 characters').max(500),
})

// Custom Request Schema
export const CustomRequestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
})

// Contact/Inquiry Schema
export const ContactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(5, 'Subject is required'),
  message: z.string().min(20, 'Message must be at least 20 characters'),
})

// Payment Order Schema
export const PaymentOrderSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('INR'),
  description: z.string(),
})

export type LoginFormData = z.infer<typeof LoginSchema>
export type RegisterFormData = z.infer<typeof RegisterSchema>
export type AddressFormData = z.infer<typeof AddressSchema>
export type ReviewFormData = z.infer<typeof ReviewSchema>
export type CustomRequestFormData = z.infer<typeof CustomRequestSchema>
export type ContactFormData = z.infer<typeof ContactSchema>
