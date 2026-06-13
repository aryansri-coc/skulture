import { Order, OrderItem, OrderStatusHistory, Address, Product, ProductImage, User } from '@prisma/client';

export interface OrderResponseDTO {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentId: string | null;
  createdAt: Date;
  address: {
    id: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string | null;
  };
  items: {
    id: string;
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  }[];
  statusHistory: {
    id: string;
    status: string;
    notes: string | null;
    createdAt: Date;
  }[];
  user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export type OrderWithDetails = Order & {
  address: Address;
  items: (OrderItem & { product: Product & { images: ProductImage[] } })[];
  statusHistory: OrderStatusHistory[];
  user?: User | null;
};

export const formatOrderResponse = (order: OrderWithDetails): OrderResponseDTO => {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    totalAmount: order.totalAmount,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentId: order.paymentId,
    createdAt: order.createdAt,
    address: {
      id: order.address.id,
      street: order.address.street,
      city: order.address.city,
      state: order.address.state,
      postalCode: order.address.postalCode,
      country: order.address.country,
      phone: (order.address as any).phone || null,
    },
    items: order.items.map((item) => {
      const primaryImage = item.product.images?.find((img) => img.isPrimary)?.url || item.product.images?.[0]?.url || '/placeholder.jpg';
      return {
        id: item.id,
        productId: item.productId,
        name: item.product.name,
        price: item.price,
        quantity: item.quantity,
        image: primaryImage,
      };
    }),
    statusHistory: order.statusHistory.map((history) => ({
      id: history.id,
      status: history.status,
      notes: history.notes,
      createdAt: history.createdAt,
    })),
    user: order.user ? {
      id: order.user.id,
      name: order.user.name,
      email: order.user.email,
    } : null,
  };
};
