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

// Same 16:00 UTC shift, but grouped down to a year+month key instead of
// a full day, so a Monthly Summary card can total up "this month" vs
// "last month" using the same app-day boundary as everywhere else.
function getMonthKey(ms) {
  const shifted = new Date(ms - 16 * 60 * 60 * 1000);
  return shifted.getUTCFullYear() * 100 + shifted.getUTCMonth();
}

function getMonthLabel(monthKey) {
  const year = Math.floor(monthKey / 100);
  const month = monthKey % 100;
  return MONTH_ABBR[month] + ' ' + year;
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
  const [viewKey, setViewKey] = useState(getMonthKey(Date.now()));
  const shiftViewMonth = (delta) => {
    setViewKey((k) => {
      let y = Math.floor(k / 100);
      let m = (k % 100) + delta;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      const next = y * 100 + m;
      return next > getMonthKey(Date.now()) ? k : next;
    });
  };

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

  const monthDeposits = useMemo(() => {
    return deposits.filter((x) => x.date && getMonthKey(x.date) === viewKey);
  }, [deposits, viewKey]);

  const viewTotal = useMemo(() => monthDeposits.reduce((sum, x) => sum + Number(x.amount || 0), 0), [monthDeposits]);

  const [showBreakdown, setShowBreakdown] = useState(false);

  const vipBreakdown = useMemo(() => {
    const firstTime = {};
    deposits.forEach((d) => {
      if (!d.date) return;
      if (!firstTime[d.uid] || d.date < firstTime[d.uid]) firstTime[d.uid] = d.date;
    });
    const tiers = [70, 150, 300, 500, 1000, 1500, 3000, 5000, 10000, 20000];
    const rows = tiers.map((t, i) => ({ label: 'VIP ' + (i + 1), min: t, newCount: 0, topUpCount: 0 }));
    const below = { label: 'Below $70', min: 0, newCount: 0, topUpCount: 0 };
    monthDeposits.forEach((d) => {
      const amt = Number(d.amount || 0) + 0.5;
      let idx = -1;
      for (let i = tiers.length - 1; i >= 0; i--) { if (amt >= tiers[i]) { idx = i; break; } }
      const row = idx === -1 ? below : rows[idx];
      if (firstTime[d.uid] === d.date) row.newCount++; else row.topUpCount++;
    });
    return rows.concat([below]);
  }, [deposits, monthDeposits]);

  const filteredDeposits = useMemo(() => {
    const cleanQuery = searchQuery.trim().toLowerCase();
    if (!cleanQuery) return monthDeposits;
    return monthDeposits.filter((d) => (d.username || '').toLowerCase().includes(cleanQuery));
  }, [monthDeposits, searchQuery]);

  const monthlySummary = useMemo(() => {
    const currentMonthKey = getMonthKey(Date.now());
    const previousMonthKey = (currentMonthKey % 100 === 0)
      ? (currentMonthKey - 100 + 11)
      : (currentMonthKey - 1);

    let currentTotal = 0;
    let previousTotal = 0;
    deposits.forEach((d) => {
      if (!d.date) return;
      const key = getMonthKey(d.date);
      if (key === currentMonthKey) currentTotal += d.amount;
      else if (key === previousMonthKey) previousTotal += d.amount;
    });

    return {
      currentLabel: getMonthLabel(currentMonthKey),
      previousLabel: getMonthLabel(previousMonthKey),
      currentTotal: currentTotal,
      previousTotal: previousTotal,
    };
  }, [deposits]);

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
      <SafeAreaView style={currentStyles.container} edges={['top']}>
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

      <View style={currentStyles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>{monthlySummary.currentLabel}</Text>
            <Text style={[styles.summaryValue, { color: '#22C55E' }]}>${monthlySummary.currentTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>{monthlySummary.previousLabel}</Text>
            <Text style={[styles.summaryValue, { color: '#94A3B8' }]}>${monthlySummary.previousTotal.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View style={currentStyles.summaryCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => shiftViewMonth(-1)} style={{ padding: 8 }}>
            <Feather name="chevron-left" size={22} color={isDarkMode ? '#FFFFFF' : '#1E293B'} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.summaryLabel}>{getMonthLabel(viewKey)}</Text>
            <Text style={[styles.summaryValue, { color: '#22C55E' }]}>${viewTotal.toFixed(2)}</Text>
            <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{monthDeposits.length + ' deposits'}</Text>
          </View>
          <TouchableOpacity onPress={() => shiftViewMonth(1)} style={{ padding: 8 }}>
            <Feather name="chevron-right" size={22} color={isDarkMode ? '#FFFFFF' : '#1E293B'} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={currentStyles.summaryCard}>
        <TouchableOpacity onPress={() => setShowBreakdown(!showBreakdown)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.summaryLabel}>Deposits by VIP level</Text>
          <Feather name={showBreakdown ? 'chevron-up' : 'chevron-down'} size={18} color={isDarkMode ? '#FFFFFF' : '#1E293B'} />
        </TouchableOpacity>
        {showBreakdown && (
          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#30363D' : '#E2E8F0' }}>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: '#94A3B8' }}>Level</Text>
              <Text style={{ width: 64, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#94A3B8' }}>New</Text>
              <Text style={{ width: 64, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#94A3B8' }}>Top-up</Text>
            </View>
            {vipBreakdown.map((r) => (
              <View key={r.label} style={{ flexDirection: 'row', paddingVertical: 5 }}>
                <Text style={{ flex: 1, fontSize: 13, color: isDarkMode ? '#FFFFFF' : '#1E293B' }}>{r.label + (r.min ? '  ($' + (r.min >= 1000 ? (r.min / 1000) + 'K' : r.min) + ')' : '')}</Text>
                <Text style={{ width: 64, textAlign: 'center', fontSize: 13, fontWeight: '700', color: r.newCount ? '#22C55E' : '#94A3B8' }}>{r.newCount}</Text>
                <Text style={{ width: 64, textAlign: 'center', fontSize: 13, fontWeight: '700', color: r.topUpCount ? '#3B82F6' : '#94A3B8' }}>{r.topUpCount}</Text>
              </View>
            ))}
          </View>
        )}
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
            {searchQuery ? 'No deposits found for that username.' : 'No deposits in this month.'}
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
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 14, marginHorizontal: 16, marginTop: 12, padding: 14, borderWidth: 1, borderColor: '#F1F5F9' },
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
  summaryCard: { backgroundColor: '#161B22', borderRadius: 14, marginHorizontal: 16, marginTop: 12, padding: 14, borderWidth: 1, borderColor: '#21262D' },
  searchWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#21262D', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#FFFFFF' },
  depositCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#21262D' },
  depositUsername: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  sectionHeaderRow: { backgroundColor: '#0B0E14', paddingVertical: 8 },
  sectionHeaderText: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 }
});

const styles = StyleSheet.create({
  searchSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryBox: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '800' },
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
