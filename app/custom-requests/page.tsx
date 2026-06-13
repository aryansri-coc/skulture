'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { formatDate } from '@/lib/utils'
import { CUSTOM_REQUEST_STATUS_LABELS } from '@/lib/constants'

import { useCustomRequests } from '@/hooks/useCustomRequests'

function getRequestTitle(request: any) {
  if (!request.requirements) return 'Custom Project'
  const match = request.requirements.match(/Project Title:\s*([^\n]+)/)
  if (match) return match[1].trim()
  return request.description.substring(0, 30) + (request.description.length > 30 ? '...' : '')
}

export default function CustomRequestsPage() {
  const { data: requests = [], isLoading, error } = useCustomRequests()

  return (
    <main className="min-h-screen bg-background text-primary-text transition-colors duration-300">
      <Navbar />

      {/* Page Header */}
      <motion.div
        className="pt-32 pb-12 md:pb-16 border-b border-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="heading-2 text-primary-text mb-4">Your Custom Requests</h1>
              <p className="text-secondary-text max-w-2xl">
                Track the status of all your custom print requests and quotations
              </p>
            </div>
            <Link
              href="/custom-request"
              className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 smooth-transition whitespace-nowrap cursor-pointer shadow-md"
            >
              New Request
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Requests List */}
      <div className="py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 bg-card border border-border rounded-lg animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16 text-red-400">
              Failed to load custom requests. Please try again.
            </div>
          ) : requests.length === 0 ? (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-secondary-text mb-6">You haven&apos;t created any custom requests yet</p>
              <Link
                href="/custom-request"
                className="inline-block px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 smooth-transition cursor-pointer shadow-md"
              >
                Create Your First Request
              </Link>
            </motion.div>
          ) : (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              {requests.map((request, index) => (
                <motion.div
                  key={request.id}
                  className="p-6 bg-card border border-border hover:border-primary/20 smooth-transition group cursor-pointer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -4 }}
                >
                  <Link href={`/custom-requests/${request.id}`} className="block">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-primary-text group-hover:text-primary smooth-transition">
                          {getRequestTitle(request)}
                        </h3>
                        <p className="text-secondary-text text-sm mt-1 line-clamp-1">
                          {request.description}
                        </p>
                      </div>
                      <span className="text-xs bg-secondary text-secondary-text px-3 py-1 rounded-full whitespace-nowrap ml-4">
                        {CUSTOM_REQUEST_STATUS_LABELS[request.status as keyof typeof CUSTOM_REQUEST_STATUS_LABELS] || request.status}
                      </span>
                    </div>
                    <p className="text-muted-text text-xs">
                      Submitted on {formatDate(request.createdAt)}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}
