import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hent aktiv session ved startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Lyt på auth-ændringer
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile(data);
    } else if (error) {
      // Profil eksisterer ikke endnu (trigger kan være langsom) – prøv igen efter 1 sek
      setTimeout(async () => {
        const { data: retryData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (retryData) setProfile(retryData);
      }, 1000);
    }
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  async function signUp(email: string, password: string, fullName: string): Promise<string | null> {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        // Ingen emailRedirectTo – email-bekræftelse håndteres i Supabase dashboard
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return 'Denne email er allerede i brug. Prøv at logge ind.';
      }
      return error.message;
    }

    // Hvis email-bekræftelse er slået til, informer brugeren
    if (data.user && !data.session) {
      return 'CHECK_EMAIL'; // Håndteres i signup-skærmen
    }

    return null;
  }

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return 'Forkert email eller adgangskode.';
      }
      if (error.message.includes('Email not confirmed')) {
        return 'Din email er ikke bekræftet. Tjek din indbakke.';
      }
      return error.message;
    }

    return null;
  }

  async function signOut() {
    try {
      const { logOutPurchases } = await import('../lib/purchases');
      await logOutPurchases();
    } catch { /* ignorér hvis RevenueCat ikke er sat op */ }
    await supabase.auth.signOut();
  }

  async function deleteAccount(): Promise<string | null> {
    if (!user) return 'Ikke logget ind.';
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      if (error) return error.message;
      await supabase.auth.signOut();
      return null;
    } catch (e: any) {
      return e.message ?? 'Ukendt fejl.';
    }
  }

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading,
      signUp, signIn, signOut, deleteAccount, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
