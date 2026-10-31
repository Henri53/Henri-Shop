import LoginForm from "./LoginForm";

export default function LoginPage({ searchParams }: { searchParams: { registered?: string } }) {
  return (
    <div className="max-w-md mx-auto mt-16 px-4">
      <h1 className="font-display text-3xl font-bold mb-2">Log in</h1>
      {searchParams.registered && (
        <p className="mb-4 text-sm text-accent">Account created — log in below.</p>
      )}
      <LoginForm />
      <p className="mt-6 text-sm text-muted">
        New here?{" "}
        <a href="/register" className="text-accent">
          Create an account
        </a>
      </p>
    </div>
  );
}
