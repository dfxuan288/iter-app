import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/community/Avatar';
import { SplitBars } from '@/components/community/SplitBars';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ChatCircleIcon, DotsThreeIcon, FlagIcon, HeartIcon, LightbulbIcon, ProhibitIcon, TrashIcon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { StoredImage } from '@/components/ui/StoredImage';
import { reportReasonLabels, type FeedPost, type ReportReason } from '@/domain/community';
import { formatDayMonth } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { useCommunity } from '@/state/CommunityProvider';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';

type Panel = 'closed' | 'options' | 'report' | 'block' | 'delete';

/** One post in the feed: a trip summary or a free post, with like, comments and options. */
/** `open`: shown on its own page. `preview`: shown before posting, with nothing to tap. */
export function PostCard({ post, open = false, preview = false }: { post: FeedPost; open?: boolean; preview?: boolean }) {
  const router = useRouter();
  const { userById, myUserId, toggleLike, report, block, deletePost } = useCommunity();
  const [panel, setPanel] = useState<Panel>('closed');
  const author = userById(post.userId);
  const name = author?.displayName ?? 'Traveller';
  const mine = post.userId === myUserId;
  const summary = post.tripSummary;
  const openPost = () =>
    router.push({
      pathname: '/community/[postId]',
      params: { postId: post.id },
    });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Avatar id={post.userId} name={name} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{mine ? `${name} (you)` : name}</AppText>
          <AppText variant="caption" color="muted">
            {`${author?.from ?? ''}${author?.from ? ' · ' : ''}${formatDayMonth(post.createdAt.slice(0, 10))}`}
          </AppText>
        </View>
        {preview ? null : (
          <PressableScale
            onPress={() => setPanel(panel === 'closed' ? 'options' : 'closed')}
            role="button"
            aria-label="More options for this post"
            style={styles.iconButton}>
            <DotsThreeIcon size={24} color={colors.textMuted} weight="bold" />
          </PressableScale>
        )}
      </View>

      {summary ? (
        <View style={styles.summary}>
          <View style={styles.chips}>
            <Chip tone="neutral" label={summary.dayOf ? `Day ${summary.dayOf} of ${summary.days}, so far` : `${summary.days} days`} />
            <Chip tone="plain" label={summary.when} />
          </View>
          {summary.totalMyr !== null ? (
            <AppText variant="title">{`${formatMoney(summary.totalMyr, 'MYR', { trimZeros: true })}${summary.dayOf ? ' so far' : ' in total'}`}</AppText>
          ) : null}
          {summary.split ? <SplitBars split={summary.split} limit={open ? undefined : 3} /> : null}
          {summary.tip ? (
            <View style={styles.tip}>
              <LightbulbIcon size={20} color={colors.accentText} weight="fill" />
              <AppText style={styles.flex}>{summary.tip}</AppText>
            </View>
          ) : null}
        </View>
      ) : (
        <AppText>{post.body}</AppText>
      )}
      {post.photoId ? <StoredImage id={post.photoId} alt={`Photo shared by ${name}`} style={styles.photo} /> : null}

      {preview ? null : (
        <View style={styles.actions}>
          <PressableScale
            onPress={() => toggleLike(post.id)}
            role="button"
            aria-pressed={post.likedByMe}
            aria-label={`${post.likedByMe ? 'Unlike' : 'Like'}. ${post.likeCount} likes`}
            style={styles.action}>
            <HeartIcon size={22} color={post.likedByMe ? colors.danger : colors.textMuted} weight={post.likedByMe ? 'fill' : 'regular'} />
            <AppText variant="label" color={post.likedByMe ? 'danger' : 'muted'}>
              {String(post.likeCount)}
            </AppText>
          </PressableScale>
          <PressableScale onPress={openPost} disabled={open} role="button" aria-label={`${post.commentCount} comments. Open the post`} style={styles.action}>
            <ChatCircleIcon size={22} color={colors.textMuted} />
            <AppText variant="label" color="muted">
              {String(post.commentCount)}
            </AppText>
          </PressableScale>
        </View>
      )}

      {panel === 'options' ? (
        <View style={styles.panel}>
          {mine ? (
            <Button label="Delete my post" icon={TrashIcon} variant="quiet" onPress={() => setPanel('delete')} />
          ) : (
            <>
              <Button label="Report this post" icon={FlagIcon} variant="quiet" onPress={() => setPanel('report')} />
              <Button label={`Block ${name}`} icon={ProhibitIcon} variant="quiet" onPress={() => setPanel('block')} />
            </>
          )}
        </View>
      ) : null}
      {panel === 'report' ? (
        <View style={styles.panel}>
          <AppText variant="bodyStrong">What is wrong with this post?</AppText>
          <AppText variant="caption" color="muted">
            It is hidden for you straight away. In the full app, reports go to ITER’s moderators.
          </AppText>
          {(Object.keys(reportReasonLabels) as ReportReason[]).map((reason) => (
            <Button key={reason} label={reportReasonLabels[reason]} variant="quiet" onPress={() => report(post.id, reason)} />
          ))}
          <Button label="Cancel" variant="quiet" onPress={() => setPanel('closed')} />
        </View>
      ) : null}
      {panel === 'block' ? (
        <View style={styles.panel}>
          <AppText variant="bodyStrong">{`Block ${name}?`}</AppText>
          <AppText variant="caption" color="muted">
            You will no longer see their posts or comments. You can unblock them at the bottom of the Community tab.
          </AppText>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button label="Cancel" variant="quiet" onPress={() => setPanel('closed')} />
            </View>
            <View style={styles.flex}>
              <Button label="Block" onPress={() => block(post.userId)} />
            </View>
          </View>
        </View>
      ) : null}
      {panel === 'delete' ? (
        <View style={styles.panel}>
          <AppText variant="bodyStrong">Delete this post?</AppText>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button label="Keep it" variant="quiet" onPress={() => setPanel('closed')} />
            </View>
            <View style={styles.flex}>
              <Button
                label="Delete"
                onPress={() => {
                  deletePost(post.id);
                  if (open) router.back();
                }}
              />
            </View>
          </View>
        </View>
      ) : null}

      {!open && !preview ? (
        <PressableScale onPress={openPost} role="button" aria-label={`Open ${name}’s post`} style={styles.more}>
          <AppText variant="label" color="link">
            {post.commentCount > 0 ? 'Read the comments' : 'Comment'}
          </AppText>
        </PressableScale>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  iconButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: { gap: spacing.md },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  tip: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.tile,
    backgroundColor: colors.accentSoft,
  },
  photo: { height: 200, borderRadius: radius.tile },
  actions: { flexDirection: 'row', gap: spacing.lg },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: MIN_TOUCH_TARGET,
    paddingRight: spacing.sm,
  },
  panel: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.tile,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  more: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
});
