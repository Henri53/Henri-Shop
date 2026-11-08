"use client";

import { useFormState, useFormStatus } from "react-dom";
import { registerUser } from "@/lib/actions";

const initialState = { error: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full min-h-[48px]">
      {pending ? "Creating account…" : "Create account"}
    </button>
  );
}

export default function RegisterForm() {
  const [state, formAction] = useFormState(registerUser, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 card p-6">
      <div>
        <label className="label">E-mail</label>
        <input name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label className="label">Password (min. 8 characters)</label>
        <input
          name="password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          className="input"
        />
      </div>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
