import { useState } from "react";
import { motion } from "framer-motion";
import { Chrome, Lock, Mail, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import AuthShell from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Check the confirmation field and try again.",
        variant: "destructive",
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: "Accept the terms first",
        description: "You need to agree before creating an account.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          username: name,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      toast({
        title: "Account created",
        description: "Use your new credentials to sign in.",
      });

      navigate("/login");
    } catch (err: any) {
      toast({
        title: "Signup failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleOAuth = (provider: string) => {
    toast({
      title: `${provider} signup`,
      description: "This is a demo. OAuth is not implemented yet.",
    });
  };

  return (
    <AuthShell
      eyebrow="Create account"
      title="Start with a workspace that already feels finished."
      description="Create an account to open collaborative rooms, invite teammates, and use the redesigned dark editor shell."
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-foreground transition hover:text-primary">
            Sign in
          </Link>
        </p>
      }
    >
      <motion.form
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        onSubmit={handleSignup}
        className="space-y-5"
      >
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Full name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-11"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-11"
              required
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-11"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Confirm</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-11"
                required
              />
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <Checkbox
            id="terms"
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
            className="mt-0.5"
          />
          <label htmlFor="terms" className="text-sm leading-6 text-muted-foreground">
            I agree to the{" "}
            <button type="button" className="font-semibold text-foreground transition hover:text-primary">
              terms and conditions
            </button>{" "}
            and understand this demo still uses mock OAuth flows.
          </label>
        </div>

        <Button type="submit" size="lg" className="w-full accent-ring">
          Create workspace account
        </Button>
      </motion.form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/8" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span className="bg-card px-3">Or continue with</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="outline" size="lg" onClick={() => handleOAuth("Google")}>
          <Chrome className="h-4 w-4" />
          Google
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => handleOAuth("GitHub")}>
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          GitHub
        </Button>
      </div>
    </AuthShell>
  );
};

export default Signup;
