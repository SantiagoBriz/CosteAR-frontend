import { forwardRef, type InputHTMLAttributes, useId } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Para montos: aplica tipografía monoespaciada alineada a la derecha. */
  numeric?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, numeric, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[12px] font-medium uppercase tracking-wide text-ink-soft"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-11 rounded-sm border bg-surface px-3 text-sm text-ink transition-colors',
            'placeholder:text-idle focus:border-granate',
            numeric && 'tabular text-right',
            error ? 'border-danger' : 'border-line',
            className,
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error ? (
          <span className="text-[12px] text-danger">{error}</span>
        ) : hint ? (
          <span className="text-[12px] text-ink-soft">{hint}</span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';
