import { useState, useEffect } from "react";
import { CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface VerifyCodePageProps {
  email: string;
  onSuccess: () => void;
  onBack: () => void;
}

export default function VerifyCodePage({ email, onSuccess, onBack }: VerifyCodePageProps) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  const verifyCodeMutation = trpc.email.verifyCode.useMutation();

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setIsLoading(true);

    try {
      await verifyCodeMutation.mutateAsync({ email, code });
      toast.success("Email verified successfully!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Invalid verification code");
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
            <CheckCircle2 className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Verify Email</h1>
          <p className="text-muted-foreground">
            Enter the 6-digit code sent to <br />
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium text-foreground">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={isLoading}
              maxLength={6}
              className="w-full px-4 py-3 text-center text-2xl font-mono rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed tracking-widest"
            />
          </div>

          {/* Timer */}
          <div className="text-center text-sm text-muted-foreground">
            Code expires in: <span className="font-mono font-medium text-foreground">{formatTime(timeLeft)}</span>
          </div>

          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-base transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Code"
            )}
          </button>
        </form>

        {/* Back Button */}
        <button
          onClick={onBack}
          disabled={isLoading}
          className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed bg-muted text-foreground hover:bg-muted/80 active:bg-muted/60"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Email
        </button>

        {/* Info */}
        <div className="mt-8 p-4 rounded-lg bg-card border border-border">
          <p className="text-sm text-muted-foreground">
            Didn't receive the code? Check your spam folder or request a new code.
          </p>
        </div>
      </div>
    </div>
  );
}
