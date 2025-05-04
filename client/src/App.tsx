import { useState, useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";

// Contexts
import { AuthProvider } from "./contexts/AuthContext";
import { OrganizationProvider } from "./contexts/OrganizationContext";

// Layout
import AppLayout from "./components/layout/AppLayout";

// Pages
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import MailIntake from "./pages/MailIntake";
import Pickups from "./pages/Pickups";
import Recipients from "./pages/Recipients";
import History from "./pages/History";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";
import NotFound from "./pages/not-found";

// Routes that need authentication
const protectedRoutes = [
  "/dashboard",
  "/mail-intake",
  "/pickups",
  "/recipients",
  "/history",
  "/integrations",
  "/settings",
];

function App() {
  const [location] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check auth state on mount and route changes
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // We'll use the client-side Supabase SDK to check authentication
        const { data: session } = await queryClient.fetchQuery({
          queryKey: ['/api/auth/session'],
          staleTime: 60000, // 1 minute
        });
        setIsAuthenticated(!!session);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [location]);

  // During the initial auth check, show nothing or a loading screen
  if (isAuthenticated === null) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrganizationProvider>
          <Switch>
            {/* Login route */}
            <Route path="/login">
              {isAuthenticated ? <Redirect to="/dashboard" /> : <LoginPage />}
            </Route>

            {/* Protected routes */}
            {protectedRoutes.map((route) => (
              <Route key={route} path={route}>
                {isAuthenticated ? (
                  <AppLayout>
                    {route === "/dashboard" && <Dashboard />}
                    {route === "/mail-intake" && <MailIntake />}
                    {route === "/pickups" && <Pickups />}
                    {route === "/recipients" && <Recipients />}
                    {route === "/history" && <History />}
                    {route === "/integrations" && <Integrations />}
                    {route === "/settings" && <Settings />}
                  </AppLayout>
                ) : (
                  <Redirect to="/login" />
                )}
              </Route>
            ))}

            {/* Redirect root to dashboard */}
            <Route path="/">
              <Redirect to={isAuthenticated ? "/dashboard" : "/login"} />
            </Route>

            {/* Fallback for 404 */}
            <Route>
              <NotFound />
            </Route>
          </Switch>
          <Toaster />
        </OrganizationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
