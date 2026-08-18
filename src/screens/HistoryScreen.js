import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { ThemeContext } from '../../ThemeContext';

export default function HistoryScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState('All');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const txList = snapshot.docs.map((doc) => {
          const data = doc.data();

          let displayType = data.title || data.type || 'Transaction';
          if (data.type === 'DEPOSIT') displayType = 'Deposit';
          else if (data.type === 'WITHDRAWAL') displayType = 'Withdrawal';
          else if (data.type === 'WELCOME_BONUS') displayType = 'Welcome Bonus (7%)';
          else if (data.type === 'DIRECT_REFERRAL_BONUS') displayType = 'Direct Bonus (10%)';
          else if (data.type === 'INDIRECT_REFERRAL_BONUS') displayType = 'Indirect Bonus (5%)';
          else if (data.type === 'VIP_UPGRADE_BONUS') displayType = 'VIP Upgrade Bonus (5%)';
          else if (data.type === 'TASK_PROFIT') displayType = 'Task Commission';

          const isDebit = data.type === 'WITHDRAWAL' || data.isCredit === false;
          const isCredit = !isDebit;

          const rawStatus = (data.status || 'APPROVED').toUpperCase();
          let formattedStatus = 'APPROVED';
          if (rawStatus === 'PENDING') formattedStatus = 'PENDING';
          else if (rawStatus === 'REJECTED' || rawStatus === 'FAILED') formattedStatus = 'REJECTED';

          return {
            id: doc.id,
            type: displayType,
            rawType: data.type,
            amount: Number(data.amount) || 0,
            isCredit: isCredit,
            date: formatDate(data.createdAt),
            hasStatus: ['DEPOSIT', 'WITHDRAWAL'].includes(data.type),
            status: formattedStatus,
            txId: data.transactionId || data.txId || doc.id.substring(0, 10).toUpperCase()
          };
        });
        setTransactions(txList);
        setLoading(false);
      },
      (error) => {
        console.log('Error fetching transaction history:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const dateObj = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredData = transactions.filter((item) => {
    if (activeTab === 'Credits') return item.isCredit;
    if (activeTab === 'Debits') return !item.isCredit;
    return true;
  });

  const getStatusStyle = (status) => {
    if (status === 'APPROVED') return styles.statusApproved;
    if (status === 'PENDING') return styles.statusPending;
    return styles.statusRejected;
  };

  const getStatusTextColor = (status) => {
    if (status === 'APPROVED') return '#22C55E';
    if (status === 'PENDING') return '#F59E0B';
    return '#EF4444';
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'DEPOSIT':
        return 'wallet-plus-outline';
      case 'WITHDRAWAL':
        return 'wallet-minus-outline';
      case 'WELCOME_BONUS':
        return 'gift-outline';
      case 'DIRECT_REFERRAL_BONUS':
        return 'account-plus-outline';
      case 'INDIRECT_REFERRAL_BONUS':
        return 'account-group-outline';
      case 'VIP_UPGRADE_BONUS':
        return 'star-circle-outline';
      case 'TASK_PROFIT':
        return 'checkbox-marked-circle-outline';
      default:
        return 'swap-horizontal';
    }
  };

  const renderHistoryItem = ({ item }) => (
    <View style={currentStyles.historyCard}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name={getTypeIcon(item.rawType)}
          size={24}
          color={item.isCredit ? '#22C55E' : '#EF4444'}
        />
      </View>
      <View style={styles.cardLeft}>
        <Text style={currentStyles.typeText}>{item.type}</Text>
        <Text style={styles.txIdText}>TxID: {item.txId}</Text>
        <Text style={styles.dateText}>{item.date}</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={[styles.amountText, { color: item.isCredit ? '#22C55E' : '#EF4444' }]}>
          {item.isCredit ? '+' : '-'}${item.amount.toFixed(2)}
        </Text>
        {item.hasStatus && (
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={[styles.statusText, { color: getStatusTextColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={currentStyles.container}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#0B0E14' : '#FFFFFF'}
      />

      <View style={currentStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={30} color={isDarkMode ? '#FFFFFF' : '#1E293B'} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Transaction History</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={currentStyles.tabBar}>
        {['All', 'Credits', 'Debits'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && currentStyles.activeTabItem]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab ? styles.activeTabText : styles.inactiveTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={filteredData.length === 0 ? styles.emptyContainer : styles.listContainer}
          ItemSeparatorComponent={() => <View style={currentStyles.divider} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="history" size={48} color={isDarkMode ? '#484F58' : '#94A3B8'} />
              <Text style={[styles.emptyText, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                No transactions found
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', justifyContent: 'space-around' },
  activeTabItem: { borderBottomColor: '#3B82F6' },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  typeText: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  divider: { height: 1, backgroundColor: '#F1F5F9' }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  tabBar: { flexDirection: 'row', backgroundColor: '#161B22', paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#21262D', justifyContent: 'space-around' },
  activeTabItem: { borderBottomColor: '#3B82F6' },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, backgroundColor: '#161B22' },
  typeText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  divider: { height: 1, backgroundColor: '#21262D' }
});

const styles = StyleSheet.create({
  backBtn: { padding: 5 },
  tabItem: { paddingVertical: 8, paddingHorizontal: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '700' },
  activeTabText: { color: '#3B82F6' },
  inactiveTabText: { color: '#94A3B8' },
  listContainer: { paddingBottom: 20 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyText: { marginTop: 10, fontSize: 14, fontWeight: '600' },
  iconContainer: { paddingRight: 12, justifyContent: 'center', alignItems: 'center' },
  cardLeft: { flex: 1, paddingRight: 10 },
  txIdText: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 4 },
  dateText: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', justifyContent: 'center' },
  amountText: { fontSize: 16, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 6, alignItems: 'center', justifyContent: 'center' },
  statusApproved: { backgroundColor: 'rgba(34, 197, 94, 0.12)' },
  statusPending: { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
  statusRejected: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
  statusText: { fontSize: 9, fontWeight: 'bold', letterSpacing: 0.3 }
});
