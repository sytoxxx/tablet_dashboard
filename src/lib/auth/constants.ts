/** Cookie + auth constants — no secrets here. */

export const ACCESS_COOKIE_NAME = "cm_session";

/** Tablet-friendly session lifetime (30 days). */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const ACCESS_CODE_ENV = "COFFEE_MORNING_ACCESS_CODE";
export const SESSION_SECRET_ENV = "COFFEE_MORNING_SESSION_SECRET";
