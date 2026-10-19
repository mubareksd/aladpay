export const SESSION_COOKIE = "aladpay_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 14;

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}
