import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Modal
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db, functions } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

const TABS = [
  { key: 'team_leader', label: 'Team Leaders' },
  { key: 'supervisor', label: 'Supervisors' },
  { key: 'manager', label: 'Managers' },
];

export default function AdminTeamRanksScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState('team_leader');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [selectedUsername, setSelectedUsername] = useState('');

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = auth.currentUser;
        if (!user) { setAccessChecked(true); setLoading(false); return; }
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const admin = userDoc.exists() && userDoc.data().isAdmin === true;
        setIsAdmin(admin);
        setAccessChecked(true);
        if (!admin) { setLoading(false); return; }
        await loadUsers('team_leader');
      } catch (err) {
        setAccessChecked(true);
        setLoading(false);
      }
    };
    checkAccess();
  }, []);

  const loadUsers = async (rank) => {
    setLoading(true);
    try {
      const getUsers = httpsCallable(functions, 'adminGetTeamRankUsers');
      const res = await getUsers({ rank });
      setUsers((res.data && res.data.users) || []);
    } catch (err) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    loadUsers(key);
  };

  const openHistory = async (item) => {
    setSelectedUsername(item.username);
    setHistoryModalVisible(true);
    setHistoryLoading(true);
    try {
      const getHistory = httpsCallable(functions, 'adminGetWeeklyTargetHistory');
      const res = await getHistory({ uid: item.uid });
      setHistoryData((res.data && res.data.history) || []);
    } catch (err) {
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatWeekDate = (ms) => {
    if (!ms) return '';
    return new Date(ms).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderUser = ({ item }) => {
    const progressColor = item.percent >= 100 ? '#22C55E' : item.percent >= 50 ? '#EAB308' : '#EF4444';
    return (
      <TouchableOpacity style={currentStyles.userCard} onPress={() => openHistory(item)}>
        <View style={styles.userTopRow}>
          <Text style={currentStyles.username}>{item.username}</Text>
          <Text style={[styles.percentText, { color: progressColor }]}>{item.percent}%</Text>
        </View>
        <Text style={styles.detailText}>Active Team: {item.teamSize} | Target: {item.targetCount} | Progress: {item.currentProgress}</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: Math.min(100, item.percent) + '%', backgroundColor: progressColor }]} />
        </View>
      </TouchableOpacity>
    );
  };

  if (accessChecked && !isAdmin) {
    return (
      <SafeAreaView style={currentStyles.container} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={currentStyles.header}>
          <TouchableOpacity style={currentStyles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={18} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
          </TouchableOpacity>
          <Text style={currentStyles.headerTitle}>Team Ranks</Text>
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
        <Text style={currentStyles.headerTitle}>Team Ranks</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={currentStyles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => handleTabChange(tab.key)}
          >
            <Text style={[currentStyles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.loaderContainer}>
          <MaterialCommunityIcons name="account-off-outline" size={32} color={isDarkMode ? "#334155" : "#CBD5E1"} />
          <Text style={styles.emptyText}>No users at this rank yet.</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          renderItem={renderUser}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 20 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={historyModalVisible} transparent animationType="fade" onRequestClose={() => setHistoryModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={currentStyles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={currentStyles.modalTitle}>{selectedUsername}'s Weekly History</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <Feather name="x" size={20} color={isDarkMode ? "#94A3B8" : "#64748B"} />
              </TouchableOpacity>
            </View>

            {historyLoading ? (
              <ActivityIndicator color="#3B82F6" style={{ marginVertical: 30 }} />
            ) : historyData.length === 0 ? (
              <Text style={styles.emptyText}>No past weeks recorded yet.</Text>
            ) : (
              <FlatList
                data={historyData}
                keyExtractor={(item, idx) => String(item.weekStartMs) + idx}
                renderItem={({ item }) => (
                  <View style={currentStyles.historyRow}>
                    <Text style={currentStyles.historyDate}>{formatWeekDate(item.weekStartMs)}</Text>
                    <Text style={styles.historyDetail}>Team: {item.teamSize} | Target: {item.targetCount} | Got: {item.actualJoinings} ({item.achievedPercent}%)</Text>
                    <Text style={[styles.historyReward, { color: item.rewardEarned > 0 ? '#22C55E' : '#94A3B8' }]}>
                      {item.rewardEarned > 0 ? '+$' + item.rewardEarned.toFixed(2) : 'No reward'}
                    </Text>
                  </View>
                )}
                style={{ maxHeight: 350 }}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  tabRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabButtonText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  userCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  username: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  modalCard: { width: '90%', maxHeight: '75%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18 },
  modalTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B', flex: 1 },
  historyRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  historyDate: { fontSize: 12, fontWeight: '700', color: '#1E293B' }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#161B22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  tabRow: { flexDirection: 'row', backgroundColor: '#161B22', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  tabButtonText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  userCard: { backgroundColor: '#161B22', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#21262D' },
  username: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  modalCard: { width: '90%', maxHeight: '75%', backgroundColor: '#161B22', borderRadius: 18, padding: 18 },
  modalTitle: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', flex: 1 },
  historyRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  historyDate: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' }
});

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyText: { color: '#94A3B8', fontSize: 12, fontWeight: '500', textAlign: 'center', paddingVertical: 20 },
  listContainer: { paddingHorizontal: 16, paddingTop: 14 },
  tabButton: { flex: 1, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  tabButtonActive: { backgroundColor: 'rgba(59,130,246,0.12)' },
  tabButtonTextActive: { color: '#3B82F6' },
  userTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  percentText: { fontSize: 14, fontWeight: '800' },
  detailText: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginTop: 6, marginBottom: 8 },
  progressBarBg: { height: 6, borderRadius: 3, backgroundColor: 'rgba(148,163,184,0.2)', overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 3 },
  accessDeniedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  accessDeniedText: { fontSize: 13, color: '#94A3B8', fontWeight: '500', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyDetail: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginTop: 4 },
  historyReward: { fontSize: 12, fontWeight: '800', marginTop: 4 }
});
