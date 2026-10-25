// packages/domain/src/access/canOpen.ts

export type AccessReason =
  | 'UNAVAILABLE' // Unpublished or inactive
  | 'ENTITLED' // Active entitlement opens
  | 'FREE_COURSE' // Free Access course opens
  | 'FREE_ITEM' // Item-level free flag (chapter, free exam set, COC sample) opens
  | 'LOCKED'; // Otherwise locked

export interface AccessDecision {
  canOpen: boolean;
  reason: AccessReason;
}

export interface StudentAccessContext {
  id?: string;
  /** List or Set of course IDs the student currently has active entitlements for */
  activeCourseIds?: readonly string[] | Set<string>;
  /** Optional entitlement predicate */
  hasActiveEntitlement?: (courseId: string) => boolean;
}

export interface AccessibleItem {
  courseId?: string | null;
  /** If false or status is not published, the item is unavailable */
  isActive?: boolean;
  status?: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | string;
  /** True if course itself is 100% Free Access */
  isCourseFree?: boolean;
  /** Item-level free flag: chapter isFree, free exam set, COC sample, etc. */
  isItemFree?: boolean;
  isFreeTrial?: boolean;
  isSample?: boolean;
}

/**
 * Universal Access Control Function used across server guard and mobile client.
 * Evaluation Order:
 * 1. Unpublished or inactive means unavailable.
 * 2. Active entitlement opens.
 * 3. Free Access course opens.
 * 4. Item-level free flag (chapter, free exam set, COC sample) opens.
 * 5. Otherwise locked.
 */
export function canOpen(
  student: StudentAccessContext | null | undefined,
  item: AccessibleItem,
): AccessDecision {
  // 1. Unpublished or inactive means unavailable
  const isStatusPublished = !item.status || item.status === 'PUBLISHED';
  const isActive = item.isActive !== false;
  if (!isStatusPublished || !isActive) {
    return { canOpen: false, reason: 'UNAVAILABLE' };
  }

  // 2. Active entitlement opens
  if (item.courseId) {
    const hasEntitlement =
      Boolean(student?.hasActiveEntitlement?.(item.courseId)) ||
      (student?.activeCourseIds instanceof Set
        ? student.activeCourseIds.has(item.courseId)
        : Array.isArray(student?.activeCourseIds)
          ? student.activeCourseIds.includes(item.courseId)
          : false);

    if (hasEntitlement) {
      return { canOpen: true, reason: 'ENTITLED' };
    }
  }

  // 3. Free Access course opens
  if (item.isCourseFree) {
    return { canOpen: true, reason: 'FREE_COURSE' };
  }

  // 4. Item-level free flag (chapter, free exam set, COC sample) opens
  if (item.isItemFree || item.isFreeTrial || item.isSample) {
    return { canOpen: true, reason: 'FREE_ITEM' };
  }

  // 5. Otherwise locked
  return { canOpen: false, reason: 'LOCKED' };
}
