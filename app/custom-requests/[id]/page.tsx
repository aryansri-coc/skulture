'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { CustomRequestStatusTimeline } from '@/components/custom-requests/CustomRequestStatusTimeline'
import { QuotationCard } from '@/components/custom-requests/QuotationCard'
import { formatDate } from '@/lib/utils'
import { CustomRequestStatus, Quotation } from '@/lib/types'

import { use } from 'react'
import { useCustomRequestDetail, useAcceptQuotation, useRejectQuotation } from '@/hooks/useCustomRequests'
import { useQueryClient } from '@tanstack/react-query'

function getRequestTitle(request: any) {
  if (!request.requirements) return 'Custom Project'
  const match = request.requirements.match(/Project Title:\s*([^\n]+)/)
  if (match) return match[1].trim()
  return request.description.substring(0, 30) + (request.description.length > 30 ? '...' : '')
}

export default function CustomRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const { data: request, isLoading, error } = useCustomRequestDetail(id)
  
  const acceptMutation = useAcceptQuotation()
  const rejectMutation = useRejectQuotation()

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background text-primary-text transition-colors duration-300 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-secondary-text">Loading request details...</p>
        </div>
      </main>
    )
  }

  if (error || !request) {
    return (
      <main className="min-h-screen bg-background text-primary-text transition-colors duration-300 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-card border border-border rounded-xl">
          <p className="text-red-400 mb-4 font-semibold">Failed to load custom request details</p>
          <Link href="/custom-requests" className="px-4 py-2 bg-white text-black rounded font-medium shadow">
            Back to Requests
          </Link>
        </div>
      </main>
    )
  }

  const activeQuotation = request.quotations?.find(
    (q: any) => q.status === 'PENDING' || q.status === 'ACCEPTED' || q.status === 'REJECTED'
  )

  const quotation = activeQuotation
    ? {
        id: activeQuotation.id,
        amount: activeQuotation.price,
        validityDate: activeQuotation.expiresAt,
        specifications: activeQuotation.notes || '',
        timeline: '5-7 business days',
        status: activeQuotation.status,
      }
    : undefined

  const handleAccept = async () => {
    if (!quotation) return
    try {
      await acceptMutation.mutateAsync(quotation.id)
      queryClient.invalidateQueries({ queryKey: ['customRequests'] })
    } catch (err) {
      console.error(err)
      alert('Failed to accept quotation')
    }
  }

  const handleReject = async () => {
    if (!quotation) return
    try {
      await rejectMutation.mutateAsync(quotation.id)
      queryClient.invalidateQueries({ queryKey: ['customRequests'] })
    } catch (err) {
      console.error(err)
      alert('Failed to reject quotation')
    }
  }

  return (
    <main className="min-h-screen bg-background text-primary-text transition-colors duration-300">
      <Navbar />

      {/* Breadcrumb */}
      <div className="pt-32 pb-6 border-b border-border">
        <div className="container mx-auto px-4 md:px-6">
          <Link href="/custom-requests" className="text-secondary-text hover:text-primary text-sm smooth-transition">
            ← Back to Requests
          </Link>
        </div>
      </div>

      {/* Detail Section */}
      <div className="py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            {/* Left Column - Request Info */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header */}
              <div>
                <h1 className="heading-2 text-primary-text mb-2">{getRequestTitle(request)}</h1>
                <p className="text-secondary-text">
                  Submitted on {formatDate(request.createdAt)}
                </p>
              </div>

              {/* Status Alert for Reject/Cancel */}
              {request.status === 'REJECTED' && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  This quotation has been rejected. You can create a new request or contact support for help.
                </div>
              )}
              {request.status === 'CANCELLED' && (
                <div className="p-4 bg-gray-500/10 border border-gray-500/30 rounded-xl text-secondary-text text-sm">
                  This custom project request has been cancelled.
                </div>
              )}

              {/* Description */}
              <div>
                <h2 className="heading-3 text-lg text-primary-text mb-3">Project Description</h2>
                <p className="text-secondary-text leading-relaxed">{request.description}</p>
              </div>

              {/* Files */}
              <div>
                <h2 className="heading-3 text-lg text-primary-text mb-3">Uploaded Files</h2>
                <div className="space-y-2">
                  {request.files && request.files.length > 0 ? (
                    request.files.map((file: any) => {
                      const fileName = file.url.split('/').pop() || 'File'
                      return (
                        <a
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-3 bg-secondary border border-border rounded-lg flex items-center hover:border-primary/20 smooth-transition"
                        >
                          <span className="w-8 h-8 bg-card border border-border rounded flex items-center justify-center mr-3">
                            📄
                          </span>
                          <span className="text-primary-text text-sm hover:underline">{fileName}</span>
                        </a>
                      )
                    })
                  ) : (
                    <p className="text-secondary-text text-sm">No files uploaded</p>
                  )}
                </div>
              </div>

              {/* Status Timeline */}
              <div className="pt-4 border-t border-border">
                <CustomRequestStatusTimeline currentStatus={request.status} />
              </div>
            </div>

            {/* Right Column - Quotation (PROMINENT) */}
            <div className="lg:col-span-1">
              <motion.div
                className="sticky top-32"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <QuotationCard
                  quotation={quotation}
                  isLoading={acceptMutation.isPending || rejectMutation.isPending}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
