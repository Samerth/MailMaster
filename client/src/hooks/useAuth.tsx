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
    // Check for existing session on mount
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("Found existing session");
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    };
    
    checkSession();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event);
      
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
      console.log("Attempting to login with:", credentials.email);
      
      // First authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
      
      if (error) {
        console.error("Supabase auth error:", error);
        throw new Error(error.message);
      }
      
      console.log("Supabase auth successful, user:", data.user?.id);
      
      if (!data.session) {
        throw new Error('No session returned from authentication');
      }
      
      // Then fetch the user profile from our API
      console.log("Fetching user profile with token");
      const res = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${data.session.access_token}`
        }
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("API error:", res.status, errorText);
        throw new Error(`Failed to fetch user profile: ${res.status} ${errorText}`);
      }
      
      const userData = await res.json();
      console.log("User profile fetched successfully:", userData.id);
      return userData;
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
      console.log("Attempting to register user:", userData.email);
      
      try {
        // First register with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              first_name: userData.firstName,
              last_name: userData.lastName,
            }
          }
        });
        
        if (error) {
          console.error("Supabase signup error:", error);
          throw new Error(error.message);
        }
        
        console.log("Supabase signup successful:", data);
        
        if (!data.user) {
          throw new Error('No user returned from registration');
        }
        
        // For email confirmation flows, we need to handle the case where
        // the user needs to confirm their email
        if (!data.session) {
          console.log("Registration successful, email confirmation required");
          // Create a temporary profile until they confirm email
          const tempProfile = {
            id: 0, // Temporary ID
            userId: data.user.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            organizationId: 1,
            mailRoomId: null,
            role: 'recipient',
            isActive: false, // Not active until email confirmation
            createdAt: new Date().toISOString(),
            phone: null,
            department: null,
            location: null,
            password: '',
            updatedAt: null,
            settings: {}
          };
          
          // We'll inform the user they need to verify their email
          toast({
            title: "Please check your email",
            description: "A confirmation link has been sent to your email address.",
          });
          
          return tempProfile;
        }
        
        console.log("Creating user profile with Supabase ID:", data.user.id);
        
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
        
        const responseText = await profileRes.text();
        
        if (!profileRes.ok) {
          console.error("Error creating profile:", profileRes.status, responseText);
          throw new Error(`Failed to create user profile: ${responseText}`);
        }
        
        try {
          return JSON.parse(responseText);
        } catch (parseError) {
          console.error("Error parsing profile response:", parseError);
          throw new Error("Invalid response from server");
        }
      } catch (error) {
        console.error("Registration error:", error);
        throw error;
      }
    },
    onSuccess: (user: UserProfile) => {
      // For email verification flows, we don't want to set the user as logged in
      // until they've verified their email
      if (user.id !== 0) {
        // Only set the user data if this isn't a temporary profile
        queryClient.setQueryData(["/api/user"], user);
        toast({
          title: "Registration successful",
          description: `Welcome, ${user.firstName}!`,
        });
      } else {
        // For email verification flows, we've already shown a toast in the mutationFn
        console.log("Waiting for email verification");
      }
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