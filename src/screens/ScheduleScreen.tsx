// VIAXE — the athlete's v2 schedule: upcoming prescriptions (assigned by
// their coach, discovered via scope=mine — no known ids required) and
// recent sessions (legacy workouts adapted on read, merged with native v2
// results, exactly as the server returns them — including any uncertainty
// flags on a legacy record, never hidden).

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { fetchMyUpcoming, fetchV2Sessions } from '../lib/scheduleV2';
import type { V2Prescription, V2ListItem } from '../types/sessionV2';
import { colors, spacing, radii, type as T } from '../theme/grit';
import { GritText } from '../components/grit';
import PressableScale from '../components/motion/PressableScale';

function workBlockName(session: V2ListItem['session']): string {
  if (!session) return 'Session';
  const work = session.blocks.find((b) => b.kind === 'work') ?? session.blocks[0];
  return work?.name ?? 'Session';
}

export default function ScheduleScreen() {
  const nav = useNavigation() as any;
  const store = useAppStore();
  const [upcoming, setUpcoming] = useState<V2Prescription[] | null>(null);
  const [recent, setRecent] = useState<V2ListItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [up, hist] = await Promise.all([
      fetchMyUpcoming({ limit: 20 }),
      store.clientId ? fetchV2Sessions(store.clientId, { limit: 20 }) : Promise.resolve({ items: [], nextCursor: null, nextCursorNative: null }),
    ]);
    setUpcoming(up.prescriptions);
    setRecent(hist.items);
  }, [store.clientId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const loading = upcoming === null || recent === null;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.header}>
          <PressableScale onPress={() => nav.goBack()} accessibilityLabel="Back" style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </PressableScale>
          <GritText variant="title" style={styles.headerTitle}>Schedule</GritText>
          <View style={{ width: 38 }} />
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.ember} size="large" /></View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.chalk} />}
          >
            <GritText variant="label" style={styles.sectionLabel}>Scheduled</GritText>
            {upcoming!.length === 0 ? (
              <View style={styles.empty}><Text style={styles.emptyTxt}>Nothing scheduled — check back once your coach assigns a session.</Text></View>
            ) : (
              upcoming!.map((p) => (
                <PressableScale
                  key={`${p.programmeId}:${p.planItemId}:${p.rev}`}
                  onPress={() => nav.navigate('CompleteSession', { prescription: p })}
                  haptic="light"
                  accessibilityLabel={`${p.title}, scheduled ${p.scheduledDate || 'unscheduled'}. Open.`}
                >
                  <View style={styles.card}>
                    <View style={styles.cardHead}>
                      <GritText variant="bodyStrong" style={styles.cardTitle}>{p.title}</GritText>
                      <View style={styles.pillScheduled}>
                        <Text style={styles.pillScheduledTxt}>{p.scheduledDate || 'Unscheduled'}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardMeta}>
                      {p.sport} · {p.sessionType} · plan item {p.planItemId.slice(0, 12)}… rev {p.rev}
                    </Text>
                    <Text style={styles.cardBlocks}>
                      {p.blocks.map((b) => b.name).join(' → ')}
                    </Text>
                  </View>
                </PressableScale>
              ))
            )}

            <GritText variant="label" style={[styles.sectionLabel, { marginTop: spacing[6] }]}>Recent</GritText>
            {recent!.length === 0 ? (
              <View style={styles.empty}><Text style={styles.emptyTxt}>No sessions logged yet.</Text></View>
            ) : (
              recent!.map((item) => {
                const isLegacy = item.source.collection === 'workouts';
                const key = item.session?.sessionId ?? item.source.id ?? Math.random().toString();
                if (!item.mappable) {
                  return (
                    <View key={key} style={[styles.card, styles.cardUncertain]}>
                      <View style={styles.cardHead}>
                        <GritText variant="bodyStrong" style={styles.cardTitle}>Unrecognised record</GritText>
                        <View style={styles.pillUncertain}><Text style={styles.pillUncertainTxt}>Needs review</Text></View>
                      </View>
                      <Text style={styles.cardMeta}>This history item could not be read as a valid session — {item.flags[0]?.code || 'unknown reason'}.</Text>
                    </View>
                  );
                }
                return (
                  <PressableScale
                    key={key}
                    onPress={() => nav.navigate('SessionResult', { item })}
                    haptic="light"
                    accessibilityLabel={`${workBlockName(item.session)}, ${item.session?.date}. Open.`}
                  >
                    <View style={styles.card}>
                      <View style={styles.cardHead}>
                        <GritText variant="bodyStrong" style={styles.cardTitle}>{workBlockName(item.session)}</GritText>
                        <View style={isLegacy ? styles.pillLegacy : styles.pillCompleted}>
                          <Text style={isLegacy ? styles.pillLegacyTxt : styles.pillCompletedTxt}>
                            {isLegacy ? 'Legacy · adapted' : 'Completed'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.cardMeta}>
                        {item.session?.date} · {item.session?.sport} / {item.session?.sessionType}
                        {item.session?.rpe ? ` · RPE ${item.session.rpe}/10` : ''}
                      </Text>
                      {item.flags.length > 0 && (
                        <Text style={styles.cardFlag}>⚠ {item.flags.length} uncertainty flag{item.flags.length > 1 ? 's' : ''} — {item.flags[0].code}</Text>
                      )}
                    </View>
                  </PressableScale>
                );
              })
            )}
            <View style={{ height: spacing[10] }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.asphalt },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[3] },
  backBtn: { width: 38, height: 38, borderRadius: radii.control, backgroundColor: colors.iron, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontFamily: 'BarlowCondensed-Black', fontSize: 20, color: colors.chalk },
  headerTitle: { color: colors.chalk },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: spacing[5], paddingBottom: spacing[10] },
  sectionLabel: { color: colors.muted, marginBottom: spacing[3] },
  empty: { backgroundColor: colors.iron, borderRadius: radii.card, padding: spacing[5], marginBottom: spacing[3] },
  emptyTxt: { ...T.body, color: colors.concrete },

  card: { backgroundColor: colors.iron, borderRadius: radii.card, padding: spacing[4], marginBottom: spacing[3] },
  cardUncertain: { borderWidth: 1, borderColor: 'rgba(255,75,34,0.3)' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing[2], marginBottom: spacing[1] },
  cardTitle: { color: colors.chalk, flex: 1 },
  cardMeta: { fontFamily: 'IBMPlexSans-Medium', fontSize: 12, color: colors.concrete, marginBottom: spacing[1] },
  cardBlocks: { fontFamily: 'IBMPlexSans-Regular', fontSize: 12, color: colors.muted },
  cardFlag: { fontFamily: 'IBMPlexSans-SemiBold', fontSize: 11, color: colors.ember, marginTop: spacing[1] },

  pillScheduled: { backgroundColor: 'rgba(215,255,69,0.14)', borderWidth: 1, borderColor: 'rgba(215,255,69,0.3)', borderRadius: radii.round, paddingHorizontal: 9, paddingVertical: 3 },
  pillScheduledTxt: { fontFamily: 'IBMPlexSans-Bold', fontSize: 10, color: colors.acid, letterSpacing: 0.4 },
  pillCompleted: { backgroundColor: 'rgba(233,229,218,0.1)', borderRadius: radii.round, paddingHorizontal: 9, paddingVertical: 3 },
  pillCompletedTxt: { fontFamily: 'IBMPlexSans-Bold', fontSize: 10, color: colors.chalk, letterSpacing: 0.4 },
  pillLegacy: { backgroundColor: 'rgba(255,75,34,0.12)', borderWidth: 1, borderColor: 'rgba(255,75,34,0.3)', borderRadius: radii.round, paddingHorizontal: 9, paddingVertical: 3 },
  pillLegacyTxt: { fontFamily: 'IBMPlexSans-Bold', fontSize: 10, color: colors.ember, letterSpacing: 0.4 },
  pillUncertain: { backgroundColor: 'rgba(255,181,71,0.14)', borderWidth: 1, borderColor: 'rgba(255,181,71,0.3)', borderRadius: radii.round, paddingHorizontal: 9, paddingVertical: 3 },
  pillUncertainTxt: { fontFamily: 'IBMPlexSans-Bold', fontSize: 10, color: colors.warning, letterSpacing: 0.4 },
});
