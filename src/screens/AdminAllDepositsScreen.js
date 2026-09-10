import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  SectionList,
  TextInput
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db, functions } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The app's day cycle resets at 9 PM Pakistan time (= 16:00 UTC), the
// same boundary used everywhere else in the app (task resets, team
// joining counts, etc). This shifts a timestamp back by that offset so
// simple UTC-date comparison gives the correct "app day" it falls in.
function getCycleDayKey(ms) {
  const shifted = new Date(ms - 16 * 60 * 60 * 1000);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
}

function getDayLabel(ms) {
  const dayKey = getCycleDayKey(ms);
  const todayKey = getCycleDayKey(Date.now());
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (dayKey === todayKey) return 'Today';
  if (dayKey === todayKey - oneDayMs) return 'Yesterday';

  const daysAgo = Math.round((todayKey - dayKey) / oneDayMs);
  const d = new Date(dayKey);

  if (daysAgo > 0 && daysAgo < 7) {
    return WEEKDAY_NAMES[d.getUTCDay()];
  }

  const monthLabel = MONTH_ABBR[d.getUTCMonth()] + ' ' + d.getUTCDate();
  const currentYear = new Date(todayKey).getUTCFullYear();
  if (d.getUTCFullYear() !== currentYear) {
    return monthLabel + ', ' + d.getUTCFullYear();
  }
  return monthLabel;
}

export default function AdminAllDepositsScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deposits, setDeposits] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const checkAccessAndLoad = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setAccessChecked(true);
          setLoading(false);
          return;
        }
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const admin = userDoc.exists() && userDoc.data().isAdmin === true;
        setIsAdmin(admin);
        setAccessChecked(true);
        if (!admin) {
          setLoading(false);
          return;
        }

        const getAllDeposits = httpsCallable(functions, 'adminGetAllDeposits');
        const res = await getAllDeposits();
        setDeposits((res.data && res.data.deposits) || []);
      } catch (err) {
        console.error('Failed to load deposits:', err);
      } finally {
        setLoading(false);
      }
    };
    checkAccessAndLoad();
  }, []);

  const filteredDeposits = useMemo(() => {
    const cleanQuery = searchQuery.trim().toLowerCase();
    if (!cleanQuery) return deposits;
    return deposits.filter((d) => (d.username || '').toLowerCase().includes(cleanQuery));
  }, [deposits, searchQuery]);

  const sections = useMemo(() => {
    const grouped = {};
    const order = [];

    filteredDeposits.forEach((dep) => {
      const label = dep.date ? getDayLabel(dep.date) : 'Unknown Date';
      if (!grouped[label]) {
        grouped[label] = [];
        order.push(label);
      }
      grouped[label].push(dep);
    });

    return order.map((label) => ({ title: label, data: grouped[label] }));
  }, [filteredDeposits]);

  const formatTime = (ms) => {
    if (!ms) return '';
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }) => (
    <View style={currentStyles.depositCard}>
      <View style={styles.depositAvatarCircle}>
        <Feather name="arrow-down-left" size={16} color="#22C55E" />
      </View>
      <View style={styles.depositMiddle}>
        <Text style={currentStyles.depositUsername}>{item.username}</Text>
        {item.referrerUsername && (
          <Text style={styles.depositSubtext}>Referred by {item.referrerUsername}</Text>
        )}
        <Text style={styles.depositSubtext}>{formatTime(item.date)}</Text>
      </View>
      <Text style={styles.depositAmount}>+${item.amount.toFixed(2)}</Text>
    </View>
  );

  const renderSectionHeader = ({ section }) => (
    <View style={currentStyles.sectionHeaderRow}>
      <Text style={currentStyles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  if (accessChecked && !isAdmin) {
    return (
      <SafeAreaView style={currentStyles.container}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={currentStyles.header}>
          <TouchableOpacity style={currentStyles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={18} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
          </TouchableOpacity>
          <Text style={currentStyles.headerTitle}>All Deposits</Text>
          <View style={{ width: 36 }} />
        </View>
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

      <View style={currentStyles.header}>
        <TouchableOpacity style={currentStyles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={18} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>All Deposits</Text>
        <View style={{ width: 36 }} />
      </View>

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
          <MaterialCommunityIcons name="cash-remove" size={32} color={isDarkMode ? "#334155" : "#CBD5E1"} />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No deposits found for that username.' : 'No deposits recorded yet.'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, idx) => item.uid + '_' + item.date + '_' + idx}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 20 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={true}
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
  searchWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#1E293B' },
  depositCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  depositUsername: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  sectionHeaderRow: { backgroundColor: '#F8FAFC', paddingVertical: 8 },
  sectionHeaderText: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.5 }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#161B22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  searchWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#21262D', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#FFFFFF' },
  depositCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#21262D' },
  depositUsername: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  sectionHeaderRow: { backgroundColor: '#0B0E14', paddingVertical: 8 },
  sectionHeaderText: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 }
});

const styles = StyleSheet.create({
  searchSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyText: { color: '#94A3B8', fontSize: 12, fontWeight: '500', textAlign: 'center', paddingHorizontal: 30 },
  listContainer: { paddingHorizontal: 16, paddingTop: 8 },
  depositAvatarCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(34,197,94,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  depositMiddle: { flex: 1 },
  depositSubtext: { fontSize: 10, fontWeight: '500', color: '#94A3B8', marginTop: 2 },
  depositAmount: { fontSize: 14, fontWeight: '800', color: '#22C55E' },
  accessDeniedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  accessDeniedText: { fontSize: 13, color: '#94A3B8', fontWeight: '500', textAlign: 'center' }
});