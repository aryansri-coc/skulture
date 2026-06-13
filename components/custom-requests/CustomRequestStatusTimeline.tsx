'use client'

import { motion } from 'framer-motion'
import { CUSTOM_REQUEST_STATUS_LABELS } from '@/lib/constants'
import { CustomRequestStatus } from '@/lib/types'

const statusOrder = [
  'PENDING',
  'REVIEWED',
  'QUOTED',
  'ACCEPTED',
  'COMPLETED',
]

interface CustomRequestStatusTimelineProps {
  currentStatus: any
}

export const CustomRequestStatusTimeline = ({
  currentStatus,
}: CustomRequestStatusTimelineProps) => {
  const currentIndex = statusOrder.indexOf(currentStatus)

  return (
    <div className="space-y-6">
      <h3 className="font-bold text-primary-text text-lg">Project Status</h3>

      <div className="relative font-sans">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        {/* Status points */}
        <div className="space-y-8">
          {statusOrder.map((status, index) => {
            const isActive = index <= currentIndex
            const isCurrent = status === currentStatus

            return (
              <motion.div
                key={status}
                className="relative pl-20"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Status Circle */}
                <div
                  className={`absolute left-0 w-12 h-12 rounded-full border-2 flex items-center justify-center smooth-transition ${
                    isActive
                      ? 'bg-primary border-primary text-white font-bold shadow-md shadow-primary/20'
                      : 'bg-card border-border text-muted-text'
                  }`}
                >
                  <span className="font-bold text-sm">{index + 1}</span>
                </div>

                {/* Status Content */}
                <div
                  className={`p-4 rounded-xl smooth-transition ${
                    isCurrent
                      ? 'bg-secondary border border-border'
                      : isActive
                        ? 'bg-transparent'
                        : 'opacity-40'
                  }`}
                >
                  <p className={`font-semibold text-sm ${isActive ? 'text-primary-text' : 'text-secondary-text'}`}>
                    {CUSTOM_REQUEST_STATUS_LABELS[status as keyof typeof CUSTOM_REQUEST_STATUS_LABELS]}
                  </p>
                  {isCurrent && (
                    <p className="text-primary text-[11px] font-bold uppercase tracking-wider mt-1">Current step</p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
