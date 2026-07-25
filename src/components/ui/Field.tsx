import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

const controlBase =
  "w-full rounded-xl border border-lavender-200 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-lavender-400 focus-visible:ring-2 focus-visible:ring-lavender-300";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlBase, className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(controlBase, "min-h-[80px] resize-y", className)} {...props} />;
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(controlBase, "appearance-none", className)} {...props} />;
});

/** Labelled field wrapper with accessible association + error text. */
export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const autoId = useId();
  const id = htmlFor ?? autoId;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
      {children}
      {error && (
        <p role="alert" className="text-xs text-berry-600">
          {error}
        </p>
      )}
    </div>
  );
}
