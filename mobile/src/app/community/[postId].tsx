import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/community/Avatar';
import { PostCard } from '@/components/community/PostCard';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PaperPlaneTiltIcon } from '@/components/ui/icons';
import { StackScreen } from '@/components/ui/StackScreen';
import { TextField } from '@/components/ui/TextField';
import { cleanText, feedFor, MAX_COMMENT_LENGTH, visibleComments } from '@/domain/community';
import { formatDayMonth } from '@/domain/dates';
import { useCommunity } from '@/state/CommunityProvider';
import { spacing } from '@/theme/tokens';

/** One post with its comments, and a box to add one. */
export default function PostScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { activity, samples, userById, myUserId, comment } = useCommunity();
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const source = [...samples.posts, ...activity.posts].find((p) => p.id === postId);
  const post = source ? feedFor(source.destinationId, samples, activity).find((p) => p.id === postId) : undefined;

  if (!post) {
    return (
      <StackScreen title="Post">
        <Card style={styles.card}>
          <AppText variant="heading">This post is not available</AppText>
          <AppText color="muted">It may have been deleted, reported, or written by someone you blocked.</AppText>
          <Button label="Back to Community" onPress={() => router.dismissTo('/community')} />
        </Card>
      </StackScreen>
    );
  }

  const comments = visibleComments([...samples.comments, ...activity.comments], activity)
    .filter((c) => c.postId === post.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const send = () => {
    const body = cleanText(text, MAX_COMMENT_LENGTH);
    if (!body) {
      setProblem(text.trim() ? `Keep comments under ${MAX_COMMENT_LENGTH} characters.` : 'Write something first.');
      return;
    }
    comment(post.id, body);
    setText('');
    setProblem(null);
  };

  return (
    <StackScreen title={userById(post.userId)?.displayName ?? 'Post'}>
      <PostCard post={post} open />
      <Card style={styles.card}>
        <AppText variant="heading">{comments.length === 0 ? 'No comments yet' : `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`}</AppText>
        {comments.map((c) => {
          const author = userById(c.userId);
          return (
            <View key={c.id} style={styles.comment}>
              <Avatar id={c.userId} name={author?.displayName ?? '?'} size={32} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{`${author?.displayName ?? 'Traveller'}${c.userId === myUserId ? ' (you)' : ''}`}</AppText>
                <AppText>{c.body}</AppText>
                <AppText variant="caption" color="muted">
                  {formatDayMonth(c.createdAt.slice(0, 10))}
                </AppText>
              </View>
            </View>
          );
        })}
        <TextField label="Add a comment" value={text} onChangeText={setText} placeholder="Be kind and helpful" maxLength={MAX_COMMENT_LENGTH} error={problem ?? undefined} multiline />
        <Button label="Post comment" icon={PaperPlaneTiltIcon} onPress={send} />
      </Card>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  comment: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xxs },
});
