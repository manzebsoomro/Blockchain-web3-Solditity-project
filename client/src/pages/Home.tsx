import { Copy, Download, Check, ArrowRight, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { MINT_CONFIG } from "@shared/mintConstants";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { data: wallet } = trpc.wallet.getConnected.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const generateWalletMutation = trpc.wallet.generateWallet.useMutation();
  const exportPrivateKeyQuery = trpc.wallet.exportPrivateKey.useQuery(undefined, {
    enabled: false,
  });

  // Auto-generate wallet if user is authenticated but doesn't have one
  useEffect(() => {
    if (isAuthenticated && !wallet && !generateWalletMutation.isPending) {
      generateWalletMutation.mutate();
    }
  }, [isAuthenticated, wallet, generateWalletMutation]);

  const handleCopyAddress = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
    }
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleExportPrivateKey = async () => {
    if (!wallet?.address) return;
    
    try {
      setIsExporting(true);
      const result = await exportPrivateKeyQuery.refetch();
      
      if (result.data && result.data.privateKey) {
        // Create file content
        const content = `Wallet Private Key Export
Generated: ${new Date().toISOString()}

Address: ${result.data.address}
Private Key: ${result.data.privateKey}

⚠️ SECURITY WARNING ⚠️
Never share this private key with anyone!
Whoever has access to this key has full control over your wallet.
`;
        
        // Create blob and download
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `wallet-export-${wallet.address.slice(-4)}.txt`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log("[Export] Private key exported successfully");
      }
    } catch (error) {
      console.error("[Export] Error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const mintSteps = [
    {
      number: 1,
      title: "Connect Wallet",
      description: "Link your Ethereum wallet to your account",
    },
    {
      number: 2,
      title: "Verify Email",
      description: "Confirm your email address to enable minting",
    },
    {
      number: 3,
      title: "Generate Prompt",
      description: "Create a mint request email in the Mint section",
    },
    {
      number: 4,
      title: "Send Email",
      description: "Send the prompt email to trigger the mint",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Email-Triggered Token Minting
          </h1>
          <p className="text-lg text-muted-foreground">
            A revolutionary experiment in decentralized token distribution powered by email verification
          </p>
        </div>

        {/* Auth Status Section */}
        {!isAuthenticated ? (
          <div className="max-w-2xl mx-auto bg-card text-card-foreground rounded-lg border border-border shadow-sm p-8 text-center space-y-6 mb-12">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Get Started</h2>
              <p className="text-muted-foreground">
                Login with your email to connect your wallet and start minting tokens
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
        ) : (
          <>
            {/* Wallet Dashboard Card */}
            <div className="max-w-2xl mx-auto bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 md:p-8 space-y-6 mb-12">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Wallet Dashboard</h2>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                  <CheckCircle2 className="w-4 h-4" />
                  Connected
                </div>
              </div>

              {/* Wallet Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Wallet Address</p>
                    <p className="font-mono text-foreground font-medium">
                      {wallet?.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : (generateWalletMutation.isPending ? "Generating..." : "Loading...")}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyAddress}
                    disabled={!wallet?.address || generateWalletMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted/80 active:bg-muted/70"
                  >
                    {copiedAddress ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                {user?.email && (
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Verified Email</p>
                      <p className="font-mono text-foreground font-medium text-sm">{user.email}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopyAddress}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
                >
                  <Copy className="w-4 h-4" />
                  Copy Address
                </button>
                <button
                  onClick={handleExportPrivateKey}
                  disabled={!wallet?.address || isExporting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed border border-border text-foreground hover:bg-muted active:bg-muted/50"
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? "Exporting..." : "Export"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Experiment Explanation */}
      <div className="container py-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-8 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">About This Experiment</h2>
            <div className="space-y-4 text-foreground leading-relaxed">
              <p>
                This is an experimental platform that demonstrates a novel approach to token distribution 
                on Ethereum. Instead of traditional minting mechanisms, users can trigger token creation 
                through verified email prompts.
              </p>
              <p>
                By combining email verification with blockchain execution, we create a unique bridge between 
                traditional communication and decentralized finance. Each mint request is cryptographically 
                verified and executed on-chain, ensuring security and transparency.
              </p>
              <p>
                This experiment showcases how email-based authentication can be integrated with smart contracts 
                to create novel user experiences in Web3.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How to Mint Section */}
      {isAuthenticated && (
        <div className="container py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8">How to Mint</h2>
            <div className="space-y-4">
              {mintSteps.map((step, index) => (
                <div key={step.number} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      {step.number}
                    </div>
                    {index < mintSteps.length - 1 && (
                      <div className="w-0.5 h-12 bg-border mt-2"></div>
                    )}
                  </div>
                  <div className="pb-8 pt-1">
                    <h3 className="font-semibold text-foreground text-lg">{step.title}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <a href="/mint" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md font-medium text-base transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80">
                Start Minting
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Mint Stats Section */}
      <div className="container py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-8">Mint Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status */}
            <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 flex flex-col gap-2 hover:shadow-md transition-shadow duration-200">
              <span className="text-sm text-muted-foreground font-medium">Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-2xl font-bold text-foreground">{MINT_CONFIG.status}</span>
              </div>
              <span className="text-xs text-muted-foreground mt-1">Minting enabled</span>
            </div>

            {/* Current Minted */}
            <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 flex flex-col gap-2 hover:shadow-md transition-shadow duration-200">
              <span className="text-sm text-muted-foreground font-medium">Current Minted</span>
              <span className="text-2xl font-bold text-foreground">{MINT_CONFIG.currentMintedDisplay}</span>
              <span className="text-xs text-muted-foreground mt-1">tokens</span>
            </div>

            {/* Total Supply */}
            <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 flex flex-col gap-2 hover:shadow-md transition-shadow duration-200">
              <span className="text-sm text-muted-foreground font-medium">Total Supply</span>
              <span className="text-2xl font-bold text-foreground">{MINT_CONFIG.totalSupplyDisplay}</span>
              <span className="text-xs text-muted-foreground mt-1">tokens</span>
            </div>

            {/* Supply Left */}
            <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 flex flex-col gap-2 hover:shadow-md transition-shadow duration-200">
              <span className="text-sm text-muted-foreground font-medium">Supply Left</span>
              <span className="text-2xl font-bold text-foreground">{MINT_CONFIG.supplyLeftDisplay}</span>
              <span className="text-xs text-muted-foreground mt-1">tokens</span>
            </div>

            {/* Mint Amount */}
            <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 flex flex-col gap-2 hover:shadow-md transition-shadow duration-200">
              <span className="text-sm text-muted-foreground font-medium">Mint Amount</span>
              <span className="text-2xl font-bold text-foreground">{MINT_CONFIG.mintAmountDisplay}</span>
              <span className="text-xs text-muted-foreground mt-1">per mint</span>
            </div>

            {/* Max Mints per Email */}
            <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 flex flex-col gap-2 hover:shadow-md transition-shadow duration-200">
              <span className="text-sm text-muted-foreground font-medium">Max Mints per Email</span>
              <span className="text-2xl font-bold text-foreground">{MINT_CONFIG.maxMintsPerEmail}</span>
              <span className="text-xs text-muted-foreground mt-1">mints</span>
            </div>

            {/* Wallet Funding */}
            <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 flex flex-col gap-2 hover:shadow-md transition-shadow duration-200">
              <span className="text-sm text-muted-foreground font-medium">Wallet Funding</span>
              <span className="text-2xl font-bold text-foreground">{MINT_CONFIG.walletFundingDisplay}</span>
              <span className="text-xs text-muted-foreground mt-1">available</span>
            </div>

            {/* Prompt Expiry */}
            <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 flex flex-col gap-2 hover:shadow-md transition-shadow duration-200">
              <span className="text-sm text-muted-foreground font-medium">Prompt Expiry</span>
              <span className="text-2xl font-bold text-foreground">{MINT_CONFIG.promptExpiry} min</span>
              <span className="text-xs text-muted-foreground mt-1">per request</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {isAuthenticated && (
        <div className="container py-12">
          <div className="max-w-2xl mx-auto bg-card text-card-foreground rounded-lg border border-border shadow-sm p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Ready to Start?</h2>
            <p className="text-muted-foreground">
              Your wallet is connected and verified. Begin minting tokens now.
            </p>
            <div className="flex gap-4 justify-center pt-4">
              <a href="/mint" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md font-medium text-base transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80">
                Go to Mint
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
