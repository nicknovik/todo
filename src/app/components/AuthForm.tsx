import { useState } from "react";
import { signInWithEmail, signUpWithEmail, signOut, getCurrentUser } from "../auth";

export function AuthForm({ onAuth }: { onAuth: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    let result;
    if (isSignUp) {
      result = await signUpWithEmail(email, password);
    } else {
      result = await signInWithEmail(email, password);
    }
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
    } else {
      onAuth();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-xs mx-auto mt-20">
      <h2 className="text-xl font-bold text-center">{isSignUp ? "Sign Up" : "Sign In"}</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="border rounded px-3 py-2"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        className="border rounded px-3 py-2"
      />
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <button type="submit" className="bg-blue-600 text-white py-2 rounded" disabled={loading}>
        {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
      </button>
      <button
        type="button"
        className="text-blue-600 underline text-sm"
        onClick={() => setIsSignUp(!isSignUp)}
      >
        {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
      </button>
    </form>
  );
}
