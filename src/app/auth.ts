import { supabase } from "../supabaseClient";

/** Google OAuth scopes requested at sign-in. */
const GOOGLE_SCOPES =
  "openid profile email https://www.googleapis.com/auth/calendar.readonly";

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { user: data?.user, error };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data?.user, error };
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      scopes: GOOGLE_SCOPES,
    },
  });
  return { error };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function getCurrentUser() {
  return supabase.auth.getUser();
}
