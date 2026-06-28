import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { MINT_CONFIG } from "@shared/mintConstants";
import { MINT_TIERS } from "@shared/mintTiers";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowRight, Copy, Loader2, RefreshCw, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export default function Mint() {
  const { isAuthenticated } = useAuth();
  const [copiedRequestId, setCopiedRequestId] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [selectedAmount, setSelectedAmount] = useState<number>(MINT_TIERS[0].tokens);

  // Fetch latest requests
  const { data: requests = [], isLoading: loadingRequests } = trpc.mint.getLatestRequests.useQuery(
    { limit: 10 },
    { enabled: isAuthenticated }
  );

  const utils = trpc.useUtils();

  // Generate mint request mutation
  const generateMutation = trpc.mint.generateRequest.useMutation({
    onSuccess: (data: any) => {
      setCurrentRequest(data);
      toast.success("Mint request generated!");
      utils.mint.getLatestRequests.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to generate mint request");
    },
  });

  // Calculate time remaining
  useEffect(() => {
    if (!currentRequest?.expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const expiry = new Date(currentRequest.expiresAt);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Expired");
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentRequest]);

  const handleCopyRequestId = () => {
    if (currentRequest?.requestId) {
      navigator.clipboard.writeText(currentRequest.requestId);
      setCopiedRequestId(true);
      toast.success("Request ID copied!");
      setTimeout(() => setCopiedRequestId(false), 2000);
    }
  };

  const handleCopyEmail = () => {
    if (currentRequest?.promptContent) {
      navigator.clipboard.writeText(currentRequest.promptContent);
      setCopiedEmail(true);
      toast.success("Email content copied!");
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleGenerateRequest = () => {
    generateMutation.mutate({ amount: selectedAmount });
  };

  const selectedTier = MINT_TIERS.find((t) => t.tokens === selectedAmount) ?? MINT_TIERS[0];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="container">
          <div className="max-w-2xl mx-auto bg-card text-card-foreground rounded-lg border border-border shadow-sm p-8 text-center space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Mint Tokens</h1>
              <p className="text-muted-foreground">
                Login to generate mint prompts and start minting tokens on Ethereum
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
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Generate Mint Prompt</h1>
          <p className="text-muted-foreground">Create and send email prompts to trigger token minting</p>
        </div>

        {/* Mint Configuration Section */}
        <div className="max-w-4xl mx-auto bg-card text-card-foreground rounded-lg border border-border shadow-sm p-8 space-y-6 mb-12">
          <h2 className="text-xl font-semibold text-foreground">Mint Configuration</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Chain */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Chain</label>
              <div className="w-full px-3 py-2 rounded-md border border-input bg-muted text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-150 cursor-not-allowed">
                {MINT_CONFIG.chain}
              </div>
              <p className="text-xs text-muted-foreground">Fixed - cannot be changed</p>
            </div>

            {/* Mint Amount */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Mint Amount</label>
              <select
                value={selectedAmount}
                onChange={(e) => setSelectedAmount(Number(e.target.value))}
                disabled={generateMutation.isPending}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-150"
              >
                {MINT_TIERS.map((t) => (
                  <option key={t.tokens} value={t.tokens}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Required payment: {selectedTier.ethCost} ETH (send a small gas buffer extra — only this exact amount is deducted)</p>
            </div>

            {/* Expiry */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Expiry</label>
              <div className="w-full px-3 py-2 rounded-md border border-input bg-muted text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-150 cursor-not-allowed">
                {MINT_CONFIG.promptExpiryDisplay}
              </div>
              <p className="text-xs text-muted-foreground">Fixed - cannot be changed</p>
            </div>
          </div>
        </div>

        {/* Prompt Email Preview */}
        {currentRequest && (
          <div className="max-w-4xl mx-auto bg-card text-card-foreground rounded-lg border border-border shadow-sm p-8 space-y-6 mb-12">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Prompt Email Preview</h2>
              {timeLeft && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Expires in: <span className="font-mono font-semibold text-foreground">{timeLeft}</span></span>
                </div>
              )}
            </div>

            <div className="bg-muted rounded-lg p-6 space-y-4 font-mono text-sm max-h-64 overflow-y-auto">
              <div className="whitespace-pre-wrap text-muted-foreground">{currentRequest.promptContent}</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopyEmail}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-150 bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
              >
                <Copy className="w-4 h-4" />
                {copiedEmail ? "Copied!" : "Copy Email"}
              </button>
              <button
                onClick={handleCopyRequestId}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-150 border border-input bg-background text-foreground hover:bg-muted active:bg-muted/80"
              >
                <Copy className="w-4 h-4" />
                {copiedRequestId ? "Copied!" : "Copy Request ID"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-background rounded p-3">
                <p className="text-muted-foreground text-xs mb-1">Request ID</p>
                <p className="font-mono text-foreground break-all">{currentRequest.requestId}</p>
              </div>
              <div className="bg-background rounded p-3">
                <p className="text-muted-foreground text-xs mb-1">Signature</p>
                <p className="font-mono text-foreground break-all text-xs">{currentRequest.signature.substring(0, 20)}...</p>
              </div>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="max-w-4xl mx-auto mb-12">
          <button
            onClick={handleGenerateRequest}
            disabled={generateMutation.isPending}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-base transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Generate Prompt Email
              </>
            )}
          </button>
        </div>

        {/* Latest Requests Table */}
        <div className="max-w-4xl mx-auto bg-card text-card-foreground rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="p-8 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">Latest Requests</h2>
          </div>

          {loadingRequests ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No mint requests yet. Generate one to get started!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Request ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Amount</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Created</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req: any, idx: number) => (
                    <tr key={idx} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-foreground">{req.id.substring(0, 20)}...</td>
                      <td className="px-6 py-4 text-sm text-foreground">{req.amount.toLocaleString()} tokens</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col gap-1">
                          <div className="inline-flex items-center gap-2">
                            {(req.status === "minted" || req.status === "success") && (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span className="text-green-600 capitalize">{req.status}</span>
                              </>
                            )}
                            {["pending", "paid", "swept", "minting"].includes(req.status) && (
                              <>
                                <Clock className="w-4 h-4 text-yellow-500" />
                                <span className="text-yellow-600 capitalize">{req.status}</span>
                              </>
                            )}
                            {(req.status === "failed" || req.status === "expired") && (
                              <>
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <span className="text-red-600 capitalize">{req.status}</span>
                              </>
                            )}
                          </div>
                          {req.failureReason && (
                            <span className="text-xs text-red-500" title={req.failureReason}>
                              {req.failureReason}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {req.isExpired ? (
                          <span className="text-red-600">Expired</span>
                        ) : (
                          <span className="text-green-600">{new Date(req.expiresAt).toLocaleTimeString()}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
