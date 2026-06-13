import { CustomRequestRepository } from '../repositories/customRequest.repository';
import { AppError } from '../middlewares/error.middleware';
import { CustomRequestStatus, OrderStatus, PaymentStatus, QuotationStatus } from '@prisma/client';

const customRequestRepository = new CustomRequestRepository();

export class CustomRequestService {
  async getCustomRequests(userId: string): Promise<any[]> {
    return customRequestRepository.findByUserId(userId);
  }

  async getCustomRequestById(userId: string, id: string, isAdmin: boolean = false): Promise<any> {
    const request = await customRequestRepository.findById(id);
    if (!request) {
      throw new AppError(404, 'Custom request not found');
    }

    if (!isAdmin && request.userId !== userId) {
      throw new AppError(403, 'Forbidden access to this request');
    }

    return request;
  }

  async createCustomRequest(userId: string, data: any): Promise<any> {
    if (data.phone) {
      await prisma.user.update({
        where: { id: userId },
        data: { phone: data.phone }
      }).catch(err => console.error('Failed to update user phone:', err));
    }

    const requirementsText = data.phone
      ? `Contact Phone: ${data.phone}${data.requirements ? `\n\nRequirements: ${data.requirements}` : ''}`
      : data.requirements;

    return customRequestRepository.create({
      userId,
      description: data.description,
      requirements: requirementsText,
      files: data.files,
    });
  }

  async updateCustomRequest(userId: string, id: string, data: any, isAdmin: boolean = false): Promise<any> {
    const request = await this.getCustomRequestById(userId, id, isAdmin);

    if (data.status && !isAdmin) {
      throw new AppError(403, 'Only admins can update custom request status');
    }

    return customRequestRepository.updateStatus(id, data.status || request.status);
  }

  async deleteCustomRequest(userId: string, id: string, isAdmin: boolean = false): Promise<void> {
    await this.getCustomRequestById(userId, id, isAdmin);
    await customRequestRepository.delete(id);
  }

  // File attachments
  async uploadRequestFile(userId: string, id: string, url: string, fileType: string): Promise<any> {
    await this.getCustomRequestById(userId, id);
    return customRequestRepository.addFile(id, url, fileType);
  }

  async deleteRequestFile(userId: string, fileId: string, isAdmin: boolean = false): Promise<void> {
    // Verify file exists
    const file = await prisma.customRequestFile.findUnique({ where: { id: fileId } });
    if (!file) {
      throw new AppError(404, 'File not found');
    }

    // Verify ownership
    await this.getCustomRequestById(userId, file.customRequestId, isAdmin);
    await customRequestRepository.deleteFile(fileId);
  }

  async getAllCustomRequests(page: number = 1, limit: number = 10): Promise<any> {
    const { requests, total } = await customRequestRepository.findAll(page, limit);
    return {
      data: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async convertToOrder(id: string): Promise<any> {
    const customRequest = await customRequestRepository.findById(id);
    if (!customRequest) {
      throw new AppError(404, 'Custom request not found');
    }

    if (customRequest.status !== CustomRequestStatus.ACCEPTED) {
      throw new AppError(400, 'Custom request must be in ACCEPTED status to convert to an order');
    }

    const acceptedQuotation = customRequest.quotations.find((q: any) => q.status === QuotationStatus.ACCEPTED);
    if (!acceptedQuotation) {
      throw new AppError(400, 'No accepted quotation found for this custom request');
    }

    const getRequestTitle = (req: any) => {
      if (!req.requirements) return 'Custom Project Request';
      const titleMatch = req.requirements.match(/Project Title:\s*(.*)/);
      if (titleMatch && titleMatch[1]) return titleMatch[1].trim();
      return 'Custom Project Request';
    };

    const projectTitle = getRequestTitle(customRequest);

    return prisma.$transaction(async (tx) => {
      let category = await tx.category.findUnique({
        where: { slug: 'custom-orders' },
      });
      if (!category) {
        category = await tx.category.create({
          data: {
            name: 'Custom Orders',
            slug: 'custom-orders',
            description: 'Custom print designs and orders',
          },
        });
      }

      const product = await tx.product.create({
        data: {
          name: projectTitle,
          slug: `custom-project-${customRequest.id}-${Date.now()}`,
          description: customRequest.description,
          price: acceptedQuotation.price,
          categoryId: category.id,
          stock: 1,
          isActive: false,
        },
      });

      let address = await tx.address.findFirst({
        where: { userId: customRequest.userId, isActive: true },
        orderBy: { isDefault: 'desc' },
      });

      if (!address) {
        address = await tx.address.create({
          data: {
            userId: customRequest.userId,
            street: 'Custom Order Shipping',
            city: 'Custom City',
            state: 'Custom State',
            postalCode: '000000',
            country: 'Custom Country',
            phone: '0000000000',
            isDefault: true,
          },
        });
      }

      const orderNumber = `CR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: customRequest.userId,
          addressId: address.id,
          totalAmount: acceptedQuotation.price,
          status: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          paymentMethod: 'CUSTOM_INVOICE',
          items: {
            create: {
              productId: product.id,
              quantity: 1,
              price: acceptedQuotation.price,
            },
          },
        },
        include: {
          items: true,
        },
      });

      await tx.customRequest.update({
        where: { id },
        data: { status: CustomRequestStatus.COMPLETED },
      });

      return order;
    });
  }
}

// Global prisma import fallback if not defined
import { prisma } from '../config/database';

export default CustomRequestService;
