import { sumMinor } from '@/domain/money';
import { CATEGORIES, type Category } from '@/domain/types';

/**
 * The community feed (brief §7.9): trip summaries and free posts per destination, with likes,
 * comments, reporting and blocking. Pure functions. The sample posts are fixed; what this phone's
 * user does (posts, comments, likes, reports, blocks) is kept separately in `CommunityActivity`.
 */

export interface CommunityUser {
  id: string;
  /** Posts show the display name only (brief §7.9 safety). */
  displayName: string;
  /** Where they are from, e.g. "Penang". */
  from: string;
}

/** Whole percentages of the trip's spending per category; they add up to 100. */
export type CategorySplit = Record<Category, number>;

export interface SharedTripSummary {
  days: number;
  /** Sen. Null when the traveller chose not to show the amount. */
  totalMyr: number | null;
  /** Null when the traveller chose not to show the split. */
  split: CategorySplit | null;
  tip: string;
  /** When the trip was, e.g. "Nov 2026". */
  when: string;
  /** Shared before the trip ended ("day 7 of 10"). Not counted in a destination's typical trip. */
  dayOf?: number;
}

export interface ForumPost {
  id: string;
  userId: string;
  destinationId: string;
  type: 'trip_summary' | 'post';
  body: string;
  /** A photo kept on this phone (posts by this user only). */
  photoId?: string | null;
  tripSummary?: SharedTripSummary;
  /** Likes from other people. This user's own like is added on top. */
  likes: number;
  createdAt: string;
}

export interface ForumComment {
  id: string;
  postId: string;
  userId: string;
  body: string;
  createdAt: string;
}

export type ReportReason = 'spam' | 'harmful' | 'off_topic' | 'other';

export const reportReasonLabels: Record<ReportReason, string> = {
  spam: 'Spam or advertising',
  harmful: 'Rude, hateful or harmful',
  off_topic: 'Not about travel',
  other: 'Something else',
};

/** Everything this phone's user has done in the community. */
export interface CommunityActivity {
  posts: ForumPost[];
  comments: ForumComment[];
  liked: string[];
  reports: { postId: string; reason: ReportReason; createdAt: string }[];
  blocked: string[];
}

export const emptyActivity = (): CommunityActivity => ({ posts: [], comments: [], liked: [], reports: [], blocked: [] });

export interface FeedPost extends ForumPost {
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
}

/** Posts for a destination as this user sees them: without reported posts or anything from blocked people. */
export function feedFor(
  destinationId: string,
  samples: { posts: readonly ForumPost[]; comments: readonly ForumComment[] },
  activity: CommunityActivity,
): FeedPost[] {
  const hidden = new Set(activity.reports.map((r) => r.postId));
  const comments = visibleComments([...samples.comments, ...activity.comments], activity);
  return [...samples.posts, ...activity.posts]
    .filter((post) => post.destinationId === destinationId && !hidden.has(post.id) && !activity.blocked.includes(post.userId))
    .map((post) => {
      const likedByMe = activity.liked.includes(post.id);
      return { ...post, likedByMe, likeCount: post.likes + (likedByMe ? 1 : 0), commentCount: comments.filter((c) => c.postId === post.id).length };
    });
}

export function visibleComments(comments: readonly ForumComment[], activity: Pick<CommunityActivity, 'blocked'>): ForumComment[] {
  return comments.filter((comment) => !activity.blocked.includes(comment.userId));
}

export type FeedOrder = 'latest' | 'top';

/** Latest: newest first. Top: most liked and discussed first (a comment counts as two likes). */
export function sortFeed(posts: readonly FeedPost[], order: FeedOrder): FeedPost[] {
  const score = (post: FeedPost) => post.likeCount + post.commentCount * 2;
  return [...posts].sort((a, b) => (order === 'top' ? score(b) - score(a) : 0) || b.createdAt.localeCompare(a.createdAt));
}

/** Percentages that add up to exactly 100 (largest remainder), from amounts per category. */
export function splitFromAmounts(amounts: Record<Category, number>): CategorySplit | null {
  const total = sumMinor(CATEGORIES.map((c) => Math.max(0, amounts[c])));
  if (total <= 0) return null;
  const exact = CATEGORIES.map((c) => ({ category: c, value: (Math.max(0, amounts[c]) * 100) / total }));
  const split = Object.fromEntries(exact.map((e) => [e.category, Math.floor(e.value)])) as CategorySplit;
  let missing = 100 - sumMinor(Object.values(split));
  for (const e of [...exact].sort((a, b) => (b.value % 1) - (a.value % 1))) {
    if (missing <= 0) break;
    split[e.category] += 1;
    missing -= 1;
  }
  return split;
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[mid] as number) : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
};

export interface DestinationStats {
  /** Finished trips with an amount and a split, used for the typical trip. */
  tripCount: number;
  /** Trip summaries with a tip, plus free posts. */
  tipCount: number;
  typicalDays: number;
  /** Sen, rounded to RM 100 so it reads as the estimate it is. */
  typicalTotalMyr: number;
  perDayMyr: number;
  split: CategorySplit;
}

/** Fewer finished trips than this and no "typical trip" is shown, rather than a misleading one. */
export const MIN_TRIPS_FOR_STATS = 3;

/**
 * "Typical 5-day Tokyo trip: RM 2,000 · Food 49%" (brief §7.9, without hotel or flights), worked out from the trip
 * summaries people shared: the usual length, the usual spend per day, and the overall split.
 */
export function destinationStats(posts: readonly FeedPost[]): DestinationStats | null {
  const summaries = posts.filter((p) => p.type === 'trip_summary' && p.tripSummary);
  const finished = summaries
    .map((p) => p.tripSummary as SharedTripSummary)
    .filter((s): s is SharedTripSummary & { totalMyr: number; split: CategorySplit } => s.dayOf === undefined && s.totalMyr !== null && s.split !== null && s.days > 0);
  if (finished.length < MIN_TRIPS_FOR_STATS) return null;

  const typicalDays = Math.round(median(finished.map((s) => s.days)));
  const perDayMyr = Math.round(median(finished.map((s) => s.totalMyr / s.days)));
  const weighted = Object.fromEntries(CATEGORIES.map((c) => [c, sumMinor(finished.map((s) => s.totalMyr * s.split[c]))])) as Record<Category, number>;
  return {
    tripCount: finished.length,
    tipCount: summaries.filter((p) => p.tripSummary?.tip.trim()).length + posts.filter((p) => p.type === 'post').length,
    typicalDays,
    typicalTotalMyr: Math.round((perDayMyr * typicalDays) / 10000) * 10000,
    perDayMyr,
    split: splitFromAmounts(weighted) as CategorySplit,
  };
}

/** The categories in a split, biggest first. */
export function rankedSplit(split: CategorySplit): { category: Category; percent: number }[] {
  return CATEGORIES.map((category) => ({ category, percent: split[category] })).sort((a, b) => b.percent - a.percent);
}

// What the user does: each returns new activity and leaves the old one untouched.

export function toggleLike(activity: CommunityActivity, postId: string): CommunityActivity {
  const liked = activity.liked.includes(postId) ? activity.liked.filter((id) => id !== postId) : [...activity.liked, postId];
  return { ...activity, liked };
}

export function addComment(activity: CommunityActivity, comment: ForumComment): CommunityActivity {
  return { ...activity, comments: [...activity.comments, comment] };
}

export function addPost(activity: CommunityActivity, post: ForumPost): CommunityActivity {
  return { ...activity, posts: [...activity.posts, post] };
}

export function deleteMyPost(activity: CommunityActivity, postId: string): CommunityActivity {
  return { ...activity, posts: activity.posts.filter((p) => p.id !== postId), comments: activity.comments.filter((c) => c.postId !== postId) };
}

export function reportPost(activity: CommunityActivity, postId: string, reason: ReportReason, now: string): CommunityActivity {
  if (activity.reports.some((r) => r.postId === postId)) return activity;
  return { ...activity, reports: [...activity.reports, { postId, reason, createdAt: now }] };
}

export function blockUser(activity: CommunityActivity, userId: string): CommunityActivity {
  return activity.blocked.includes(userId) ? activity : { ...activity, blocked: [...activity.blocked, userId] };
}

export function unblockUser(activity: CommunityActivity, userId: string): CommunityActivity {
  return { ...activity, blocked: activity.blocked.filter((id) => id !== userId) };
}

/** Comments must say something, and stay short enough to read on a phone. */
export const MAX_COMMENT_LENGTH = 400;
export const MAX_POST_LENGTH = 1000;
export const MAX_TIP_LENGTH = 200;

export function cleanText(text: string, max: number): string | null {
  const trimmed = text.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}
