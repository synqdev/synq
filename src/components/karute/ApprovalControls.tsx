'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './StatusBadge'
import { updateKaruteStatusAction } from '@/app/actions/karute'

interface ApprovalControlsProps {
  status: string
  recordId: string
  onUpdate: () => void
}

/**
 * Status transition controls for karute approval workflow.
 * Draft -> Review -> Approved, with ability to reopen.
 */
export function ApprovalControls({ status, recordId, onUpdate }: ApprovalControlsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const t = useTranslations('admin.karuteEditor')

  const handleTransition = async (newStatus: 'DRAFT' | 'REVIEW' | 'APPROVED') => {
    if (isLoading) return
    setIsLoading(newStatus)
    try {
      await updateKaruteStatusAction(recordId, newStatus)
      onUpdate()
    } catch (error) {
      console.error('Failed to update status', error)
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <StatusBadge status={status} />

      {status === 'DRAFT' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleTransition('REVIEW')}
          loading={isLoading === 'REVIEW'}
          disabled={isLoading !== null}
          className="!border-yellow-500 !text-yellow-700 hover:!bg-yellow-50"
        >
          {t('submitReview')}
        </Button>
      )}

      {status === 'REVIEW' && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTransition('APPROVED')}
            loading={isLoading === 'APPROVED'}
            disabled={isLoading !== null}
            className="!border-green-500 !text-green-700 hover:!bg-green-50"
          >
            {t('approve')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleTransition('DRAFT')}
            loading={isLoading === 'DRAFT'}
            disabled={isLoading !== null}
          >
            {t('backToDraft')}
          </Button>
        </>
      )}

      {status === 'APPROVED' && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleTransition('DRAFT')}
          loading={isLoading === 'DRAFT'}
          disabled={isLoading !== null}
        >
          {t('reopen')}
        </Button>
      )}
    </div>
  )
}
