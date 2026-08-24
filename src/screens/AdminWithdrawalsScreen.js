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
  RefreshControl
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, functions } from '../firebaseConfig';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

export default function AdminWithdrawalsScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  // Realtime Listener for Pending & Processed Withdrawals
  useEffect(() => {
    const q = query(collection(db, "withdrawals"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort by newest first
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
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

  const handleStatusUpdate = async (id, newStatus, userWallet, netPayout) => {
    Alert.alert(
      "Confirm Action",
      `Are you sure you want to mark this withdrawal as ${newStatus.toUpperCase()}?\n\nNet Payout: $${netPayout}\nWallet: ${userWallet}${newStatus === 'rejected' ? '\n\nThe held amount will be automatically refunded to the user.' : ''}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setProcessingId(id);
            try {
              const updateStatus = httpsCallable(functions, 'updateWithdrawalStatus');
              await updateStatus({ withdrawalId: id, newStatus });
              Alert.alert("Success", `Withdrawal request status updated to ${newStatus}.`);
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to update status.");
            } finally {
              setProcessingId(null);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isPending = item.status === 'pending';
    const isCompleted = item.status === 'completed' || item.status === 'approved';

    return (
      <View style={currentStyles.card}>
        <View style={styles.cardHeader}>
          <Text style={currentStyles.userIdText}>User ID: {item.userId ? `${item.userId.substring(0, 10)}...` : 'N/A'}</Text>
          <View style={[
            styles.statusBadge,
            isPending ? styles.pendingBadge : (isCompleted ? styles.completedBadge : styles.rejectedBadge)
          ]}>
            <Text style={[
              styles.statusText,
              isPending ? styles.pendingText : (isCompleted ? styles.completedText : styles.rejectedText)
            ]}>
              {(item.status || 'pending').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.amountRow}>
          <View>
            <Text style={styles.label}>Requested</Text>
            <Text style={currentStyles.amountText}>${parseFloat(item.amount || 0).toFixed(2)}</Text>
          </View>
          <View>
            <Text style={styles.label}>Fee (7%)</Text>
            <Text style={styles.feeText}>-${parseFloat(item.fee || 0).toFixed(2)}</Text>
          </View>
          <View>
            <Text style={styles.label}>Net Payout</Text>
            <Text style={styles.netText}>${parseFloat(item.netPayout || 0).toFixed(2)}</Text>
          </View>
        </View>

        <View style={currentStyles.walletBox}>
          <MaterialCommunityIcons name="wallet-outline" size={16} color={isDarkMode ? "#94A3B8" : "#64748B"} />
          <Text style={currentStyles.walletText} numberOfLines={1} selectable={true}>
            {item.walletAddress || "No Wallet Provided"}
          </Text>
        </View>

        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btn, styles.rejectBtn]}
              onPress={() => handleStatusUpdate(item.id, 'rejected', item.walletAddress, item.netPayout)}
              disabled={processingId === item.id}
            >
              {processingId === item.id ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.btnText}>Reject</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.approveBtn]}
              onPress={() => handleStatusUpdate(item.id, 'completed', item.walletAddress, item.netPayout)}
              disabled={processingId === item.id}
            >
              {processingId === item.id ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.btnText}>Approve & Complete</Text>
              )}
            </TouchableOpacity>
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
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={withdrawals}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 16 + insets.bottom }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No withdrawal requests found.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  userIdText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  amountText: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  walletBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 10, marginTop: 12, gap: 8 },
  walletText: { fontSize: 12, color: '#334155', fontWeight: '600', flex: 1 }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#161B22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  card: { backgroundColor: '#161B22', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#21262D' },
  userIdText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  amountText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  walletBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D1117', borderRadius: 10, padding: 10, marginTop: 12, gap: 8 },
  walletText: { fontSize: 12, color: '#CBD5E1', fontWeight: '600', flex: 1 }
});

const styles = StyleSheet.create({
  listContainer: { padding: 16 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pendingBadge: { backgroundColor: '#FEF3C7' },
  completedBadge: { backgroundColor: '#D1FAE5' },
  rejectedBadge: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 10, fontWeight: '800' },
  pendingText: { color: '#D97706' },
  completedText: { color: '#059669' },
  rejectedText: { color: '#DC2626' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 10, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  feeText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  netText: { fontSize: 16, fontWeight: '800', color: '#10B981' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { flex: 1, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  approveBtn: { backgroundColor: '#10B981' },
  rejectBtn: { backgroundColor: '#EF4444' },
  btnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 40, fontSize: 14 }
});