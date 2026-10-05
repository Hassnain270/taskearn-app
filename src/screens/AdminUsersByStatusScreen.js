import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  SectionList,
  TextInput
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db, functions } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

// Same app-day boundary used by the deposits and withdrawals screens.
const DAY_SHIFT_MS = 16 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getDayKey(ms) {
  const d = new Date(ms - DAY_SHIFT_MS);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

function getDayLabel(key) {
  if (!key) return 'Unknown date';
  if (key === getDayKey(Date.now())) return 'Today';
  if (key === getDayKey(Date.now() - 24 * 60 * 60 * 1000)) return 'Yesterday';
  const y = Math.floor(key / 10000);
  const m = Math.floor((key % 10000) / 100);
  const d = key % 100;
  return MONTHS[m - 1] + ' ' + d + ', ' + y;
}

export default function AdminUsersByStatusScreen({ navigation, route }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  const status = (route.params && route.params.status) || 'active';
  const title = status === 'all' ? 'All Registered Users' : (status === 'active' ? 'Active Users' : 'Inactive Users');

  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const checkAccessAndLoad = async () => {
      try {
        const user = auth.currentUser;
        if (!user) { setAccessChecked(true); setLoading(false); return; }
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const admin = userDoc.exists() && userDoc.data().isAdmin === true;
        setIsAdmin(admin);
        setAccessChecked(true);
        if (!admin) { setLoading(false); return; }

        const getUsers = httpsCallable(functions, 'adminGetUsersByStatus');
        const res = await getUsers({ status });
        setUsers((res.data && res.data.users) || []);
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoading(false);
      }
    };
    checkAccessAndLoad();
  }, [status]);

  const filteredUsers = useMemo(() => {
    const cleanQuery = searchQuery.trim().toLowerCase();
    if (!cleanQuery) return users;
    return users.filter((u) => (u.username || '').toLowerCase().includes(cleanQuery));
  }, [users, searchQuery]);

  const sections = useMemo(() => {
    const groups = [];
    const byKey = {};
    filteredUsers.forEach((u) => {
      const key = u.createdAt ? getDayKey(u.createdAt) : 0;
      if (!byKey[key]) {
        byKey[key] = { key: String(key), title: getDayLabel(key), data: [] };
        groups.push(byKey[key]);
      }
      byKey[key].data.push(u);
    });
    groups.forEach((g) => { g.title = g.title + '  (' + g.data.length + ')'; });
    return groups;
  }, [filteredUsers]);

  const formatTime = (ms) => {
    if (!ms) return 'Unknown';
    return new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }) => (
    <View style={currentStyles.userCard}>
      <View style={styles.cardTopRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Text style={currentStyles.username} numberOfLines={1}>{item.username}</Text>
          {status === 'all' && (
            <View style={[styles.badge, { backgroundColor: item.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.18)' }]}>
              <Text style={[styles.badgeText, { color: item.isActive ? '#22C55E' : '#94A3B8' }]}>{item.isActive ? 'Active' : 'Inactive'}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.depositText, { color: item.totalDeposited > 0 ? '#22C55E' : '#94A3B8' }]}>
          {item.totalDeposited > 0 ? '$' + item.totalDeposited.toFixed(2) : 'No Deposit'}
        </Text>
      </View>
      <Text style={styles.detailText}>Registered: {formatTime(item.createdAt)}</Text>
      <Text style={styles.detailText}>Referred by: {item.referrerUsername || 'None'}</Text>
    </View>
  );

  const header = (
    <View style={currentStyles.header}>
      <TouchableOpacity style={currentStyles.backButton} onPress={() => navigation.goBack()}>
        <Feather name="arrow-left" size={18} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
      </TouchableOpacity>
      <Text style={currentStyles.headerTitle}>{title}{accessChecked && isAdmin ? ' (' + users.length + ')' : ''}</Text>
      <View style={{ width: 36 }} />
    </View>
  );

  if (accessChecked && !isAdmin) {
    return (
      <SafeAreaView style={currentStyles.container} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        {header}
        <View style={styles.accessDeniedContainer}>
          <MaterialCommunityIcons name="shield-lock-outline" size={40} color={isDarkMode ? "#334155" : "#CBD5E1"} />
          <Text style={styles.accessDeniedText}>You don't have permission to view this page.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={currentStyles.container} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      {header}

      <View style={styles.searchSection}>
        <View style={currentStyles.searchWrapper}>
          <Feather name="search" size={16} color={isDarkMode ? "#8B949E" : "#94A3B8"} />
          <TextInput
            style={currentStyles.searchInput}
            placeholder="Search by username"
            placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color={isDarkMode ? "#8B949E" : "#94A3B8"} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.loaderContainer}>
          <MaterialCommunityIcons name="account-search-outline" size={32} color={isDarkMode ? "#334155" : "#CBD5E1"} />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No users found for that username.' : 'No users in this category.'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.uid}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <Text style={currentStyles.sectionHeader}>{section.title}</Text>
          )}
          stickySectionHeadersEnabled={false}
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
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  headerTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  searchWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#1E293B' },
  userCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  username: { fontSize: 14, fontWeight: '700', color: '#1E293B', flexShrink: 1 },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: '#64748B', marginTop: 10, marginBottom: 8 }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#161B22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  headerTitle: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' },
  searchWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#21262D', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#FFFFFF' },
  userCard: { backgroundColor: '#161B22', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#21262D' },
  username: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', flexShrink: 1 },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: '#8B949E', marginTop: 10, marginBottom: 8 }
});

const styles = StyleSheet.create({
  searchSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyText: { color: '#94A3B8', fontSize: 12, fontWeight: '500', textAlign: 'center', paddingHorizontal: 30 },
  listContainer: { paddingHorizontal: 16, paddingTop: 4 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  badge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  depositText: { fontSize: 12, fontWeight: '700' },
  detailText: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginTop: 4 },
  accessDeniedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  accessDeniedText: { fontSize: 13, color: '#94A3B8', fontWeight: '500', textAlign: 'center' }
});
