import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";

// Auth provider and Protected Route
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/lib/protected-route";

// Contexts
import { OrganizationProvider } from "./contexts/OrganizationContext";

// Layout
import AppLayout from "./components/layout/AppLayout";

// Pages
import AuthPage from "./pages/auth-page";
import Dashboard from "./pages/Dashboard";
import MailIntake from "./pages/MailIntake";
import Pickups from "./pages/Pickups";
import Recipients from "./pages/Recipients";
import History from "./pages/History";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";
import NotFound from "./pages/not-found";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrganizationProvider>
          <Switch>
            {/* Auth page */}
            <Route path="/auth" component={AuthPage} />

            {/* Protected routes */}
            <ProtectedRoute path="/" component={Dashboard} />
            <ProtectedRoute path="/dashboard" component={Dashboard} />
            <ProtectedRoute path="/mail-intake" component={MailIntake} />
            <ProtectedRoute path="/pickups" component={Pickups} />
            <ProtectedRoute path="/recipients" component={Recipients} />
            <ProtectedRoute path="/history" component={History} />
            <ProtectedRoute path="/integrations" component={Integrations} />
            <ProtectedRoute path="/settings" component={Settings} />

            {/* Fallback for 404 */}
            <Route component={NotFound} />
          </Switch>
          
          <Toaster />
        </OrganizationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
