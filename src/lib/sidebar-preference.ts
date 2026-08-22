export const SIDEBAR_COOKIE_NAME = "facila_sidebar_state";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function getSidebarDefaultOpen(cookieValue?: string) {
  return cookieValue !== "false";
}

export function persistSidebarPreference(isOpen: boolean) {
  if (typeof document === "undefined") {
    return;
  }

  const secure = document.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${SIDEBAR_COOKIE_NAME}=${isOpen}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; samesite=lax${secure}`;
}
