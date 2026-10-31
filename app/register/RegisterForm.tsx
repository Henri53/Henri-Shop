"use client";

import { useFormState, useFormStatus } from "react-dom";
import { registerUser } from "@/lib/actions";

const initialState = { error: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full min-h-[48px] rounded-xl bg-accent text-black font-semibold disabled:opacity-60"
    >
      {pending ? "Creating account…" : "Create account"}
    </button>
  );
}

export default function RegisterForm() {
  const [state, formAction] = useFormState(registerUser, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 bg-card border border-border rounded-2xl p-6">
      <div>
        <label className="block text-sm text-muted mb-1">E-mail</label>
        <input
          name="email"
          type="email"
          required
          className="w-full min-h-[44px] px-3 rounded-lg bg-bg border border-border text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-muted mb-1">Password (min. 8 characters)</label>
        <input
          name="password"
          type="password"
          minLength={8}
          required
          className="w-full min-h-[44px] px-3 rounded-lg bg-bg border border-border text-white"
        />
      </div>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
