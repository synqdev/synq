import { forwardRef, InputHTMLAttributes } from 'react'

export interface DatePickerProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
    ({ className = '', label, ...props }, ref) => {
        return (
            <div className={`inline-flex flex-col gap-1`}>
                {label && <label className="text-xs font-black uppercase tracking-wider">{label}</label>}
                <div className="relative">
                    <input
                        type="date"
                        ref={ref}
                        className={`
                            appearance-none
                            bg-white text-black 
                            border-2 border-black rounded-xl 
                            font-black 
                            focus:outline-none 
                            hover:bg-gray-100
                            transition-colors
                            px-4 py-2
                            uppercase
                            cursor-pointer
                            h-12
                            ${className}
                        `}
                        {...props}
                    />
                </div>
            </div>
        )
    }
)

DatePicker.displayName = 'DatePicker'
