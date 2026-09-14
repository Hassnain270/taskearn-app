import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  TextInput,
  ScrollView
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { functions } from '../firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AdminTopRecruitersScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  const now = new Date();
  const [yearInput, setYearInput] = useState(String(now.getUTCFullYear()));
  const [monthInput, setMonthInput] = useState(String(now.getUTCMonth() + 1));
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [periodLabel, setPeriodLabel] = useState('');

  const handleCheck = async () => {
    const y = parseInt(yearInput, 10);
    const m = parseInt(monthInput, 10);
    if (isNaN(y) || y < 2020 || isNaN(m) || m < 1 || m > 12) {
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const getTopRecruiters = httpsCallable(functions, 'adminGetTopRecruiters');
      const res = await getTopRecruiters({ year: y, month: m });
      setLeaderboard((res.data && res.data.leaderboard) || []);
      setPeriodLabel((res.data && res.data.periodLabel) || (MONTH_NAMES[m - 1] + ' ' + y));
    } catch (err) {
      setLeaderboard([]);
      setPeriodLabel('');
    } finally {
      setLoading(false);
    }
  };

  const shiftMonth = (delta) => {
    let y = parseInt(yearInput, 10) || now.getUTCFullYear();
    let m = (parseInt(monthInput, 10) || now.getUTCMonth() + 1) + delta;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setYearInput(String(y));
    setMonthInput(String(m));
  };

  return (
    <SafeAreaView style={currentStyles.container} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <View style={currentStyles.header}>
        <TouchableOpacity style={currentStyles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={18} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Top Recruiters</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: 20 + insets.bottom }]} showsVerticalScrollIndicator={false}>

        <View style={currentStyles.pickerCard}>
          <Text style={styles.pickerLabel}>Select a month and year to view its leaderboard</Text>

          <View style={styles.monthNavRow}>
            <TouchableOpacity style={styles.navArrowBtn} onPress={() => shiftMonth(-1)}>
              <Feather name="chevron-left" size={18} color="#3B82F6" />
            </TouchableOpacity>

            <View style={styles.monthYearInputs}>
              <TextInput
                style={[currentStyles.pickerInput, styles.monthInputSmall]}
                value={monthInput}
                onChangeText={(t) => setMonthInput(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="Month"
                placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
              />
              <TextInput
                style={[currentStyles.pickerInput, styles.yearInputSmall]}
                value={yearInput}
                onChangeText={(t) => setYearInput(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="Year"
                placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
              />
            </View>

            <TouchableOpacity style={styles.navArrowBtn} onPress={() => shiftMonth(1)}>
              <Feather name="chevron-right" size={18} color="#3B82F6" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.checkBtn} onPress={handleCheck} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.checkBtnText}>View Leaderboard</Text>}
          </TouchableOpacity>
        </View>

        {hasSearched && !loading && (
          <View style={currentStyles.resultCard}>
            {periodLabel ? (
              <Text style={currentStyles.periodLabelText}>{periodLabel}</Text>
            ) : null}

            {leaderboard.length === 0 ? (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="account-search-outline" size={28} color={isDarkMode ? "#334155" : "#CBD5E1"} />
                <Text style={styles.emptyText}>No active referrals joined in this month.</Text>
              </View>
            ) : (
              leaderboard.map((entry, idx) => (
                <View key={entry.uid} style={[styles.leaderboardRow, idx < leaderboard.length - 1 && currentStyles.rowDivider]}>
                  <View style={[styles.rankCircle, idx === 0 && styles.rankCircleGold, idx === 1 && styles.rankCircleSilver, idx === 2 && styles.rankCircleBronze]}>
                    <Text style={styles.rankText}>{idx + 1}</Text>
                  </View>
                  <Text style={currentStyles.leaderboardUsername} numberOfLines={1}>{entry.username}</Text>
                  <Text style={styles.leaderboardCount}>{entry.activeReferralCount} active</Text>
                </View>
              ))
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  pickerCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 16 },
  pickerInput: { backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 10, textAlign: 'center', color: '#1E293B', fontSize: 14, fontWeight: '700' },
  resultCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  periodLabelText: { fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 12, textAlign: 'center' },
  leaderboardUsername: { fontSize: 13, fontWeight: '700', color: '#1E293B', flex: 1 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#161B22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  pickerCard: { backgroundColor: '#161B22', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#21262D', marginBottom: 16 },
  pickerInput: { backgroundColor: '#0D1117', borderRadius: 10, borderWidth: 1, borderColor: '#21262D', paddingVertical: 10, textAlign: 'center', color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  resultCard: { backgroundColor: '#161B22', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#21262D' },
  periodLabelText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', marginBottom: 12, textAlign: 'center' },
  leaderboardUsername: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#21262D' }
});

const styles = StyleSheet.create({
  scrollContainer: { padding: 16 },
  pickerLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8', marginBottom: 12, textAlign: 'center' },
  monthNavRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  navArrowBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(59,130,246,0.1)', justifyContent: 'center', alignItems: 'center' },
  monthYearInputs: { flex: 1, flexDirection: 'row', gap: 8 },
  monthInputSmall: { flex: 1 },
  yearInputSmall: { flex: 1.2 },
  checkBtn: { backgroundColor: '#3B82F6', height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  checkBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { color: '#94A3B8', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  rankCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(148,163,184,0.15)', justifyContent: 'center', alignItems: 'center' },
  rankCircleGold: { backgroundColor: 'rgba(234,179,8,0.2)' },
  rankCircleSilver: { backgroundColor: 'rgba(148,163,184,0.3)' },
  rankCircleBronze: { backgroundColor: 'rgba(217,119,6,0.2)' },
  rankText: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  leaderboardCount: { fontSize: 12, fontWeight: '800', color: '#22C55E' }
});
