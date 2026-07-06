import { useId } from "react";
import type { InputHTMLAttributes } from "react";

export type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id"
> & {
  label: string;
  error?: string;
};

export function TextField({
  label,
  error,
  className = "",
  ...rest
}: TextFieldProps) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-text-dim">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`h-8 rounded-md border bg-surface px-2 text-sm text-text outline-none placeholder:text-text-dim focus:border-accent ${error ? "border-red-500" : "border-border"} ${className}`}
        {...rest}
      />
      {error && (
        <span id={errorId} className="text-xs text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}
