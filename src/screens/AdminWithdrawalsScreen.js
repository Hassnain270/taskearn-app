import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Platform
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, functions } from '../firebaseConfig';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function AdminWithdrawalsScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [sortOrder, setSortOrder] = useState('oldest'); // pending queue defaults oldest-first
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [processingAction, setProcessingAction] = useState(null); // { id, action }

  const [rejectModal, setRejectModal] = useState({ visible: false, id: null, reason: '' });

  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  useEffect(() => {
    const q = query(collection(db, "withdrawals"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setWithdrawals(list);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.log("Error fetching withdrawals:", error);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, []);

  const getMillis = (createdAt) => {
    if (!createdAt) return 0;
    if (typeof createdAt.toDate === 'function') return createdAt.toDate().getTime();
    if (createdAt.seconds) return createdAt.seconds * 1000;
    return 0;
  };

  const statusForTab = (tabKey) => {
    if (tabKey === 'pending') return 'pending';
    if (tabKey === 'approved') return 'completed';
    if (tabKey === 'rejected') return 'rejected';
    return 'pending';
  };

  const visibleList = withdrawals
    .filter((item) => (item.status || 'pending') === statusForTab(activeTab))
    .filter((item) => {
      if (!searchQuery.trim()) return true;
      return (item.username || '').toLowerCase().includes(searchQuery.trim().toLowerCase());
    })
    .sort((a, b) => {
      const diff = getMillis(a.createdAt) - getMillis(b.createdAt);
      return sortOrder === 'oldest' ? diff : -diff;
    });

  const getPendingHours = (createdAt) => {
    const ms = Date.now() - getMillis(createdAt);
    return ms / (1000 * 60 * 60);
  };

  const getPendingBadgeStyle = (hours) => {
    if (hours >= 40) return { bg: '#FEE2E2', text: '#DC2626' };
    if (hours >= 24) return { bg: '#FEF3C7', text: '#D97706' };
    return { bg: '#D1FAE5', text: '#059669' };
  };

  const copyWallet = (address) => {
    if (Platform.OS === 'web' && navigator.clipboard) {
      navigator.clipboard.writeText(address);
      Alert.alert("Copied", "Wallet address copied to clipboard.");
    } else {
      Alert.alert("Wallet Address", address);
    }
  };

  const performApprove = async (id) => {
    setProcessingAction({ id, action: 'approve' });
    try {
      const updateStatus = httpsCallable(functions, 'updateWithdrawalStatus');
      await updateStatus({ withdrawalId: id, newStatus: 'completed' });
      Alert.alert("Approved", "Withdrawal marked as completed.");
      setExpandedId(null);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to approve withdrawal.");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleApprovePress = (item) => {
    Alert.alert(
      "Confirm Approval",
      `Approve withdrawal of $${Number(item.netPayout || item.amount).toFixed(2)} for ${item.username}?\n\nMake sure you have already sent the funds to their wallet before confirming.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => performApprove(item.id) }
      ]
    );
  };

  const openRejectModal = (id) => {
    setRejectModal({ visible: true, id, reason: '' });
  };

  const confirmReject = async () => {
    const { id, reason } = rejectModal;
    setRejectModal({ visible: false, id: null, reason: '' });
    setProcessingAction({ id, action: 'reject' });
    try {
      const updateStatus = httpsCallable(functions, 'updateWithdrawalStatus');
      await updateStatus({ withdrawalId: id, newStatus: 'rejected', reason: reason.trim() });
      Alert.alert("Rejected", "Withdrawal rejected and amount refunded to user.");
      setExpandedId(null);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to reject withdrawal.");
    } finally {
      setProcessingAction(null);
    }
  };

  const formatDate = (createdAt) => {
    const ms = getMillis(createdAt);
    if (!ms) return '';
    const date = new Date(ms);
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const renderCard = ({ item }) => {
    const isExpanded = expandedId === item.id;
    const isPendingTab = activeTab === 'pending';
    const hours = isPendingTab ? getPendingHours(item.createdAt) : null;
    const badgeStyle = isPendingTab ? getPendingBadgeStyle(hours) : null;
    const initial = (item.username || 'U').charAt(0).toUpperCase();

    const approving = processingAction?.id === item.id && processingAction?.action === 'approve';
    const rejecting = processingAction?.id === item.id && processingAction?.action === 'reject';

    return (
      <View style={currentStyles.card}>
        <TouchableOpacity
          style={styles.cardHeader}
          activeOpacity={0.7}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>

          <View style={styles.headerMiddle}>
            <Text style={currentStyles.usernameText}>{item.username || 'Unknown User'}</Text>
            <Text style={styles.amountPreview}>${Number(item.netPayout || item.amount || 0).toFixed(2)} net</Text>
          </View>

          {isPendingTab && (
            <View style={[styles.pendingBadge, { backgroundColor: badgeStyle.bg }]}>
              <Text style={[styles.pendingBadgeText, { color: badgeStyle.text }]}>
                {hours < 1 ? '<1h' : `${Math.floor(hours)}h`}
              </Text>
            </View>
          )}

          <Feather
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={isDarkMode ? "#94A3B8" : "#64748B"}
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={currentStyles.detailBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>User ID</Text>
              <Text style={currentStyles.detailValue} numberOfLines={1}>{item.userId}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Requested Amount</Text>
              <Text style={currentStyles.detailValue}>${Number(item.amount || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fee (7%)</Text>
              <Text style={styles.feeText}>-${Number(item.fee || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Net Amount to Send</Text>
              <Text style={styles.netText}>${Number(item.netPayout || item.amount || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Network</Text>
              <Text style={currentStyles.detailValue}>{item.walletNetwork || 'TRC20'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Requested On</Text>
              <Text style={currentStyles.detailValue}>{formatDate(item.createdAt)}</Text>
            </View>

            <Text style={[styles.detailLabel, { marginTop: 10, marginBottom: 6 }]}>Wallet Address</Text>
            <View style={currentStyles.walletBox}>
              <Text style={currentStyles.walletText} selectable numberOfLines={2}>
                {item.walletAddress || 'No address on file'}
              </Text>
              <TouchableOpacity onPress={() => copyWallet(item.walletAddress)} style={styles.copyBtn}>
                <Feather name="copy" size={16} color="#3B82F6" />
              </TouchableOpacity>
            </View>

            {item.rejectionReason ? (
              <View style={styles.reasonBox}>
                <Feather name="message-square" size={13} color="#DC2626" />
                <Text style={styles.reasonText}>Reason: {item.rejectionReason}</Text>
              </View>
            ) : null}

            {isPendingTab && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => openRejectModal(item.id)}
                  disabled={approving || rejecting}
                >
                  {rejecting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.actionBtnText}>Reject</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleApprovePress(item)}
                  disabled={approving || rejecting}
                >
                  {approving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.actionBtnText}>Approve</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={currentStyles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <View style={currentStyles.header}>
        <TouchableOpacity style={currentStyles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={18} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Withdrawal Approvals</Text>
        <TouchableOpacity
          onPress={() => setSortOrder(sortOrder === 'oldest' ? 'newest' : 'oldest')}
          style={currentStyles.sortButton}
        >
          <Feather name={sortOrder === 'oldest' ? "arrow-up" : "arrow-down"} size={14} color="#3B82F6" />
          <Text style={styles.sortButtonText}>{sortOrder === 'oldest' ? 'Oldest' : 'Newest'}</Text>
        </TouchableOpacity>
      </View>

      <View style={currentStyles.searchWrapper}>
        <Feather name="search" size={16} color={isDarkMode ? "#8B949E" : "#94A3B8"} />
        <TextInput
          style={currentStyles.searchInput}
          placeholder="Search by username..."
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

      <View style={currentStyles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => { setActiveTab(tab.key); setExpandedId(null); }}
          >
            <Text style={[currentStyles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {activeTab === tab.key && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={visibleList}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 16 + insets.bottom }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name={activeTab === 'pending' ? "party-popper" : "inbox-outline"}
                size={32}
                color={isDarkMode ? "#334155" : "#CBD5E1"}
              />
              <Text style={styles.emptyText}>
                {activeTab === 'pending' ? 'No pending withdrawals' : `No ${activeTab} withdrawals found.`}
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={rejectModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={currentStyles.modalCard}>
            <Text style={currentStyles.modalTitle}>Reject Withdrawal</Text>
            <Text style={styles.modalSubtitle}>Optionally, provide a reason. The user will see this in their history.</Text>
            <TextInput
              style={currentStyles.modalInput}
              placeholder="e.g. Invalid wallet address (optional)"
              placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
              value={rejectModal.reason}
              onChangeText={(text) => setRejectModal((prev) => ({ ...prev, reason: text }))}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModal({ visible: false, id: null, reason: '' })}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmReject}>
                <Text style={styles.modalConfirmText}>Confirm Reject</Text>
              </TouchableOpacity>
            </View>
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
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#EFF6FF', borderRadius: 8 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 12, marginBottom: 4, paddingHorizontal: 12, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#1E293B' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 8, marginBottom: 4 },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#94A3B8', paddingVertical: 10 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  usernameText: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  detailBox: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  detailValue: { fontSize: 12, fontWeight: '600', color: '#334155', maxWidth: '60%', textAlign: 'right' },
  walletBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 10, gap: 8 },
  walletText: { fontSize: 12, color: '#334155', fontWeight: '600', flex: 1 },
  modalCard: { width: '88%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  modalInput: { backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, minHeight: 70, color: '#1E293B', fontSize: 13, marginTop: 12, textAlignVertical: 'top' }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#161B22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#1E293B', borderRadius: 8 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', marginHorizontal: 16, marginTop: 12, marginBottom: 4, paddingHorizontal: 12, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#21262D', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#FFFFFF' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 8, marginBottom: 4 },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#8B949E', paddingVertical: 10 },
  card: { backgroundColor: '#161B22', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#21262D', overflow: 'hidden' },
  usernameText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  detailBox: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#21262D', paddingTop: 12 },
  detailValue: { fontSize: 12, fontWeight: '600', color: '#E2E8F0', maxWidth: '60%', textAlign: 'right' },
  walletBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D1117', borderRadius: 10, padding: 10, gap: 8 },
  walletText: { fontSize: 12, color: '#CBD5E1', fontWeight: '600', flex: 1 },
  modalCard: { width: '88%', backgroundColor: '#161B22', borderRadius: 18, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  modalInput: { backgroundColor: '#0D1117', borderRadius: 10, borderWidth: 1, borderColor: '#21262D', padding: 12, minHeight: 70, color: '#FFFFFF', fontSize: 13, marginTop: 12, textAlignVertical: 'top' }
});

const styles = StyleSheet.create({
  sortButtonText: { fontSize: 11, fontWeight: '700', color: '#3B82F6' },
  tabItem: { marginRight: 26, alignItems: 'center' },
  tabLabelActive: { color: '#3B82F6' },
  tabUnderline: { height: 2, width: '100%', backgroundColor: '#3B82F6', borderRadius: 1, marginTop: -2 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(59,130,246,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#3B82F6' },
  headerMiddle: { flex: 1 },
  amountPreview: { fontSize: 11, fontWeight: '600', color: '#94A3B8', marginTop: 2 },
  pendingBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 4 },
  pendingBadgeText: { fontSize: 10, fontWeight: '800' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  detailLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  feeText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  netText: { fontSize: 13, fontWeight: '800', color: '#10B981' },
  copyBtn: { padding: 4 },
  reasonBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: 'rgba(239, 68, 68, 0.08)', padding: 8, borderRadius: 8 },
  reasonText: { fontSize: 11, color: '#DC2626', fontWeight: '600', flex: 1 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  approveBtn: { backgroundColor: '#10B981' },
  rejectBtn: { backgroundColor: '#EF4444' },
  actionBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: '#94A3B8', fontSize: 12, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalSubtitle: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancelBtn: { flex: 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(148,163,184,0.15)' },
  modalCancelText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  modalConfirmBtn: { flex: 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EF4444' },
  modalConfirmText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' }
});