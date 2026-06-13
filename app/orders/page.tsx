'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useOrders } from '@/hooks/useOrders'
import { LoadingSpinner } from '@/components/states/LoadingSpinner'
import { ErrorState } from '@/components/states/ErrorState'
import { EmptyState } from '@/components/states/EmptyState'
import { formatCurrency, formatDate } from '@/lib/utils'
import { OrderCardSkeleton } from '@/components/states/LoadingSkeletons'
import { useProducts } from '@/hooks/useProducts'
import { ProductCard } from '@/components/products/ProductCard'

export default function OrdersPage() {
  const { data: orders, isLoading, error, refetch } = useOrders()
  const { data: recommendedProducts } = useProducts()
  const [activeFilter, setActiveFilter] = useState<'all' | 'placed' | 'shipped' | 'delivered' | 'cancelled'>('all')
  
  const displayProducts = recommendedProducts
    ?.filter((p: any) => p.isActive && p.stock > 0)
    ?.slice(0, 4) || []

  const filteredOrders = orders?.filter((order: any) => {
    if (activeFilter === 'all') return true
    const status = (order.status || 'PENDING').toUpperCase()
    if (activeFilter === 'placed') {
      return ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(status)
    }
    return status === activeFilter.toUpperCase()
  }) || []

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background text-primary-text transition-colors duration-300">
        <Navbar />
        <div className="pt-32 pb-12 md:pb-16 border-b border-border">
          <div className="container mx-auto px-4 md:px-6">
            <h1 className="heading-2 text-primary-text">Your Orders</h1>
          </div>
        </div>
        <div className="py-12 md:py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <OrderCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background text-primary-text transition-colors duration-300">
        <Navbar />
        <ErrorState 
          title="Failed to load orders"
          message="There was an error loading your orders. Please try again."
          onRetry={() => refetch()}
          fullPage={false}
        />
        <Footer />
      </main>
    )
  }

  if (!orders || orders.length === 0) {
    return (
      <main className="min-h-screen bg-background text-primary-text transition-colors duration-300">
        <Navbar />
        <EmptyState
          title="No Orders"
          message="You haven't placed any orders yet. Start exploring our products and create your first order."
          action={{
            label: 'Browse Products',
            onClick: () => window.location.href = '/products',
          }}
          fullPage={false}
        />
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-primary-text transition-colors duration-300">
      <Navbar />

      <div className="pt-32 pb-12 md:pb-16 border-b border-border">
        <div className="container mx-auto px-4 md:px-6">
          <h1 className="heading-2 text-primary-text">Your Orders</h1>
        </div>
      </div>

      <div className="py-12 md:py-16">
        <div className="container mx-auto max-w-6xl px-4 md:px-6 space-y-6">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-2 pb-6 border-b border-border">
            {(['all', 'placed', 'shipped', 'delivered', 'cancelled'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider smooth-transition cursor-pointer border ${
                  activeFilter === filter
                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                    : 'bg-secondary text-secondary-text border-border hover:border-primary/40'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border rounded-xl">
                <p className="text-secondary-text font-medium text-sm">No orders found matching this filter.</p>
              </div>
            ) : (
              filteredOrders.map((order: any, index: number) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card p-8 hover:border-primary/50 smooth-transition cursor-pointer group"
                  onClick={() => window.location.href = `/orders/${order.id}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      {/* Product Image Thumbnail */}
                      {order.items && order.items[0] && (
                        <div className="w-24 h-24 rounded-lg overflow-hidden bg-secondary border border-border shrink-0 shadow-sm">
                          <img 
                            src={order.items[0].image || '/placeholder.jpg'} 
                            alt={order.items[0].name || 'Product'} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-lg text-primary-text mb-1.5 group-hover:text-primary smooth-transition">
                          {order.items?.map((item: any) => item.name).join(', ') || `Order #${order.orderNumber || order.id}`}
                        </h3>
                        <p className="text-sm text-muted-text font-medium">
                          order id: #{order.orderNumber || order.id}
                        </p>
                        <p className="text-sm text-muted-text mt-1">
                          Placed on {formatDate(order.createdAt)}
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="text-xs px-3 py-1 bg-secondary rounded-md capitalize font-bold text-secondary-text border border-border uppercase tracking-wide">
                            {order.status || 'pending'}
                          </span>
                          <span className="text-sm text-secondary-text font-medium">
                            {order.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 0} {(order.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 0) === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-end gap-2 shrink-0">
                      <p className="text-2xl font-extrabold text-primary-text">{formatCurrency(order.totalAmount || order.total)}</p>
                      <p className="text-sm font-semibold text-muted-text group-hover:text-primary smooth-transition sm:mt-3">
                        View Details →
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {displayProducts.length > 0 && (
            <div className="mt-16 pt-12 border-t border-border">
              <h2 className="text-xl font-bold text-primary-text mb-6 uppercase tracking-wider">Continue Shopping: Recommended for You</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {displayProducts.map((prod: any) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}
