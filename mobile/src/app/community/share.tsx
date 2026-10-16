import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PostCard } from '@/components/community/PostCard';
import { choosePhoto } from '@/components/scan/photoPicker';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { CheckSquareIcon, ImageSquareIcon, PaperPlaneTiltIcon, SquareIcon, TrashIcon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { StackScreen } from '@/components/ui/StackScreen';
import { StoredImage } from '@/components/ui/StoredImage';
import { TextField } from '@/components/ui/TextField';
import { destinations } from '@/data/destinations';
import { cleanText, MAX_POST_LENGTH, MAX_TIP_LENGTH, splitFromAmounts, type FeedPost, type SharedTripSummary } from '@/domain/community';
import { formatShortMonthYear } from '@/domain/dates';
import type { Category } from '@/domain/types';
import { imageStore } from '@/services/imageStore';
import { prepareReceiptPhoto } from '@/services/imagePrep';
import { useAppData } from '@/state/AppDataProvider';
import { useCommunity } from '@/state/CommunityProvider';
import { colors, MIN_TOUCH_TARGET, spacing } from '@/theme/tokens';

type Mode = 'trip' | 'post';

/**
 * Share to the community (brief §7.9 and §7.10): your trip as a summary, in one tap, choosing
 * what to show; or a free post with an optional photo. Posts show your display name only.
 */
export default function ShareScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ destinationId?: string }>();
  const { trip, summary, today } = useAppData();
  const { post, myUserId } = useCommunity();
  const canShareTrip = trip !== undefined && summary !== undefined && summary.phase !== 'upcoming' && summary.spentMyr > 0;
  const [mode, setMode] = useState<Mode>(canShareTrip ? 'trip' : 'post');
  const [showAmount, setShowAmount] = useState(true);
  const [showSplit, setShowSplit] = useState(true);
  const [tip, setTip] = useState('');
  const [body, setBody] = useState('');
  const [destinationId, setDestinationId] = useState(params.destinationId ?? trip?.destinationId ?? 'tokyo');
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const sharedSummary: SharedTripSummary | null =
    canShareTrip && trip && summary
      ? {
          days: summary.totalDays,
          totalMyr: showAmount ? summary.spentMyr : null,
          split: showSplit ? splitFromAmounts(Object.fromEntries(summary.categories.map((c) => [c.category, c.spentMyr])) as Record<Category, number>) : null,
          tip: tip.trim(),
          when: formatShortMonthYear(trip.startDate),
          ...(summary.phase === 'active' ? { dayOf: summary.dayNumber } : {}),
        }
      : null;

  const addPhoto = async () => {
    setMessage(null);
    const picked = await choosePhoto();
    if (!picked) return;
    if ('error' in picked) {
      setMessage(picked.error);
      return;
    }
    try {
      const { keep } = await prepareReceiptPhoto(picked.uri);
      const id = `my-photo-${Date.now().toString(36)}`;
      if (await imageStore.save(id, keep.base64)) setPhotoId(id);
      else setMessage('There is no room on this phone for the photo.');
    } catch {
      setMessage('That photo could not be opened. Try another one.');
    }
  };

  const share = () => {
    setMessage(null);
    if (mode === 'trip') {
      if (!sharedSummary || !trip) return;
      if (tip.length > MAX_TIP_LENGTH) return setMessage(`Keep the tip under ${MAX_TIP_LENGTH} characters.`);
      if (!sharedSummary.totalMyr && !sharedSummary.split && !sharedSummary.tip) return setMessage('Show the amount, the split or a tip, so there is something to share.');
      post({ destinationId: trip.destinationId, type: 'trip_summary', body: '', tripSummary: sharedSummary });
    } else {
      const text = cleanText(body, MAX_POST_LENGTH);
      if (!text) return setMessage(body.trim() ? `Keep posts under ${MAX_POST_LENGTH} characters.` : 'Write something first.');
      post({ destinationId, type: 'post', body: text, photoId });
    }
    if (router.canGoBack()) router.back();
    else router.dismissTo('/community');
  };

  const previewPost: FeedPost | null = sharedSummary
    ? { id: 'preview', userId: myUserId, destinationId: trip?.destinationId ?? '', type: 'trip_summary', body: '', tripSummary: sharedSummary, likes: 0, likeCount: 0, likedByMe: false, commentCount: 0, createdAt: `${today}T12:00:00.000Z` }
    : null;

  return (
    <StackScreen title="Share">
      <ChoiceChips
        label="What to share"
        value={mode}
        onChange={setMode}
        choices={[
          ...(canShareTrip ? [{ value: 'trip' as const, label: 'My trip' }] : []),
          { value: 'post' as const, label: 'A tip or question' },
        ]}
      />

      {mode === 'trip' && previewPost && trip ? (
        <>
          <AppText color="muted">
            {summary?.phase === 'active'
              ? `Your ${trip.city} trip is still going, so it is shared as "so far". It counts towards the typical ${trip.city} trip once it ends.`
              : `Help others plan their ${trip.city} trip.`}
          </AppText>
          <Card style={styles.card}>
            <AppText variant="heading">Choose what to show</AppText>
            <Toggle label="How much I spent" on={showAmount} onChange={setShowAmount} />
            <Toggle label="Where the money went" on={showSplit} onChange={setShowSplit} />
            <TextField label="Your best tip (optional)" value={tip} onChangeText={setTip} placeholder="What would you tell a friend going next?" maxLength={MAX_TIP_LENGTH} multiline />
          </Card>
          <AppText variant="label" color="muted">
            Preview
          </AppText>
          <PostCard post={previewPost} preview />
        </>
      ) : null}

      {mode === 'post' ? (
        <Card style={styles.card}>
          <AppText variant="label">Destination</AppText>
          <ChoiceChips label="Destination" layout="scroll" value={destinationId} onChange={setDestinationId} choices={destinations.map((d) => ({ value: d.id, label: d.city }))} />
          <TextField label="Your tip or question" value={body} onChangeText={setBody} placeholder="Anything other Malaysian travellers should know?" maxLength={MAX_POST_LENGTH} multiline />
          {photoId ? (
            <View style={styles.photoRow}>
              <StoredImage id={photoId} alt="The photo you added" style={styles.photo} />
              <Button
                label="Remove photo"
                icon={TrashIcon}
                variant="quiet"
                onPress={() => {
                  void imageStore.remove(photoId);
                  setPhotoId(null);
                }}
              />
            </View>
          ) : (
            <Button label="Add a photo" icon={ImageSquareIcon} variant="quiet" onPress={addPhoto} />
          )}
        </Card>
      ) : null}

      {message ? (
        <AppText color="danger" role="alert">
          {message}
        </AppText>
      ) : null}
      <AppText variant="caption" color="muted">
        Posts show your display name only. Be kind: posts can be reported, and people can block you.
      </AppText>
      <Button label="Share" icon={PaperPlaneTiltIcon} variant="accent" onPress={share} />
    </StackScreen>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  const Icon = on ? CheckSquareIcon : SquareIcon;
  return (
    <PressableScale onPress={() => onChange(!on)} role="checkbox" aria-checked={on} aria-label={label} style={styles.toggle}>
      <Icon size={26} color={on ? colors.accentText : colors.textMuted} weight={on ? 'fill' : 'regular'} />
      <AppText style={styles.flex}>{label}</AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH_TARGET },
  flex: { flex: 1 },
  photoRow: { gap: spacing.sm },
  photo: { height: 180, borderRadius: 16 },
});
