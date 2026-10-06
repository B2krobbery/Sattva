// Preserves the user's context across a sign-in detour: stash the current
// path (plus any selection params) in sessionStorage, then go to /login.
// Auth.tsx honors 'postLoginRedirect' on successful auth.
export function redirectToLogin(extraParams?: Record<string, string>) {
  const url = new URL(window.location.href);
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) url.searchParams.set(k, v);
  }
  const returnTo = url.pathname + url.search;
  try {
    sessionStorage.setItem('postLoginRedirect', returnTo);
  } catch {
    /* storage unavailable — user still lands back at / */
  }
  window.location.assign('/login');
}
