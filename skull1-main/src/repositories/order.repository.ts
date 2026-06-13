import { prisma } from '../config/database';
import { Order, OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { OrderWithDetails } from '../dto/order.dto';
import { generateOrderNumber } from '../utils/generateOrderNumber';

export class OrderRepository {
  async findById(id: string): Promise<OrderWithDetails | null> {
    return prisma.order.findUnique({
      where: { id },
      include: {
        address: true,
        user: true,
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    }) as Promise<OrderWithDetails | null>;
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderWithDetails | null> {
    return prisma.order.findUnique({
      where: { orderNumber },
      include: {
        address: true,
        user: true,
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    }) as Promise<OrderWithDetails | null>;
  }

  async findByUserId(userId: string): Promise<OrderWithDetails[]> {
    return prisma.order.findMany({
      where: { userId },
      include: {
        address: true,
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }) as Promise<OrderWithDetails[]>;
  }

  async findAll(filters: { status?: OrderStatus; page?: number; limit?: number } = {}): Promise<{ orders: OrderWithDetails[]; total: number }> {
    const { status, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          address: true,
          user: true,
          items: {
            include: {
              product: {
                include: {
                  images: true,
                },
              },
            },
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders: orders as OrderWithDetails[],
      total,
    };
  }

  async create(data: {
    userId: string;
    addressId: string;
    totalAmount: number;
    items: { productId: string; quantity: number; price: number }[];
    paymentMethod?: string;
    codCharge?: number;
  }): Promise<Order> {
    const { userId, addressId, totalAmount, items, paymentMethod = 'CARD', codCharge = 0.0 } = data;
    const orderNumber = generateOrderNumber();

    return prisma.$transaction(async (tx) => {
      // 1. Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId,
          totalAmount,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod,
          codCharge,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
          statusHistory: {
            create: {
              status: OrderStatus.PENDING,
              notes: paymentMethod === 'COD' ? 'Order placed via Cash on Delivery.' : 'Order placed, pending payment.',
            },
          },
        },
      });

      // 2. Clear user's cart
      await tx.cart.update({
        where: { userId },
        data: {
          items: {
            deleteMany: {},
          },
        },
      });

      return order;
    });
  }

  async awardStampIfEligible(tx: any, orderId: string): Promise<void> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { loyaltyStampAwarded: true, userId: true, paymentStatus: true, status: true },
    });

    if (!order) return;

    // Award stamp if not already awarded AND order is either PAID or status is CONFIRMED/DELIVERED
    const isPaid = order.paymentStatus === PaymentStatus.PAID;
    const isConfirmedOrDelivered = order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.DELIVERED;

    if (!order.loyaltyStampAwarded && (isPaid || isConfirmedOrDelivered)) {
      // 1. Mark stamp as awarded on order
      await tx.order.update({
        where: { id: orderId },
        data: { loyaltyStampAwarded: true },
      });

      // 2. Increment user's loyalty stamps
      const user = await tx.user.findUnique({
        where: { id: order.userId },
        select: { loyaltyStamps: true },
      });

      if (user) {
        const newStamps = user.loyaltyStamps + 1;
        const updates: Prisma.UserUpdateInput = {
          loyaltyStamps: newStamps <= 8 ? newStamps : 8,
        };
        
        if (newStamps >= 8) {
          updates.loyaltyDiscountPending = true;
        }

        await tx.user.update({
          where: { id: order.userId },
          data: updates,
        });
      }
    }
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    notes?: string
  ): Promise<Order> {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: { status },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status,
          notes: notes || `Order status updated to ${status}`,
        },
      });

      // Award stamp if this status update makes it eligible
      await this.awardStampIfEligible(tx, id);

      return order;
    });
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
    paymentId?: string
  ): Promise<Order> {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: {
          paymentStatus,
          paymentId,
        },
      });

      // Award stamp if this payment update makes it eligible
      await this.awardStampIfEligible(tx, id);

      return order;
    });
  }

  async countPending(): Promise<number> {
    return prisma.order.count({
      where: { status: OrderStatus.PENDING },
    });
  }

  async countTotal(): Promise<number> {
    return prisma.order.count();
  }

  async sumRevenue(): Promise<number> {
    const aggregate = await prisma.order.aggregate({
      where: { paymentStatus: PaymentStatus.PAID },
      _sum: {
        totalAmount: true,
      },
    });
    return aggregate._sum.totalAmount || 0;
  }
}

export default OrderRepository;
