import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="max-w-md mx-auto mt-16 px-4">
      <h1 className="font-display text-3xl font-bold mb-6">Create your account</h1>
      <RegisterForm />
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <a href="/login" className="text-accent">
          Log in
        </a>
      </p>
    </div>
  );
}
