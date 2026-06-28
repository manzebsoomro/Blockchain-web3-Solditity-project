export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">About This Experiment</h1>
            <p className="text-muted-foreground">Learn how the email-based minting system works</p>
          </div>

          {/* System Overview */}
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">How It Works</h2>
            <p className="text-foreground leading-relaxed">
              This is an experimental email-triggered token minting system built on Ethereum. 
              Users can trigger token mints by sending a specially formatted email, which is 
              then processed by our system to mint tokens directly to their connected wallet.
            </p>
          </div>

          {/* Token Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Token Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Token Name:</span>
                  <span className="font-medium text-foreground">Mint Token</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Symbol:</span>
                  <span className="font-medium text-foreground">MINT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network:</span>
                  <span className="font-medium text-foreground">Ethereum</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Supply:</span>
                  <span className="font-medium text-foreground">1,000,000,000</span>
                </div>
              </div>
            </div>

            <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Mint Limits</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mint Amount:</span>
                  <span className="font-medium text-foreground">10,000 tokens</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Mints per Email:</span>
                  <span className="font-medium text-foreground">10 mints</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prompt Expiry:</span>
                  <span className="font-medium text-foreground">5 minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cooldown Period:</span>
                  <span className="font-medium text-foreground">1 hour</span>
                </div>
              </div>
            </div>
          </div>

          {/* Email Verification */}
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Email Verification</h2>
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium text-foreground mb-1">Trigger Email</h4>
                <p className="text-muted-foreground">
                  Send a mint request email to our system with your wallet address and desired amount.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Verified Email</h4>
                <p className="text-muted-foreground">
                  Only verified email addresses can trigger mints. Verification is performed once during account setup.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Security</h4>
                <p className="text-muted-foreground">
                  Each mint request is cryptographically signed and verified before execution on-chain.
                </p>
              </div>
            </div>
          </div>

          {/* Destination Wallet */}
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Destination Wallet</h2>
            <p className="text-foreground text-sm leading-relaxed">
              Minted tokens are sent directly to your connected Ethereum wallet. You can view, transfer, 
              or trade these tokens using any standard Ethereum wallet or DEX. Your wallet address is 
              verified during the account setup process and cannot be changed after minting begins.
            </p>
            <div className="bg-muted p-4 rounded-md text-sm">
              <p className="text-muted-foreground mb-2">Your Wallet Address:</p>
              <p className="font-mono text-foreground">0x1234567890abcdef1234567890abcdef12345678</p>
            </div>
          </div>

          {/* Full System Explanation */}
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Complete System Explanation</h2>
            <div className="space-y-4 text-sm text-foreground leading-relaxed">
              <div>
                <h4 className="font-medium text-foreground mb-2">1. Account Setup</h4>
                <p className="text-muted-foreground">
                  Create an account and connect your Ethereum wallet. Verify your email address 
                  to enable minting capabilities.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">2. Mint Request</h4>
                <p className="text-muted-foreground">
                  Generate a mint prompt email and send it to our system. The email contains 
                  your wallet address and authentication token.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">3. Verification</h4>
                <p className="text-muted-foreground">
                  Our system verifies the email signature, checks your mint limits, and validates 
                  the request against your account.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">4. On-Chain Execution</h4>
                <p className="text-muted-foreground">
                  Once verified, a transaction is submitted to the Ethereum network to mint 
                  tokens to your wallet.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">5. Confirmation</h4>
                <p className="text-muted-foreground">
                  You receive a confirmation email and can see the minted tokens in your wallet 
                  once the transaction is confirmed on-chain.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
