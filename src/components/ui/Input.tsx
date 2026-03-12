import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Input({ label, className = "", id, ...props }: Props) {
  const inputId = id || label?.toLowerCase().replace(/\s/g, "-");
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink-50">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full bg-paper border border-ink-15 rounded-[1rem] px-4 py-3 text-ink placeholder:text-ink-30 focus:outline-none focus:border-signal transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}
