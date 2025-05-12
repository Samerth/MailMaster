import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { UserProfile } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

type AuthContextType = {
  user: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<UserProfile, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<UserProfile, Error, RegisterData>;
};

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Listen for authentication state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        // Fetch user profile after sign in
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      } else if (event === 'SIGNED_OUT') {
        // Clear user data after sign out
        queryClient.setQueryData(['/api/user'], null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<UserProfile | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        // Get session from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          return null;
        }
        
        // Use the session token to get the user profile from our API
        const res = await fetch('/api/user', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            return null;
          }
          throw new Error('Failed to fetch user profile');
        }
        
        return await res.json();
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      }
    },
    refetchOnWindowFocus: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      // First authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!data.session) {
        throw new Error('No session returned from authentication');
      }
      
      // Then fetch the user profile from our API
      const res = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${data.session.access_token}`
        }
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch user profile');
      }
      
      return await res.json();
    },
    onSuccess: (user: UserProfile) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.firstName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      // First register with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!data.user) {
        throw new Error('No user returned from registration');
      }
      
      // Then create a profile in our database
      const profileRes = await fetch('/api/register_profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.session?.access_token || ''}`
        },
        body: JSON.stringify({
          userId: data.user.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
        }),
      });
      
      if (!profileRes.ok) {
        throw new Error('Failed to create user profile');
      }
      
      return await profileRes.json();
    },
    onSuccess: (user: UserProfile) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.firstName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not register user",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message || "Could not log out",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}