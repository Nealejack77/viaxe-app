// VIAXE — a completed session's result, explicitly showing the prescription
// revision it's linked to (or that it was unplanned), and any uncertainty
// flags carried over from a legacy-adapted record.

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, radii, type as T } from '../theme/grit';
import { GritText } from '../components/grit';
import PressableScale from '../components/motion/PressableScale';
import { SessionBlockList } from '../components/SessionBlocks';
import type { V2ListItem } from '../types/sessionV2';

export default function SessionResultScreen() {
  const nav = useNavigation() as any;
  const route = useRoute() as any;
  const item: V2ListItem = route.params.item;
  const justCompleted: boolean = !!route.params.justCompleted;
  const session = item.session;
  const isLegacy = item.source.collection === 'workouts';

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.header}>
          <PressableScale onPress={() => nav.goBack()} accessibilityLabel="Back" style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </PressableScale>
          <GritText variant="title" style={styles.headerTitle}>Session</GritText>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {justCompleted && (
            <View style={styles.successBanner}>
              <Text style={styles.successTxt}>✓ Session saved</Text>
            </View>
          )}

          {!session ? (
            <View style={styles.card}>
              <GritText variant="bodyStrong" style={{ color: colors.ember }}>This record could not be read as a valid session.</GritText>
              {item.flags.map((f, i) => (
                <Text key={i} style={styles.flagDetail}>⚠ {f.code} — {f.detail}</Text>
              ))}
            </View>
          ) : (
            <>
              <View style={styles.titleRow}>
                <GritText variant="displaySmall" style={styles.title}>
                  {(session.blocks.find((b) => b.kind === 'work') ?? session.blocks[0])?.name ?? 'Session'}
                </GritText>
                <View style={isLegacy ? styles.pillLegacy : styles.pillCompleted}>
                  <Text style={isLegacy ? styles.pillLegacyTxt : styles.pillCompletedTxt}>
                    {isLegacy ? 'Legacy · adapted' : 'Completed'}
                  </Text>
                </View>
              </View>
              <Text style={styles.sub}>
                {session.date} · {session.sport} / {session.sessionType}
                {session.rpe != null ? ` · RPE ${session.rpe}/10` : ''}
              </Text>

              {/* The explicit link this screen exists to show: the exact
                  prescription revision this result was performed against —
                  or an honest statement that there wasn't one. */}
              <View style={styles.linkCard}>
                {session.prescriptionRef ? (
                  <>
                    <Text style={styles.linkLabel}>LINKED TO PRESCRIPTION</Text>
                    <Text style={styles.linkValue}>
                      programme {session.prescriptionRef.programmeId.slice(0, 12)}… · plan item{' '}
                      {session.prescriptionRef.planItemId.slice(0, 12)}… · rev {session.prescriptionRef.rev}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.linkValueMuted}>
                    {isLegacy ? 'No prescription link — legacy data has no stable plan-item id to link to.' : 'Unplanned session — not linked to a prescription.'}
                  </Text>
                )}
              </View>

              <GritText variant="label" style={styles.sectionLabel}>Blocks</GritText>
              <SessionBlockList blocks={session.blocks} />

              {session.notes ? (
                <>
                  <GritText variant="label" style={styles.sectionLabel}>Notes</GritText>
                  <Text style={styles.notes}>{session.notes}</Text>
                </>
              ) : null}

              {item.flags.length > 0 && (
                <>
                  <GritText variant="label" style={[styles.sectionLabel, { color: colors.ember }]}>Uncertainty</GritText>
                  <View style={styles.flagsBox}>
                    {item.flags.map((f, i) => (
                      <Text key={i} style={styles.flagDetail}>⚠ {f.code} — {f.detail}</Text>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
          <View style={{ height: spacing[10] }} />
        </ScrollView>
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
  scroll: { paddingHorizontal: spacing[5], paddingBottom: spacing[10] },

  successBanner: { backgroundColor: 'rgba(215,255,69,0.14)', borderWidth: 1, borderColor: 'rgba(215,255,69,0.3)', borderRadius: radii.control, padding: spacing[3], marginBottom: spacing[5] },
  successTxt: { color: colors.acid, fontFamily: 'IBMPlexSans-Bold', fontSize: 13 },

  card: { backgroundColor: colors.iron, borderRadius: radii.card, padding: spacing[5] },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing[2], marginBottom: spacing[1] },
  title: { color: colors.chalk, flex: 1 },
  sub: { ...T.body, color: colors.concrete, marginBottom: spacing[5] },

  linkCard: { backgroundColor: colors.iron, borderRadius: radii.card, padding: spacing[4], marginBottom: spacing[6] },
  linkLabel: { fontFamily: 'IBMPlexSans-Bold', fontSize: 10, letterSpacing: 0.8, color: colors.muted, marginBottom: spacing[1] },
  linkValue: { fontFamily: 'IBMPlexSans-SemiBold', fontSize: 13, color: colors.acid },
  linkValueMuted: { fontFamily: 'IBMPlexSans-Medium', fontSize: 13, color: colors.concrete },

  sectionLabel: { color: colors.muted, marginBottom: spacing[3], marginTop: spacing[2] },
  notes: { ...T.body, color: colors.chalk, marginBottom: spacing[4] },
  flagsBox: { gap: spacing[2] },
  flagDetail: { fontFamily: 'IBMPlexSans-Medium', fontSize: 12, color: colors.ember, lineHeight: 18 },

  pillCompleted: { backgroundColor: 'rgba(233,229,218,0.1)', borderRadius: radii.round, paddingHorizontal: 9, paddingVertical: 3 },
  pillCompletedTxt: { fontFamily: 'IBMPlexSans-Bold', fontSize: 10, color: colors.chalk, letterSpacing: 0.4 },
  pillLegacy: { backgroundColor: 'rgba(255,75,34,0.12)', borderWidth: 1, borderColor: 'rgba(255,75,34,0.3)', borderRadius: radii.round, paddingHorizontal: 9, paddingVertical: 3 },
  pillLegacyTxt: { fontFamily: 'IBMPlexSans-Bold', fontSize: 10, color: colors.ember, letterSpacing: 0.4 },
});
