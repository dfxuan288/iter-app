import AsyncStorage from '@react-native-async-storage/async-storage';

import { emptyActivity, type CommunityActivity } from '@/domain/community';
import type { KeyValueStorage } from '@/services/appDataStore';

/**
 * Saves this user's community activity (posts, comments, likes, reports, blocks) on the phone.
 * The prototype has no shared server (the tutor confirmed one is not needed), so other people's
 * posts are the fixed samples and only this user's own actions are stored. Nothing here throws.
 */

const STORAGE_KEY = 'iter.community.v1';

const isList = (value: unknown): value is unknown[] => Array.isArray(value);

export async function loadActivity(storage: KeyValueStorage = AsyncStorage): Promise<CommunityActivity> {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (!raw) return emptyActivity();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const empty = emptyActivity();
    return {
      posts: isList(parsed.posts) ? (parsed.posts as CommunityActivity['posts']) : empty.posts,
      comments: isList(parsed.comments) ? (parsed.comments as CommunityActivity['comments']) : empty.comments,
      liked: isList(parsed.liked) ? parsed.liked.filter((id): id is string => typeof id === 'string') : empty.liked,
      reports: isList(parsed.reports) ? (parsed.reports as CommunityActivity['reports']) : empty.reports,
      blocked: isList(parsed.blocked) ? parsed.blocked.filter((id): id is string => typeof id === 'string') : empty.blocked,
    };
  } catch {
    return emptyActivity();
  }
}

export async function saveActivity(activity: CommunityActivity, storage: KeyValueStorage = AsyncStorage): Promise<boolean> {
  try {
    await storage.setItem(STORAGE_KEY, JSON.stringify(activity));
    return true;
  } catch {
    return false;
  }
}

export function newCommunityId(prefix: 'post' | 'comment'): string {
  return `my-${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
