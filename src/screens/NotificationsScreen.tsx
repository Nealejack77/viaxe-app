import React, { useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { useTheme, Tokens } from '../context/ThemeContext';
import { useAppStore, AppNotification } from '../store/useAppStore';
import {
  XIcon, ZapIcon, MessageIcon, ClipboardIcon, FlameIcon, AwardIcon, CheckIcon, BellIcon,
} from '../components/Icons';
import { RootStackParamList } from '../../App';

type Props = StackScreenProps<RootStackParamList, 'Notifications'>;

// Deep-link key → tab screen
const LINK_TO_TAB: Record<string, string> = {
  coach: 'Coach',
  train: 'Train',
  progress: 'Progress',
  home: 'Home',
};

const TYPE_META: Record<string, { Icon: any; colorKey: 'red' | 'gold' | 'green' | 'purple' }> = {
  message:          { Icon: MessageIcon,   colorKey: 'red' },
  coach_feedback:   { Icon: CheckIcon,     colorKey: 'green' },
  checkin_reviewed: { Icon: CheckIcon,     colorKey: 'green' },
  checkin_reminder: { Icon: ClipboardIcon, colorKey: 'gold' },
  workout_reminder: { Icon: ZapIcon,       colorKey: 'red' },
  program_assigned: { Icon: ClipboardIcon, colorKey: 'purple' },
  streak:           { Icon: FlameIcon,     colorKey: 'gold' },
  milestone:        { Icon: AwardIcon,     colorKey: 'gold' },
};

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const makeStyles = (t: Tokens) => StyleSheet.create({
  container:   { flex: 1, backgroundColor: t.bg },
  header:      { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: t.border },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: t.text, textAlign: 'center', letterSpacing: -0.3 },
  closeBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, alignItems: 'center', justifyContent: 'center' },
  markAll:     { fontSize: 11, fontWeight: '700', color: t.red, width: 70 },

  row:         { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.border },
  rowUnread:   { backgroundColor: t.redDim },
  iconWrap:    { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  title:       { fontSize: 13.5, fontWeight: '700', color: t.text, letterSpacing: -0.2 },
  body:        { fontSize: 12.5, color: t.textSec, lineHeight: 18, marginTop: 2 },
  time:        { fontSize: 10.5, color: t.textMuted, marginTop: 4 },
  unreadDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: t.red, marginTop: 8 },

  empty:       { alignItems: 'center', paddingTop: 90, gap: 14, paddingHorizontal: 40 },
  emptyTitle:  { fontSize: 15, fontWeight: '800', color: t.text },
  emptyDesc:   { fontSize: 13, color: t.textMuted, textAlign: 'center', lineHeight: 19 },
});

export default function NotificationsScreen({ navigation }: Props) {
  const { t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const store = useAppStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => { store.loadNotifications(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await store.loadNotifications();
    setRefreshing(false);
  };

  const open = (n: AppNotification) => {
    if (!n.readAt) store.markNotificationsRead([n.id]);
    if (n.link === 'checkin') {
      navigation.navigate('CheckIn');
      return;
    }
    const tab = LINK_TO_TAB[n.link] || 'Home';
    navigation.navigate('Tabs', { screen: tab } as any);
  };

  const colorFor = (key: 'red' | 'gold' | 'green' | 'purple') => t[key];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => store.markNotificationsRead()} disabled={store.unreadNotifications === 0}>
          <Text style={[s.markAll, store.unreadNotifications === 0 && { opacity: 0.3 }]}>Mark all read</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
          <XIcon size={14} color={t.text} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.red} />}
      >
        {store.notifications.length === 0 ? (
          <View style={s.empty}>
            <BellIcon size={40} color={t.textMuted} strokeWidth={1.5} />
            <Text style={s.emptyTitle}>No notifications yet</Text>
            <Text style={s.emptyDesc}>
              Workout reminders, coach messages and check-in nudges will show up here.
            </Text>
          </View>
        ) : (
          store.notifications.map(n => {
            const meta = TYPE_META[n.type] || { Icon: BellIcon, colorKey: 'red' as const };
            const color = colorFor(meta.colorKey);
            return (
              <TouchableOpacity key={n.id} style={[s.row, !n.readAt && s.rowUnread]} onPress={() => open(n)} activeOpacity={0.7}>
                <View style={[s.iconWrap, { backgroundColor: `${color}1A` }]}>
                  <meta.Icon size={17} color={color} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>{n.title}</Text>
                  {n.body ? <Text style={s.body}>{n.body}</Text> : null}
                  <Text style={s.time}>{timeAgo(n.createdAt)} ago</Text>
                </View>
                {!n.readAt && <View style={s.unreadDot} />}
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
