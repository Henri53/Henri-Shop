"use client";

import { useFormStatus } from "react-dom";

// A submit button that disables itself and shows a pending label while the
// server action runs. Must be rendered inside the <form>.
export default function SubmitButton({
  children,
  pendingText = "Working…",
  className = "",
  disabled = false,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={`disabled:opacity-60 ${className}`}>
      {pending ? pendingText : children}
    </button>
  );
}
