'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Check, X, Eye, Loader2, DollarSign, Calendar, FileText, Download } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'

interface CustomFile {
  id: string
  url: string
  fileType: string
  createdAt: string
}

interface Quotation {
  id: string
  price: number
  notes: string | null
  status: string
  expiresAt: string
}

interface CustomRequest {
  id: string
  userId: string
  description: string
  requirements: string | null
  status: string
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
  files: CustomFile[]
  quotations: Quotation[]
}

export default function AdminCustomRequests() {
  const [requests, setRequests] = useState<CustomRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal / Detail States
  const [selectedRequest, setSelectedRequest] = useState<CustomRequest | null>(null)
  const [quotePrice, setQuotePrice] = useState('')
  const [quoteNotes, setQuoteNotes] = useState('')
  const [quoteValidity, setQuoteValidity] = useState('7')
  const [submittingQuote, setSubmittingQuote] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)

  const handleConvertToOrder = async (requestId: string) => {
    try {
      setConverting(true)
      const res = await api.post(`/admin/custom-requests/${requestId}/convert-to-order`)
      if (res.data?.success) {
        alert('Custom Request successfully converted into an Order!')
        setSelectedRequest(null)
        fetchRequests()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to convert custom request to order.')
    } finally {
      setConverting(false)
    }
  }

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/custom-requests')
      if (res.data?.success && res.data?.data) {
        // Handle paginated or plain arrays
        const list = Array.isArray(res.data.data) ? res.data.data : res.data.data.requests || []
        setRequests(list)
      }
    } catch (err: any) {
      console.error('Error fetching custom requests:', err)
      setError(err.response?.data?.message || 'Failed to load custom requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    try {
      setUpdatingStatus(newStatus)
      const res = await api.patch(`/admin/custom-requests/${requestId}`, { status: newStatus })
      if (res.data?.success) {
        // Update local list
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r))
        if (selectedRequest?.id === requestId) {
          setSelectedRequest(prev => prev ? { ...prev, status: newStatus } : null)
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update request status.')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRequest) return

    const priceNum = Number(quotePrice)
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Please enter a valid price greater than 0.')
      return
    }

    try {
      setSubmittingQuote(true)
      const res = await api.post('/admin/quotations', {
        customRequestId: selectedRequest.id,
        price: priceNum,
        notes: quoteNotes || undefined,
        validityDays: Number(quoteValidity) || 7
      })

      if (res.data?.success) {
        alert('Quotation submitted successfully!')
        // Close modal, reset forms, reload list
        setSelectedRequest(null)
        setQuotePrice('')
        setQuoteNotes('')
        setQuoteValidity('7')
        fetchRequests()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create quotation.')
    } finally {
      setSubmittingQuote(false)
    }
  }

  // Parse custom title from requirements
  const getRequestTitle = (req: CustomRequest) => {
    if (!req.requirements) return 'Custom Project Request'
    const titleMatch = req.requirements.match(/Project Title:\s*(.*)/)
    if (titleMatch && titleMatch[1]) return titleMatch[1]
    
    // Check if phone format is present
    const phoneMatch = req.requirements.match(/Contact Phone:\s*(\+?\d+)/)
    if (phoneMatch && req.requirements.includes('\n\nRequirements:')) {
      const parts = req.requirements.split('\n\nRequirements:')
      return parts[1]?.trim() || 'Custom Request'
    }
    return req.requirements
  }

  const getPhoneFromRequirements = (req: CustomRequest) => {
    if (!req.requirements) return null
    const phoneMatch = req.requirements.match(/Contact Phone:\s*(\+?\d+)/)
    return phoneMatch ? phoneMatch[1] : null
  }

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div>
          <h1 className="heading-2">Custom Requests</h1>
          <p className="text-muted">Manage and send custom printing quotations for customer projects</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm text-muted">Loading custom requests...</span>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center max-w-md mx-auto">
            {error}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20 bg-secondary/20 border border-white/5 rounded-xl">
            <p className="text-muted text-sm">No custom requests found.</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-left font-semibold text-muted">Project Name</th>
                    <th className="px-6 py-4 text-left font-semibold text-muted">Customer</th>
                    <th className="px-6 py-4 text-left font-semibold text-muted">Files</th>
                    <th className="px-6 py-4 text-left font-semibold text-muted">Status</th>
                    <th className="px-6 py-4 text-left font-semibold text-muted">Quoted Price</th>
                    <th className="px-6 py-4 text-left font-semibold text-muted">Date</th>
                    <th className="px-6 py-4 text-center font-semibold text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => {
                    const activeQuotation = req.quotations?.find(q => q.status === 'PENDING' || q.status === 'ACCEPTED')
                    return (
                      <tr key={req.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-bold text-white max-w-[200px] truncate">
                          {getRequestTitle(req)}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-white">{req.user?.name || 'Customer'}</p>
                            <p className="text-xs text-muted">{req.user?.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-white">
                          {req.files?.length || 0} {req.files?.length === 1 ? 'file' : 'files'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider ${
                            req.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300' :
                            req.status === 'REVIEWED' ? 'bg-blue-500/20 text-blue-300' :
                            req.status === 'QUOTED' ? 'bg-purple-500/20 text-purple-300' :
                            req.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-white">
                          {activeQuotation ? formatCurrency(activeQuotation.price) : '-'}
                        </td>
                        <td className="px-6 py-4 text-muted">{formatDate(req.createdAt)}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded font-bold text-xs transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> View & Quote
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>

      {/* DETAIL & QUOTE MODAL */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#12131a] border border-white/10 rounded-xl p-6 md:p-8 max-w-2xl w-full space-y-6 relative shadow-2xl my-8"
            >
              <button
                onClick={() => setSelectedRequest(null)}
                className="absolute top-4 right-4 text-muted hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <span className="text-[10px] px-2 py-0.5 bg-white/10 rounded uppercase font-bold tracking-wider text-muted select-none">
                  Project Detail View
                </span>
                <h2 className="heading-3 mt-2 text-xl font-bold text-white">
                  {getRequestTitle(selectedRequest)}
                </h2>
                <p className="text-xs text-muted mt-1">Submitted on {formatDate(selectedRequest.createdAt)}</p>
              </div>

              {/* Customer summary */}
              <div className="p-4 bg-white/5 border border-white/5 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-muted uppercase font-bold tracking-wider text-[9px]">Client Info</p>
                  <p className="font-bold text-white text-sm mt-1">{selectedRequest.user?.name || 'N/A'}</p>
                  <p className="text-muted mt-0.5">{selectedRequest.user?.email}</p>
                </div>
                <div>
                  <p className="text-muted uppercase font-bold tracking-wider text-[9px]">Contact Phone</p>
                  <p className="font-bold text-white text-sm mt-1">{getPhoneFromRequirements(selectedRequest) || 'Not Provided'}</p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Project Description</h4>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap bg-white/5 p-4 rounded-lg border border-white/5">
                  {selectedRequest.description}
                </p>
              </div>

              {/* Uploaded Files */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Uploaded Design Files ({selectedRequest.files?.length || 0})</h4>
                {selectedRequest.files?.length === 0 ? (
                  <p className="text-xs text-muted">No files attached.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedRequest.files?.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-secondary/40 border border-white/5 rounded-lg text-xs">
                        <div className="flex items-center gap-2 max-w-[70%]">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate text-white font-medium">.{file.fileType} Design File</span>
                        </div>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded font-bold tracking-wide transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Update Quick Bar */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Quick Status Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'REVIEWED')}
                    disabled={selectedRequest.status === 'REVIEWED'}
                    className="px-3.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed rounded font-bold text-xs tracking-wider uppercase transition cursor-pointer"
                  >
                    Mark Under Review
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'REJECTED')}
                    disabled={selectedRequest.status === 'REJECTED'}
                    className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 disabled:opacity-50 disabled:cursor-not-allowed rounded font-bold text-xs tracking-wider uppercase transition cursor-pointer"
                  >
                    Reject Project
                  </button>
                  {selectedRequest.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handleConvertToOrder(selectedRequest.id)}
                      disabled={converting}
                      className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded font-bold text-xs tracking-wider uppercase transition cursor-pointer"
                    >
                      {converting ? 'Converting...' : 'Convert to Order'}
                    </button>
                  )}
                </div>
              </div>

              {/* Send Quotation Form */}
              <form onSubmit={handleCreateQuotation} className="pt-4 border-t border-white/10 space-y-4">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Send Price Quotation</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-muted font-bold uppercase tracking-wider mb-2">Price Amount (INR)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-muted">₹</span>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 1500"
                        value={quotePrice}
                        onChange={(e) => setQuotePrice(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none rounded text-sm text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted font-bold uppercase tracking-wider mb-2">Validity Period (Days)</label>
                    <input
                      type="number"
                      required
                      placeholder="7"
                      value={quoteValidity}
                      onChange={(e) => setQuoteValidity(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none rounded text-sm text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-muted font-bold uppercase tracking-wider mb-2">Quotation Notes (Optional)</label>
                  <textarea
                    placeholder="Provide details about print resolution, material specs, or estimated delivery..."
                    rows={3}
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none rounded text-sm text-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingQuote}
                  className="w-full flex items-center justify-center gap-1.5 py-3 bg-primary hover:bg-primary/95 text-white font-black uppercase text-xs tracking-wider rounded cursor-pointer transition shadow-lg disabled:opacity-50"
                >
                  {submittingQuote && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Quotation
                </button>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
