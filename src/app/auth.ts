import { supabase } from "../supabaseClient";

export async function signUpWithEmail(email: string, password: string) {
  const { user, error } = await supabase.auth.signUp({ email, password });
  return { user, error };
}

export async function signInWithEmail(email: string, password: string) {
  const { user, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user, error };
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  return { error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export function getCurrentUser() {
  return supabase.auth.getUser();
}
