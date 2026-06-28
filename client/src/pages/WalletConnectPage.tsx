import { useState } from "react";
import { Wallet, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface WalletConnectPageProps {
  onSuccess: () => void;
}

export default function WalletConnectPage({ onSuccess }: WalletConnectPageProps) {
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const connectWalletMutation = trpc.wallet.connect.useMutation();

  const validateAddress = (addr: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!address.trim()) {
      setError("Please enter your wallet address");
      return;
    }

    if (!validateAddress(address)) {
      setError("Invalid Ethereum address format (must be 0x + 40 hex characters)");
      return;
    }

    setIsLoading(true);

    try {
      await connectWalletMutation.mutateAsync({ address });
      toast.success("Wallet connected successfully!");
      onSuccess();
    } catch (error: any) {
      const errorMsg = error.message || "Failed to connect wallet";
      setError(errorMsg);
      toast.error(errorMsg);
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
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Connect Wallet</h1>
          <p className="text-muted-foreground">
            Enter your Ethereum wallet address to complete setup
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="address" className="text-sm font-medium text-foreground">
              Ethereum Wallet Address
            </label>
            <input
              id="address"
              type="text"
              placeholder="0x1234567890123456789012345678901234567890"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setError("");
              }}
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Must start with 0x followed by 40 hexadecimal characters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-2">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !address.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-base transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <span>Connect Wallet</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Info */}
        <div className="mt-8 space-y-4">
          <div className="p-4 rounded-lg bg-card border border-border">
            <h3 className="text-sm font-medium text-foreground mb-2">About Wallet Connection</h3>
            <p className="text-sm text-muted-foreground">
              Your wallet address is where minted tokens will be sent. Make sure you have access to this wallet.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border">
            <h3 className="text-sm font-medium text-foreground mb-2">Security Note</h3>
            <p className="text-sm text-muted-foreground">
              Your wallet address is stored securely. We never request your private keys or seed phrases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
