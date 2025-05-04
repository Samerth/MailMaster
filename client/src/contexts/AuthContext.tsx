import { createContext, useState, useEffect, ReactNode } from "react";
import supabase from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@shared/schema";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signIn: async () => {},
  signOut: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check active session and get user profile
    const getSession = async () => {
      setIsLoading(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth session error:", error);
          setUser(null);
          return;
        }
        
        if (session?.user) {
          // Fetch user profile
          const { data, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('userId', session.user.id)
            .single();
            
          if (profileError) {
            console.error("User profile error:", profileError);
            setUser(null);
            return;
          }
          
          setUser(data as UserProfile);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Session check error:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          // Fetch user profile when auth state changes
          const { data, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('userId', session.user.id)
            .single();
            
          if (profileError) {
            console.error("User profile error:", profileError);
            setUser(null);
            return;
          }
          
          setUser(data as UserProfile);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Authentication failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      if (data?.user) {
        // Fetch user profile after successful sign in
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('userId', data.user.id)
          .single();
          
        if (profileError) {
          toast({
            title: "Profile error",
            description: "Could not retrieve user profile",
            variant: "destructive",
          });
          throw profileError;
        }
        
        setUser(profileData as UserProfile);
        
        toast({
          title: "Welcome back!",
          description: `Signed in as ${profileData.firstName} ${profileData.lastName}`,
        });
      }
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast({
          title: "Sign out failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
      
      setUser(null);
      toast({
        title: "Signed out",
        description: "You have been successfully signed out",
      });
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
