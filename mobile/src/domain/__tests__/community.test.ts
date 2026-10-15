import { communityComments, communityPosts, communityUsers } from '@/data/communitySeed';

import {
  addComment,
  addPost,
  blockUser,
  cleanText,
  deleteMyPost,
  destinationStats,
  emptyActivity,
  feedFor,
  rankedSplit,
  reportPost,
  sortFeed,
  splitFromAmounts,
  toggleLike,
  unblockUser,
  type ForumPost,
} from '../community';
import { CATEGORIES } from '../types';

const samples = { posts: communityPosts, comments: communityComments };
const tokyo = () => feedFor('tokyo', samples, emptyActivity());

describe('the sample community', () => {
  it('has 30 travellers and at least five trip summaries for each of the brief’s destinations', () => {
    expect(communityUsers).toHaveLength(30);
    for (const destination of ['tokyo', 'bangkok', 'seoul', 'bali', 'singapore']) {
      expect(communityPosts.filter((p) => p.destinationId === destination && p.type === 'trip_summary').length).toBeGreaterThanOrEqual(5);
    }
  });

  it('has splits that add up to 100%, and only real users and posts', () => {
    const userIds = new Set(communityUsers.map((u) => u.id));
    const postIds = new Set(communityPosts.map((p) => p.id));
    for (const post of communityPosts) {
      expect(userIds.has(post.userId)).toBe(true);
      if (post.tripSummary?.split) expect(Object.values(post.tripSummary.split).reduce((a, b) => a + b, 0)).toBe(100);
    }
    for (const comment of communityComments) {
      expect(userIds.has(comment.userId)).toBe(true);
      expect(postIds.has(comment.postId)).toBe(true);
    }
  });
});

describe('destinationStats', () => {
  it('gives the brief’s typical Tokyo trip: 5 days, RM 2,900, Food 34%, Stay 31%', () => {
    const stats = destinationStats(tokyo());
    expect(stats).toMatchObject({ typicalDays: 5, typicalTotalMyr: 290000, tripCount: 6, tipCount: 9 });
    expect(stats?.split.food).toBe(34);
    expect(stats?.split.stay).toBe(31);
    expect(Object.values(stats?.split ?? {}).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('works for every sample destination', () => {
    for (const destination of ['bangkok', 'seoul', 'bali', 'singapore']) {
      expect(destinationStats(feedFor(destination, samples, emptyActivity()))?.tripCount).toBe(6);
    }
  });

  it('shows nothing rather than a misleading figure when too few trips are shared', () => {
    expect(destinationStats(feedFor('paris', samples, emptyActivity()))).toBeNull();
  });

  it('leaves out trips shared before they ended, and summaries without amounts', () => {
    const halfway: ForumPost = {
      id: 'mine',
      userId: 'user-amanda',
      destinationId: 'tokyo',
      type: 'trip_summary',
      body: '',
      tripSummary: { days: 10, totalMyr: 99_000_00, split: { food: 100, transport: 0, stay: 0, activities: 0, shopping: 0 }, tip: '', when: 'Nov 2026', dayOf: 7 },
      likes: 0,
      createdAt: '2026-11-15T10:00:00.000Z',
    };
    const feed = feedFor('tokyo', samples, addPost(emptyActivity(), halfway));
    expect(destinationStats(feed)?.typicalTotalMyr).toBe(290000);
  });
});

describe('splitFromAmounts', () => {
  it('turns amounts into whole percentages that add up to exactly 100', () => {
    const split = splitFromAmounts({ food: 1, transport: 1, stay: 1, activities: 0, shopping: 0 });
    expect(Object.values(split ?? {}).reduce((a, b) => a + b, 0)).toBe(100);
    expect(splitFromAmounts({ food: 0, transport: 0, stay: 0, activities: 0, shopping: 0 })).toBeNull();
  });

  it('ranks categories biggest first', () => {
    const ranked = rankedSplit({ food: 34, transport: 11, stay: 31, activities: 10, shopping: 14 });
    expect(ranked.map((r) => r.category)).toEqual(['food', 'stay', 'shopping', 'transport', 'activities']);
    expect(ranked).toHaveLength(CATEGORIES.length);
  });
});

describe('the feed', () => {
  it('sorts by newest, or by likes and comments', () => {
    const latest = sortFeed(tokyo(), 'latest');
    expect(latest[0]?.id).toBe('cp-tokyo-post-3');
    const top = sortFeed(tokyo(), 'top');
    expect(top[0]?.id).toBe('cp-tokyo-trip-6');
  });

  it('counts this user’s like and comments', () => {
    let activity = toggleLike(emptyActivity(), 'cp-tokyo-trip-1');
    activity = addComment(activity, { id: 'c', postId: 'cp-tokyo-trip-1', userId: 'user-amanda', body: 'Great tip', createdAt: 'now' });
    const post = feedFor('tokyo', samples, activity).find((p) => p.id === 'cp-tokyo-trip-1');
    expect(post).toMatchObject({ likeCount: 43, likedByMe: true, commentCount: 2 });
    expect(toggleLike(activity, 'cp-tokyo-trip-1').liked).toEqual([]);
  });

  it('hides a reported post, only once per post', () => {
    const activity = reportPost(reportPost(emptyActivity(), 'cp-tokyo-trip-1', 'spam', 'now'), 'cp-tokyo-trip-1', 'other', 'later');
    expect(activity.reports).toHaveLength(1);
    expect(feedFor('tokyo', samples, activity).some((p) => p.id === 'cp-tokyo-trip-1')).toBe(false);
  });

  it('hides everything from a blocked person, and brings it back when unblocked', () => {
    const blocked = blockUser(emptyActivity(), 'cu-2');
    const feed = feedFor('tokyo', samples, blocked);
    expect(feed.some((p) => p.userId === 'cu-2')).toBe(false);
    // Their comment on someone else's post is hidden too.
    expect(feed.find((p) => p.id === 'cp-tokyo-post-1')?.commentCount).toBe(1);
    expect(feedFor('tokyo', samples, unblockUser(blocked, 'cu-2')).some((p) => p.userId === 'cu-2')).toBe(true);
  });

  it('lets the user delete their own post and its comments', () => {
    const post: ForumPost = { id: 'mine', userId: 'user-amanda', destinationId: 'tokyo', type: 'post', body: 'Hello', likes: 0, createdAt: 'now' };
    let activity = addPost(emptyActivity(), post);
    activity = addComment(activity, { id: 'c', postId: 'mine', userId: 'cu-1', body: 'Hi', createdAt: 'now' });
    expect(deleteMyPost(activity, 'mine')).toMatchObject({ posts: [], comments: [] });
  });

  it('accepts only text that says something and is not too long', () => {
    expect(cleanText('  Nice  ', 10)).toBe('Nice');
    expect(cleanText('   ', 10)).toBeNull();
    expect(cleanText('x'.repeat(11), 10)).toBeNull();
  });
});

describe('formatShortMonthYear', () => {
  it('writes the month short', () => {
    const { formatShortMonthYear } = jest.requireActual<typeof import('../dates')>('../dates');
    expect(formatShortMonthYear('2026-11-09')).toBe('Nov 2026');
    expect(formatShortMonthYear('2027-01-31')).toBe('Jan 2027');
  });
});
