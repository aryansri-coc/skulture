import { QuotationRepository } from '../repositories/quotation.repository';
import { CustomRequestRepository } from '../repositories/customRequest.repository';
import { AppError } from '../middlewares/error.middleware';
import { QuotationStatus, CustomRequestStatus, InquiryStatus, Role } from '@prisma/client';
import { prisma } from '../config/database';

const quotationRepository = new QuotationRepository();
const customRequestRepository = new CustomRequestRepository();

export class QuotationService {
  async getQuotationById(userId: string, id: string): Promise<any> {
    const quotation = await quotationRepository.findById(id);
    if (!quotation) {
      throw new AppError(404, 'Quotation not found');
    }

    // Verify ownership
    const customRequest = await customRequestRepository.findById(quotation.customRequestId);
    if (customRequest.userId !== userId) {
      throw new AppError(403, 'Forbidden access to this quotation');
    }

    return quotation;
  }

  async acceptQuotation(userId: string, id: string): Promise<any> {
    const quotation = await this.getQuotationById(userId, id);

    if (quotation.status !== QuotationStatus.PENDING) {
      throw new AppError(400, 'Quotation is already processed');
    }

    if (new Date() > quotation.expiresAt) {
      throw new AppError(400, 'Quotation has expired');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Accept quotation
      const q = await tx.quotation.update({
        where: { id },
        data: { status: QuotationStatus.ACCEPTED },
      });

      // 2. Reject other quotations for this request
      await tx.quotation.updateMany({
        where: {
          customRequestId: quotation.customRequestId,
          id: { not: id },
        },
        data: { status: QuotationStatus.REJECTED },
      });

      // 3. Update custom request status to ACCEPTED
      await tx.customRequest.update({
        where: { id: quotation.customRequestId },
        data: { status: CustomRequestStatus.ACCEPTED },
      });

      return q;
    });
  }

  async rejectQuotation(userId: string, id: string): Promise<any> {
    const quotation = await this.getQuotationById(userId, id);

    if (quotation.status !== QuotationStatus.PENDING) {
      throw new AppError(400, 'Quotation is already processed');
    }

    return prisma.$transaction(async (tx) => {
      const q = await tx.quotation.update({
        where: { id },
        data: { status: QuotationStatus.REJECTED },
      });

      await tx.customRequest.update({
        where: { id: quotation.customRequestId },
        data: { status: CustomRequestStatus.REJECTED },
      });

      return q;
    });
  }

  async createQuotation(data: any): Promise<any> {
    const customRequest = await customRequestRepository.findById(data.customRequestId);
    if (!customRequest) {
      throw new AppError(404, 'Custom request not found');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.validityDays || 7));

    return prisma.$transaction(async (tx) => {
      const q = await tx.quotation.create({
        data: {
          customRequestId: data.customRequestId,
          price: data.price,
          notes: data.notes,
          status: QuotationStatus.PENDING,
          expiresAt,
        },
      });

      await tx.customRequest.update({
        where: { id: data.customRequestId },
        data: { status: CustomRequestStatus.QUOTED },
      });

      // Notify customer via support notification
      const user = await tx.user.findUnique({
        where: { id: customRequest.userId },
      });

      if (user) {
        const inquiry = await tx.inquiry.create({
          data: {
            userId: user.id,
            name: user.name || 'Customer',
            email: user.email,
            subject: 'Custom Request Quoted',
            message: `Your custom request has been quoted! Price: Rs. ${data.price}. Please check your Custom Projects dashboard to review details.`,
            status: InquiryStatus.PENDING,
          },
        });

        await tx.inquiryMessage.create({
          data: {
            inquiryId: inquiry.id,
            senderRole: Role.ADMIN,
            message: `Your custom request has been quoted! Price: Rs. ${data.price}. Please check your Custom Projects dashboard to accept or reject this quote.`,
          },
        });
      }

      return q;
    });
  }

  async updateQuotation(id: string, data: any): Promise<any> {
    const quotation = await quotationRepository.findById(id);
    if (!quotation) {
      throw new AppError(404, 'Quotation not found');
    }

    return quotationRepository.update(id, data);
  }

  async deleteQuotation(id: string): Promise<void> {
    const quotation = await quotationRepository.findById(id);
    if (!quotation) {
      throw new AppError(404, 'Quotation not found');
    }
    await quotationRepository.delete(id);
  }
}

export default QuotationService;
