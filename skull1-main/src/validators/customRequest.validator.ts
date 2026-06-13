import { z } from 'zod';

export const createCustomRequestSchema = z.object({
  body: z.object({
    description: z.string().min(10, 'Description must be at least 10 characters long'),
    requirements: z.string().optional(),
    phone: z.string().optional(),
    files: z.array(z.object({
      url: z.string().url('Invalid file URL'),
      fileType: z.string().min(1, 'File type is required'),
    })).optional(),
  }),
});

export const updateCustomRequestSchema = z.object({
  body: z.object({
    description: z.string().min(10).optional(),
    requirements: z.string().optional(),
    status: z.enum(['PENDING', 'REVIEWED', 'QUOTED', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED']).optional(),
  }),
});
