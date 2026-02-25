"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { BRAND } from "@/constants";
import Button from "@/components/ui/Button";
import BrandIcon from "@/components/ui/BrandIcon";
import Input from "@/components/ui/Input";

export default function LoginForm() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-light flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-fit">
            <BrandIcon size="lg" className="rounded-2xl" />
          </div>
          <h1 className="text-2xl font-extrabold text-neutral-dark">
            {BRAND.name}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Sign in to your dashboard
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4"
        >
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="alex@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="password123"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="text-sm text-red-500 text-center bg-red-50 rounded-lg py-2">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
          <p className="text-xs text-gray-400 text-center">
            Demo: alex@example.com / password123
          </p>
        </form>
      </div>
    </div>
  );
}
