/** Computes an access expiry timestamp "duration" from now (MONTHLY → +1 month, YEARLY → +1 year). */
export function computeAccessExpiresAt(duration: 'MONTHLY' | 'YEARLY', from: Date): Date {
  const expiresAt = new Date(from);
  if (duration === 'MONTHLY') {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  } else {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }
  return expiresAt;
}

/** Returns whether a student currently has an active subscription (unexpired access window). */
export function hasActiveAccess(accessExpiresAt: Date | null): boolean {
  return !!accessExpiresAt && accessExpiresAt.getTime() > Date.now();
}

/** A student's access grant only unlocks courses within their enrolled category. */
export function hasActiveAccessForCategory(
  student: { accessExpiresAt: Date | null; enrolledCategoryId: string | null },
  courseCategoryId: string | null,
): boolean {
  if (!hasActiveAccess(student.accessExpiresAt)) {
    return false;
  }
  // A student with no enrolled category, or a course with no category, can't be matched.
  return !!student.enrolledCategoryId && student.enrolledCategoryId === courseCategoryId;
}
