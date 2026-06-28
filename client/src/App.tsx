import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import Home from "./pages/Home";
import Mint from "./pages/Mint";
import Profile from "./pages/Profile";
import About from "./pages/About";
import TopNav from "./components/TopNav";
import LoginPage from "./pages/LoginPage";
import VerifyCodePage from "./pages/VerifyCodePage";
import WalletConnectPage from "./pages/WalletConnectPage";

function AppRouter() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const [loginState, setLoginState] = useState<"idle" | "email" | "verify" | "wallet">("idle");
  const [verifyEmail, setVerifyEmail] = useState("");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login flow if not authenticated
  if (!isAuthenticated) {
    if (loginState === "email") {
      return (
        <LoginPage
          onSuccess={async (email) => {
            setVerifyEmail(email);
            setLoginState("verify");
          }}
        />
      );
    }

    if (loginState === "verify") {
      return (
        <VerifyCodePage
          email={verifyEmail}
          onSuccess={async () => {
            // Refresh auth state after successful verification
            await utils.auth.me.invalidate();
            setLoginState("wallet");
          }}
          onBack={() => setLoginState("email")}
        />
      );
    }

    if (loginState === "wallet") {
      return (
        <WalletConnectPage
          onSuccess={() => {
            setLoginState("idle");
            // Page will re-render with authenticated state
          }}
        />
      );
    }

    // Show login prompt
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Welcome</h1>
            <p className="text-muted-foreground">Sign in to access the mint experiment</p>
          </div>
          <button
            onClick={() => setLoginState("email")}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-base transition-all duration-150 bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
          >
            Login with Email
          </button>
        </div>
      </div>
    );
  }

  // Show main app if authenticated
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/mint" component={Mint} />
      <Route path="/profile" component={Profile} />
      <Route path="/about" component={About} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <div className="min-h-screen flex flex-col bg-background text-foreground">
            {isAuthenticated && <TopNav />}
            <main className="flex-1">
              <AppRouter />
            </main>
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
