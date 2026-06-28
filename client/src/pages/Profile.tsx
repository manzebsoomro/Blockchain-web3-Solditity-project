import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { MINT_CONFIG } from "@shared/mintConstants";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowRight, Copy, Send, Loader2, Download } from "lucide-react";

export default function Profile() {
  const { isAuthenticated, user } = useAuth();
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Fetch wallet data
  const { data: wallet } = trpc.wallet.getConnected.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: balances } = trpc.wallet.getBalances.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  const formatTokens = (wei?: string) => {
    if (!wei) return "0";
    try {
      const divisor = BigInt("1000000000000000000");
      const whole = BigInt(wei) / divisor;
      return whole.toString();
    } catch {
      return "0";
    }
  };
  const formatEth = (wei?: string) => {
    if (!wei) return "0";
    try {
      const eth = Number(BigInt(wei)) / 1e18;
      return eth.toFixed(6);
    } catch {
      return "0";
    }
  };

  const handleCopyAddress = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopiedAddress(true);
      toast.success("Address copied!");
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleSendTokens = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    if (!recipientAddress || !recipientAddress.startsWith("0x")) {
      toast.error("Invalid recipient address");
      return;
    }

    if (!sendAmount || parseFloat(sendAmount) <= 0) {
      toast.error("Invalid amount");
      return;
    }

    setIsSending(true);
    try {
      // TODO: Call tRPC mutation to send tokens
      // For now, just show success message
      toast.success(`Sending ${sendAmount} tokens to ${recipientAddress.substring(0, 10)}...`);
      setRecipientAddress("");
      setSendAmount("");
    } catch (error) {
      toast.error("Failed to send tokens");
    } finally {
      setIsSending(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="container">
          <div className="max-w-2xl mx-auto bg-card text-card-foreground rounded-lg border border-border shadow-sm p-8 text-center space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Your Profile</h1>
              <p className="text-muted-foreground">
                Login to view your profile, wallet, and token balance
              </p>
            </div>
            <a
              href={getLoginUrl()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md font-medium text-base transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
            >
              Login / Connect Wallet
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Your Profile</h1>
            <p className="text-muted-foreground">Manage your wallet and token transfers</p>
          </div>

          {/* Profile Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Token Balance */}
            <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Token Balance</p>
              <p className="text-3xl font-bold text-foreground">{formatTokens(balances?.tokenWei)}</p>
              <p className="text-xs text-muted-foreground">MNT (on-chain)</p>
            </div>

            {/* ETH Balance */}
            <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">ETH Balance</p>
              <p className="text-3xl font-bold text-foreground">{formatEth(balances?.ethWei)}</p>
              <p className="text-xs text-muted-foreground">Sepolia</p>
            </div>

            {/* Profile Created */}
            <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Profile Created</p>
              <p className="text-lg font-bold text-foreground">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Loading..."}
              </p>
              <p className="text-xs text-muted-foreground">Account age</p>
            </div>
          </div>

          {/* Wallet Information */}
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-8 space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Wallet Information</h2>

            <div className="space-y-4">
              {/* Connected Email */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Connected Email</label>
                <div className="w-full px-4 py-2 rounded-md border border-input bg-muted text-foreground">
                  {user?.email || "No email"}
                </div>
              </div>

              {/* Wallet Address */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Wallet Address</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={wallet?.address || ""}
                    readOnly
                    className="flex-1 px-4 py-2 rounded-md border border-input bg-muted text-foreground font-mono text-sm"
                  />
                  <button
                    onClick={handleCopyAddress}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-150 border border-input bg-background text-foreground hover:bg-muted active:bg-muted/80"
                  >
                    <Copy className="w-4 h-4" />
                    {copiedAddress ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Export Wallet */}
              <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-150 border border-input bg-background text-foreground hover:bg-muted active:bg-muted/80">
                <Download className="w-4 h-4" />
                Export Wallet
              </button>
            </div>
          </div>

          {/* Send Tokens Section */}
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-8 space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Send Tokens</h2>

            <form onSubmit={handleSendTokens} className="space-y-4">
              {/* Recipient Address */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Recipient Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-150"
                />
                <p className="text-xs text-muted-foreground mt-1">Enter a valid Ethereum address</p>
              </div>

              {/* Amount */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Amount</label>
                <input
                  type="number"
                  placeholder="0"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-150"
                />
                <p className="text-xs text-muted-foreground mt-1">Available: {formatTokens(balances?.tokenWei)} tokens</p>
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={isSending}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-base transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Tokens
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
