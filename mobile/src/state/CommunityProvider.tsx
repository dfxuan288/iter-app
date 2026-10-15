import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

import { communityComments, communityPosts, communityUsers } from '@/data/communitySeed';
import {
  addComment,
  addPost,
  blockUser,
  deleteMyPost,
  emptyActivity,
  reportPost,
  toggleLike,
  unblockUser,
  type CommunityActivity,
  type CommunityUser,
  type ForumComment,
  type ForumPost,
  type ReportReason,
} from '@/domain/community';
import { imageStore } from '@/services/imageStore';
import { loadActivity, newCommunityId, saveActivity } from '@/services/communityStore';
import { useAppData } from '@/state/AppDataProvider';

/** The community: sample posts plus everything this user has done, saved on the phone. */
export interface CommunityContextValue {
  activity: CommunityActivity;
  samples: { posts: readonly ForumPost[]; comments: readonly ForumComment[] };
  /** Everyone who can appear in the feed, including this user. */
  userById: (id: string) => CommunityUser | undefined;
  myUserId: string;
  toggleLike: (postId: string) => void;
  comment: (postId: string, body: string) => void;
  post: (post: Omit<ForumPost, 'id' | 'userId' | 'likes' | 'createdAt'>) => string;
  deletePost: (postId: string) => void;
  report: (postId: string, reason: ReportReason) => void;
  block: (userId: string) => void;
  unblock: (userId: string) => void;
  /** Clears everything this user did in the community ("Reset the demo"). */
  reset: () => void;
}

const CommunityContext = createContext<CommunityContextValue | null>(null);

const samples = { posts: communityPosts, comments: communityComments };

export function CommunityProvider({ children }: { children: ReactNode }) {
  const { data, today } = useAppData();
  const [activity, setActivity] = useState<CommunityActivity>(emptyActivity);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void loadActivity().then((saved) => {
      if (!active) return;
      setActivity(saved);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loaded) void saveActivity(activity);
  }, [activity, loaded]);

  const value = useMemo<CommunityContextValue>(() => {
    const me: CommunityUser = { id: data.user.id, displayName: data.user.displayName, from: 'Kuala Lumpur' };
    // New posts are dated on the app's "today" (the demo date unless it is set to the real date), at the real time of day.
    const now = () => `${today}T${new Date().toISOString().slice(11)}`;
    return {
      activity,
      samples,
      myUserId: me.id,
      userById: (id) => (id === me.id ? me : communityUsers.find((u) => u.id === id)),
      toggleLike: (postId) => setActivity((current) => toggleLike(current, postId)),
      comment: (postId, body) =>
        setActivity((current) => addComment(current, { id: newCommunityId('comment'), postId, userId: me.id, body, createdAt: now() })),
      post: (draft) => {
        const id = newCommunityId('post');
        setActivity((current) => addPost(current, { ...draft, id, userId: me.id, likes: 0, createdAt: now() }));
        return id;
      },
      deletePost: (postId) => {
        const photoId = activity.posts.find((p) => p.id === postId)?.photoId;
        setActivity((current) => deleteMyPost(current, postId));
        if (photoId) void imageStore.remove(photoId);
      },
      report: (postId, reason) => setActivity((current) => reportPost(current, postId, reason, now())),
      block: (userId) => setActivity((current) => blockUser(current, userId)),
      unblock: (userId) => setActivity((current) => unblockUser(current, userId)),
      reset: () => {
        for (const p of activity.posts) if (p.photoId) void imageStore.remove(p.photoId);
        setActivity(emptyActivity());
      },
    };
  }, [activity, data.user, today]);

  // Like the app's data, nothing is shown until saved activity is loaded, so a tap cannot overwrite it.
  if (!loaded) return null;
  return <CommunityContext value={value}>{children}</CommunityContext>;
}

export function useCommunity(): CommunityContextValue {
  const value = use(CommunityContext);
  if (!value) throw new Error('useCommunity must be used inside <CommunityProvider>');
  return value;
}
