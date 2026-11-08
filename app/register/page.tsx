import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-display text-3xl font-bold">Create your account</h1>
      <p className="text-muted mt-1 mb-6">Takes ten seconds. Then top up and shop.</p>
      <RegisterForm />
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <a href="/login" className="text-accent hover:underline">
          Log in
        </a>
      </p>
    </div>
  );
}
