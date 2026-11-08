"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <div className="card p-6 text-center">
        <p className="text-red-400 mb-4">{error.message || "Something went wrong."}</p>
        <button onClick={() => reset()} className="btn-primary">
          Try again
        </button>
      </div>
    </div>
  );
}
