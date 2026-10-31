"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-card border border-border rounded-2xl text-center">
      <p className="text-red-400 mb-4">{error.message || "Something went wrong."}</p>
      <button onClick={() => reset()} className="px-4 py-2 rounded-lg bg-accent text-black font-medium">
        Try again
      </button>
    </div>
  );
}
