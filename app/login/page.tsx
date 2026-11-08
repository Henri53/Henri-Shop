import LoginForm from "./LoginForm";

export default function LoginPage({ searchParams }: { searchParams: { registered?: string } }) {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-display text-3xl font-bold">Welcome back</h1>
      <p className="text-muted mt-1 mb-6">Log in to see your balance and orders.</p>
      {searchParams.registered && (
        <p className="mb-4 rounded-xl border border-accent/30 bg-accent/10 text-accent px-4 py-3 text-sm">
          Account created. Log in below.
        </p>
      )}
      <LoginForm />
      <p className="mt-6 text-sm text-muted">
        New here?{" "}
        <a href="/register" className="text-accent hover:underline">
          Create an account
        </a>
      </p>
    </div>
  );
}
