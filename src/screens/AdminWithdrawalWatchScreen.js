import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator, FlatList, TextInput } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db, functions } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

export default function AdminWithdrawalWatchScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const cs = isDarkMode ? darkStyles : lightStyles;

  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [noTeam, setNoTeam] = useState([]);
  const [withTeam, setWithTeam] = useState([]);
  const [tab, setTab] = useState('noTeam');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) { setAccessChecked(true); setLoading(false); return; }
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const admin = userDoc.exists() && userDoc.data().isAdmin === true;
        setIsAdmin(admin);
        setAccessChecked(true);
        if (!admin) { setLoading(false); return; }
        const fn = httpsCallable(functions, 'adminGetOverWithdrawnUsers');
        const res = await fn();
        setNoTeam((res.data && res.data.noTeam) || []);
        setWithTeam((res.data && res.data.withTeam) || []);
      } catch (err) {
        console.error('Failed to load over-withdrawn users:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const list = useMemo(() => {
    const base = tab === 'noTeam' ? noTeam : withTeam;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((u) => (u.username || '').toLowerCase().includes(q));
  }, [tab, noTeam, withTeam, searchQuery]);

  const formatTime = (ms) => {
    if (!ms) return 'Never';
    return new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }) => (
    <View style={cs.card}>
      <View style={styles.rowBetween}>
        <Text style={cs.username} numberOfLines={1}>{item.username}</Text>
        <Text style={styles.extraText}>{'+$' + item.extra.toFixed(2)}</Text>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Deposited</Text>
          <Text style={[styles.statValue, { color: '#22C55E' }]}>{'$' + item.deposited.toFixed(2)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Withdrawn</Text>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{'$' + item.withdrawn.toFixed(2)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Balance</Text>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{'$' + item.balance.toFixed(2)}</Text>
        </View>
      </View>
      <Text style={styles.detailText}>{'Team: ' + item.directCount + ' direct (' + item.activeDirectCount + ' active)'}</Text>
      <Text style={styles.detailText}>{'Last task: ' + formatTime(item.lastTaskAt)}</Text>
      {item.deposited === 0 && <Text style={[styles.detailText, { color: '#EAB308' }]}>No deposit record (manual balance account)</Text>}
    </View>
  );

  const header = (
    <View style={cs.header}>
      <TouchableOpacity style={cs.backButton} onPress={() => navigation.goBack()}>
        <Feather name="arrow-left" size={18} color={isDarkMode ? '#FFFFFF' : '#1E293B'} />
      </TouchableOpacity>
      <Text style={cs.headerTitle}>Withdrawal Watch</Text>
      <View style={{ width: 36 }} />
    </View>
  );

  if (accessChecked && !isAdmin) {
    return (
      <SafeAreaView style={cs.container} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        {header}
        <View style={styles.center}>
          <MaterialCommunityIcons name="shield-lock-outline" size={40} color={isDarkMode ? '#334155' : '#CBD5E1'} />
          <Text style={styles.emptyText}>You don't have permission to view this page.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={cs.container} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {header}

      <Text style={styles.intro}>Users who have withdrawn as much as or more than they deposited.</Text>

      <View style={cs.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'noTeam' && styles.tabActive]} onPress={() => setTab('noTeam')}>
          <Text style={[cs.tabText, tab === 'noTeam' && styles.tabTextActive]}>{'No Team (' + noTeam.length + ')'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'withTeam' && styles.tabActive]} onPress={() => setTab('withTeam')}>
          <Text style={[cs.tabText, tab === 'withTeam' && styles.tabTextActive]}>{'With Team (' + withTeam.length + ')'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={cs.searchWrapper}>
          <Feather name="search" size={16} color={isDarkMode ? '#8B949E' : '#94A3B8'} />
          <TextInput
            style={cs.searchInput}
            placeholder="Search by username"
            placeholderTextColor={isDarkMode ? '#565D68' : '#94A3B8'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color={isDarkMode ? '#8B949E' : '#94A3B8'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#3B82F6" /></View>
      ) : list.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="check-circle-outline" size={32} color={isDarkMode ? '#334155' : '#CBD5E1'} />
          <Text style={styles.emptyText}>{searchQuery ? 'No users found for that username.' : 'No users in this list.'}</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.uid}
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
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  tabRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  searchWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#1E293B' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  username: { fontSize: 14, fontWeight: '700', color: '#1E293B', flex: 1 }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#161B22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  tabRow: { flexDirection: 'row', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  searchWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#21262D', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#FFFFFF' },
  card: { backgroundColor: '#161B22', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#21262D' },
  username: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', flex: 1 }
});

const styles = StyleSheet.create({
  intro: { fontSize: 12, color: '#94A3B8', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  tabBtn: { flex: 1, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(239,68,68,0.12)' },
  tabTextActive: { color: '#EF4444' },
  searchSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 30 },
  emptyText: { color: '#94A3B8', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  listContainer: { paddingHorizontal: 16, paddingTop: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  extraText: { fontSize: 13, fontWeight: '800', color: '#EF4444' },
  statsRow: { flexDirection: 'row', marginTop: 10, marginBottom: 6, gap: 8 },
  statBox: { flex: 1 },
  statLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  statValue: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  detailText: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginTop: 3 }
});
