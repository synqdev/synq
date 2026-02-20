import { Button } from './button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export interface ActionPopoverProps {
  label?: string
  title?: string
  className?: string
  actionLabel?: string
  actionDisabled?: boolean
  onAction?: () => void
  children: React.ReactNode
}

export function ActionPopover({
  label = 'ACTIONS',
  title,
  className = '',
  actionLabel,
  actionDisabled,
  onAction,
  children,
}: ActionPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="iso" className="flex items-center gap-2">
          {label}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className={`border-2 border-black rounded-xl shadow-[0_4px_0_0_rgba(0,0,0,1)] ${className}`}
      >
        <div className="space-y-4">
          {title && (
            <div className="text-sm font-black uppercase tracking-wide text-black">
              {title}
            </div>
          )}
          {children}
          {actionLabel && (
            <Button
              variant="iso"
              className="w-full h-10 px-4"
              disabled={actionDisabled}
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
