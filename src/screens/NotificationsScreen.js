import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Linking
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { functions } from '../firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

// Same APK link used on the Home screen's "Download App" menu item.
const APK_DOWNLOAD_URL = 'https://firebasestorage.googleapis.com/v0/b/taskearn-e5c35.firebasestorage.app/o/TaskEarn.apk?alt=media';

const TYPE_ICONS = {
  app_update: 'download-outline',
  promotion: 'gift-outline',
  custom: 'bullhorn-outline',
  team_reminder: 'account-group-outline',
  team_leader_promotion: 'trophy-outline',
  target_update: 'flag-checkered',
};

const TYPE_COLORS = {
  app_update: '#3B82F6',
  promotion: '#EAB308',
  custom: '#8B5CF6',
  team_reminder: '#22C55E',
  team_leader_promotion: '#F59E0B',
  target_update: '#EF4444',
};

export default function NotificationsScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const getMyNotifications = httpsCallable(functions, 'getMyNotifications');
        const res = await getMyNotifications();
        setNotifications((res.data && res.data.notifications) || []);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }

      try {
        const markRead = httpsCallable(functions, 'markNotificationsRead');
        await markRead();
      } catch (err) {
        // Non-critical -- badge just won't clear this time.
      }
    };
    load();
  }, []);

  const formatDate = (ms) => {
    if (!ms) return '';
    return new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleDownload = () => {
    Linking.openURL(APK_DOWNLOAD_URL).catch(() => {});
  };

  const renderItem = ({ item }) => {
    const iconName = TYPE_ICONS[item.type] || 'bell-outline';
    const iconColor = TYPE_COLORS[item.type] || '#3B82F6';

    return (
      <View style={[currentStyles.card, item.unread && currentStyles.cardUnread]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconCircle, { backgroundColor: iconColor + '1A' }]}>
            <MaterialCommunityIcons name={iconName} size={18} color={iconColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={currentStyles.title}>{item.title}</Text>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
          {item.unread && <View style={styles.unreadDot} />}
        </View>

        <Text style={currentStyles.message}>{item.message}</Text>

        {item.type === 'promotion' && item.promoDetails && item.promoDetails.bonusPercent > 0 && (
          <View style={currentStyles.promoBox}>
            <Text style={styles.promoBonusText}>+{item.promoDetails.bonusPercent}% Bonus</Text>
            {item.promoDetails.startDate && item.promoDetails.endDate && (
              <Text style={styles.promoDatesText}>
                {new Date(item.promoDetails.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                {' - '}
                {new Date(item.promoDetails.endDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            )}
          </View>
        )}

        {item.actionType === 'download_apk' && (
          <TouchableOpacity style={styles.actionBtn} onPress={handleDownload}>
            <Feather name="download" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>Update Now</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={currentStyles.container} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <View style={currentStyles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.loaderContainer}>
          <MaterialCommunityIcons name="bell-off-outline" size={32} color={isDarkMode ? "#334155" : "#CBD5E1"} />
          <Text style={styles.emptyText}>No notifications yet.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 20 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#1E293B' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  cardUnread: { borderColor: '#3B82F6', borderWidth: 1.5 },
  title: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  message: { fontSize: 12, color: '#64748B', marginTop: 8, lineHeight: 18, fontWeight: '500' },
  promoBox: { backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, marginTop: 10 }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#FFFFFF' },
  card: { backgroundColor: '#161B22', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#21262D' },
  cardUnread: { borderColor: '#3B82F6', borderWidth: 1.5 },
  title: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  message: { fontSize: 12, color: '#94A3B8', marginTop: 8, lineHeight: 18, fontWeight: '500' },
  promoBox: { backgroundColor: '#2A1F05', borderRadius: 10, padding: 10, marginTop: 10 }
});

const styles = StyleSheet.create({
  backBtn: { padding: 4 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyText: { color: '#94A3B8', fontSize: 12, fontWeight: '500' },
  listContainer: { paddingHorizontal: 16, paddingTop: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  dateText: { fontSize: 10, fontWeight: '500', color: '#94A3B8', marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' },
  promoBonusText: { fontSize: 14, fontWeight: '800', color: '#EAB308' },
  promoDatesText: { fontSize: 10, fontWeight: '600', color: '#92400E', marginTop: 2 },
  actionBtn: { flexDirection: 'row', backgroundColor: '#3B82F6', height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' }
});
