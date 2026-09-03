import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, functions } from '../firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

export default function TeamScreen({ navigation, route }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  const [userUid, setUserUid] = useState(auth.currentUser?.uid || "739215");
  const [username, setUsername] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [totalBalance, setTotalBalance] = useState(route?.params?.totalBalance || 0.0);

  const [directMembersData, setDirectMembersData] = useState([]);
  const [totalTeamSize, setTotalTeamSize] = useState(0);
  const [todayJoinings, setTodayJoinings] = useState(0);
  const [monthlyJoinings, setMonthlyJoinings] = useState(0);
  const [monthLabel, setMonthLabel] = useState("");

  // Which of the two direct-member tabs is currently shown. Defaults to
  // "active" since those are the members most relevant to check first.
  const [selectedTab, setSelectedTab] = useState('active');

  // Monthly Reward eligibility -- driven entirely by whatever the admin
  // has configured in Bonus Settings (threshold, reward amount). Never
  // hard-coded here: if the admin changes the requirement, this screen
  // reflects it the next time it loads, automatically.
  const [rewardThreshold, setRewardThreshold] = useState(15);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [activeDirectCount, setActiveDirectCount] = useState(0);
  const [rewardEligible, setRewardEligible] = useState(false);
  const [hasPendingClaim, setHasPendingClaim] = useState(false);
  const [claimingReward, setClaimingReward] = useState(false);

  useEffect(() => {
    const fetchTeamStats = async () => {
      try {
        const calculateStats = httpsCallable(functions, 'calculateTeamStats');
        const result = await calculateStats();
        
        if (result.data) {
          const { totalTeamSize, todayJoinings, monthlyJoinings, monthLabel, directMembersData, referralCode, balance, username } = result.data;
          
          setTotalTeamSize(totalTeamSize || 0);
          setTodayJoinings(todayJoinings || 0);
          setMonthlyJoinings(monthlyJoinings || 0);
          if (monthLabel) setMonthLabel(monthLabel);
          setDirectMembersData(directMembersData || []);
          if (referralCode) setReferralCode(referralCode);
          if (balance !== undefined) setTotalBalance(Number(balance));
          if (username) setUsername(username);
        }
      } catch (error) {
        console.error("Backend Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamStats();
  }, []);

  useEffect(() => {
    const fetchRewardStatus = async () => {
      try {
        const getStatus = httpsCallable(functions, 'getMonthlyRewardStatus');
        const res = await getStatus();
        if (res.data) {
          setRewardThreshold(res.data.threshold || 15);
          setRewardAmount(res.data.rewardAmount || 0);
          setActiveDirectCount(res.data.activeDirectCount || 0);
          setRewardEligible(res.data.eligible === true);
          setHasPendingClaim(res.data.hasPendingClaim === true);
        }
      } catch (error) {
        console.error("Reward status error:", error);
      }
    };
    fetchRewardStatus();
  }, []);

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(title + "\n\n" + message);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleClaimReward = async () => {
    setClaimingReward(true);
    try {
      const claimReward = httpsCallable(functions, 'claimMonthlyReward');
      const res = await claimReward();
      showAlert("Request Submitted", (res.data && res.data.message) || "Your reward claim has been submitted for review.");
      setHasPendingClaim(true);
    } catch (error) {
      showAlert("Error", error.message || "Failed to submit your reward claim.");
    } finally {
      setClaimingReward(false);
    }
  };

  const directMembersCount = directMembersData.length;

  // Splits the user's own direct referrals into two groups based on the
  // backend's isActive flag (true only once that member has made a
  // deposit). This lets a user immediately see which of their referrals
  // are genuinely working the platform versus which ones registered but
  // never followed through, so they know who to reach out to.
  const activeMembers = directMembersData.filter((m) => m.isActive === true);
  const inactiveMembers = directMembersData.filter((m) => m.isActive !== true);
  const displayedMembers = selectedTab === 'active' ? activeMembers : inactiveMembers;

  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  const passState = {
    totalBalance,
    userUid,
    referralCode
  };

  const renderMemberItem = ({ item }) => (
    <View style={currentStyles.memberCard}>
      <View style={styles.memberLeft}>
        <View style={styles.avatarBox}>
          <FontAwesome5 name="user" size={14} color="#3B82F6" />
        </View>
        <Text style={currentStyles.memberUsername}>{item.username}</Text>
      </View>
      <View style={styles.memberRight}>
        <Text style={currentStyles.teamCountLabel}>Team: </Text>
        <Text style={styles.teamCountValue}>{item.totalSubTeam}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[currentStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={currentStyles.container}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#0B0E14" : "#FFFFFF"}
      />

      <View style={currentStyles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>
          {username ? `${username}'s Team Report` : 'Team Report'}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.mainStatsCard}>
          <Text style={styles.mainStatsLabel}>TOTAL TEAM SIZE</Text>
          <Text style={styles.mainStatsValue}>{totalTeamSize}</Text>
          <View style={styles.mainStatsDivider} />
          <View style={styles.mainStatsRow}>
            <View style={styles.subStatBox}>
              <Text style={styles.subStatLabel}>Direct Members</Text>
              <Text style={styles.subStatValue}>{directMembersCount}</Text>
            </View>
            <View style={styles.subStatBox}>
              <Text style={styles.subStatLabel}>Indirect Members</Text>
              <Text style={styles.subStatValue}>{Math.max(0, totalTeamSize - directMembersCount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.gridRow}>
          <View style={currentStyles.growthCard}>
            <View style={[styles.iconIndicator, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <Feather name="user-plus" size={16} color="#22C55E" />
            </View>
            <Text style={styles.growthLabel}>Today's Joined</Text>
            <Text style={[styles.growthValue, { color: '#22C55E' }]}>+{todayJoinings}</Text>
          </View>

          <View style={currentStyles.growthCard}>
            <View style={[styles.iconIndicator, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Feather name="calendar" size={16} color="#3B82F6" />
            </View>
            <Text style={styles.growthLabel}>
              This Month{monthLabel ? ` (${monthLabel})` : ''}
            </Text>
            <Text style={[styles.growthValue, { color: '#3B82F6' }]}>+{monthlyJoinings}</Text>
          </View>
        </View>

        <View style={currentStyles.promoCard}>
          <View style={styles.promoHeaderRow}>
            <FontAwesome5 name="rocket" size={16} color="#3B82F6" />
            <Text style={currentStyles.promoTitle}>Build Your Network, Multiply Earnings</Text>
          </View>
          <Text style={currentStyles.promoDescription}>
            Invite your friends to expand your network. The larger your team grows across all tiers, the more passive high-percentage commissions and network rewards you unlock instantly.
          </Text>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => navigation.navigate('Invitation', passState)}
          >
            <FontAwesome5 name="user-plus" size={14} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.inviteButtonText}>Invite Friends</Text>
          </TouchableOpacity>
        </View>

        <View style={currentStyles.rewardCard}>
          <View style={styles.rewardHeaderRow}>
            <MaterialCommunityIcons name="cash-multiple" size={18} color="#EAB308" />
            <Text style={currentStyles.rewardTitle}>Monthly Reward</Text>
          </View>
          <Text style={styles.rewardProgressText}>
            Active Direct Referrals: {activeDirectCount} / {rewardThreshold}
          </Text>
          {rewardAmount > 0 && (
            <Text style={styles.rewardAmountText}>Reward: {'
          <Text style={currentStyles.listSubTitle}>Monitors Sub-Teams</Text>
        </View>

        <View style={currentStyles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === 'active' && styles.tabButtonActive]}
            onPress={() => setSelectedTab('active')}
          >
            <View style={[styles.tabDot, { backgroundColor: '#22C55E' }]} />
            <Text style={[currentStyles.tabButtonText, selectedTab === 'active' && styles.tabButtonTextActive]}>
              Active ({activeMembers.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === 'inactive' && styles.tabButtonActive]}
            onPress={() => setSelectedTab('inactive')}
          >
            <View style={[styles.tabDot, { backgroundColor: '#94A3B8' }]} />
            <Text style={[currentStyles.tabButtonText, selectedTab === 'inactive' && styles.tabButtonTextActive]}>
              Inactive ({inactiveMembers.length})
            </Text>
          </TouchableOpacity>
        </View>

        {selectedTab === 'inactive' && inactiveMembers.length > 0 && (
          <Text style={currentStyles.inactiveNote}>
            These direct members have registered but haven't made a deposit yet. You may want to check in with them.
          </Text>
        )}

        {displayedMembers.length === 0 ? (
          <View style={currentStyles.emptyCard}>
            <Text style={styles.emptyText}>
              {selectedTab === 'active'
                ? 'No active direct members yet.'
                : 'No inactive direct members — everyone you referred has deposited.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayedMembers}
            renderItem={renderMemberItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
          />
        )}

      </ScrollView>

      <View style={[currentStyles.bottomTabNav, { height: 65 + insets.bottom, paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Home', passState)}>
          <MaterialCommunityIcons name="home" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <MaterialCommunityIcons name="account-group" size={24} color="#3B82F6" />
          <Text style={[styles.tabText, { color: '#3B82F6' }]}>TEAM</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Tasks', passState)}>
          <MaterialCommunityIcons name="clipboard-text" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>TASKS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Support', passState)}>
          <MaterialCommunityIcons name="headset" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>SUPPORT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Me', passState)}>
          <MaterialCommunityIcons name="account" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>ME</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  growthCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  promoCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginTop: 4, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  promoTitle: { fontSize: 13, fontWeight: 'bold', color: '#1E293B', marginLeft: 8 },
  promoDescription: { fontSize: 12, color: '#64748B', lineHeight: 18, marginTop: 8, marginBottom: 14, fontWeight: '500' },
  listTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  listSubTitle: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  memberCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  memberUsername: { fontSize: 13, fontWeight: 'bold', color: '#334155', marginLeft: 10 },
  teamCountLabel: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  bottomTabNav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  tabRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9', gap: 4 },
  tabButtonText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  inactiveNote: { fontSize: 11, color: '#92400E', backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 10, padding: 10, marginBottom: 12, lineHeight: 15, fontWeight: '500' },
  rewardCard: { backgroundColor: '#FFFBEB', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#FDE68A' },
  rewardTitle: { fontSize: 13, fontWeight: 'bold', color: '#92400E', marginLeft: 8 }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  growthCard: { flex: 1, backgroundColor: '#161B22', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#21262D' },
  promoCard: { backgroundColor: '#161B22', borderRadius: 18, padding: 16, marginTop: 4, marginBottom: 20, borderWidth: 1, borderColor: '#21262D' },
  promoTitle: { fontSize: 13, fontWeight: 'bold', color: '#FFFFFF', marginLeft: 8 },
  promoDescription: { fontSize: 12, color: '#94A3B8', lineHeight: 18, marginTop: 8, marginBottom: 14, fontWeight: '500' },
  listTitle: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' },
  listSubTitle: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  memberCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, borderWidth: 1, borderColor: '#21262D' },
  memberUsername: { fontSize: 13, fontWeight: 'bold', color: '#E2E8F0', marginLeft: 10 },
  teamCountLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  emptyCard: { backgroundColor: '#161B22', borderRadius: 14, padding: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#21262D' },
  bottomTabNav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#161B22', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#21262D' },
  tabRow: { flexDirection: 'row', backgroundColor: '#161B22', borderRadius: 14, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: '#21262D', gap: 4 },
  tabButtonText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  inactiveNote: { fontSize: 11, color: '#FDE68A', backgroundColor: '#2A1F05', borderWidth: 1, borderColor: '#92400E', borderRadius: 10, padding: 10, marginBottom: 12, lineHeight: 15, fontWeight: '500' },
  rewardCard: { backgroundColor: '#2A1F05', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#92400E' },
  rewardTitle: { fontSize: 13, fontWeight: 'bold', color: '#FDE68A', marginLeft: 8 }
});

const styles = StyleSheet.create({
  scrollContainer: { paddingHorizontal: 16, paddingTop: 4 },
  backBtn: { padding: 2 },
  mainStatsCard: { backgroundColor: '#3B82F6', borderRadius: 20, padding: 20, marginTop: 16, marginBottom: 12 },
  mainStatsLabel: { color: 'rgba(255, 255, 255, 0.75)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  mainStatsValue: { color: '#FFFFFF', fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginTop: 4 },
  mainStatsDivider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)', marginVertical: 14 },
  mainStatsRow: { flexDirection: 'row' },
  subStatBox: { flex: 1, alignItems: 'center' },
  subStatLabel: { color: 'rgba(255, 255, 255, 0.75)', fontSize: 11, fontWeight: '600' },
  subStatValue: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  iconIndicator: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  growthLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
  growthValue: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  promoHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  inviteButton: { backgroundColor: '#2563EB', height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  inviteButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 2 },
  listContainer: { paddingBottom: 10 },
  memberLeft: { flexDirection: 'row', alignItems: 'center' },
  avatarBox: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center' },
  memberRight: { flexDirection: 'row', alignItems: 'center' },
  teamCountValue: { fontSize: 13, fontWeight: 'bold', color: '#22C55E' },
  emptyText: { color: '#94A3B8', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 9, fontWeight: '700', color: '#94A3B8', marginTop: 3 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 38, borderRadius: 10, gap: 6 },
  tabButtonActive: { backgroundColor: 'rgba(59, 130, 246, 0.12)' },
  tabButtonTextActive: { color: '#3B82F6' },
  tabDot: { width: 7, height: 7, borderRadius: 3.5 },
  rewardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  rewardProgressText: { fontSize: 12, fontWeight: '600', color: '#92400E', marginBottom: 4 },
  rewardAmountText: { fontSize: 12, fontWeight: '700', color: '#92400E', marginBottom: 10 },
  claimRewardBtn: { backgroundColor: '#EAB308', height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  claimRewardBtnDisabled: { backgroundColor: '#94A3B8' },
  claimRewardBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' }
}); + rewardAmount.toFixed(2)} USDT</Text>
          )}
          <TouchableOpacity
            style={[
              styles.claimRewardBtn,
              (!rewardEligible || hasPendingClaim) && styles.claimRewardBtnDisabled
            ]}
            onPress={handleClaimReward}
            disabled={!rewardEligible || hasPendingClaim || claimingReward}
          >
            {claimingReward ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.claimRewardBtnText}>
                {hasPendingClaim ? "Request Pending Review" : (rewardEligible ? "Claim Monthly Reward" : "Requirements Not Met Yet")}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.listHeaderRow}>
          <Text style={currentStyles.listTitle}>Direct Members</Text>
          <Text style={currentStyles.listSubTitle}>Monitors Sub-Teams</Text>
        </View>

        <View style={currentStyles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === 'active' && styles.tabButtonActive]}
            onPress={() => setSelectedTab('active')}
          >
            <View style={[styles.tabDot, { backgroundColor: '#22C55E' }]} />
            <Text style={[currentStyles.tabButtonText, selectedTab === 'active' && styles.tabButtonTextActive]}>
              Active ({activeMembers.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === 'inactive' && styles.tabButtonActive]}
            onPress={() => setSelectedTab('inactive')}
          >
            <View style={[styles.tabDot, { backgroundColor: '#94A3B8' }]} />
            <Text style={[currentStyles.tabButtonText, selectedTab === 'inactive' && styles.tabButtonTextActive]}>
              Inactive ({inactiveMembers.length})
            </Text>
          </TouchableOpacity>
        </View>

        {selectedTab === 'inactive' && inactiveMembers.length > 0 && (
          <Text style={currentStyles.inactiveNote}>
            These direct members have registered but haven't made a deposit yet. You may want to check in with them.
          </Text>
        )}

        {displayedMembers.length === 0 ? (
          <View style={currentStyles.emptyCard}>
            <Text style={styles.emptyText}>
              {selectedTab === 'active'
                ? 'No active direct members yet.'
                : 'No inactive direct members — everyone you referred has deposited.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayedMembers}
            renderItem={renderMemberItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
          />
        )}

      </ScrollView>

      <View style={[currentStyles.bottomTabNav, { height: 65 + insets.bottom, paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Home', passState)}>
          <MaterialCommunityIcons name="home" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <MaterialCommunityIcons name="account-group" size={24} color="#3B82F6" />
          <Text style={[styles.tabText, { color: '#3B82F6' }]}>TEAM</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Tasks', passState)}>
          <MaterialCommunityIcons name="clipboard-text" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>TASKS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Support', passState)}>
          <MaterialCommunityIcons name="headset" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>SUPPORT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Me', passState)}>
          <MaterialCommunityIcons name="account" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>ME</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  growthCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  promoCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginTop: 4, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  promoTitle: { fontSize: 13, fontWeight: 'bold', color: '#1E293B', marginLeft: 8 },
  promoDescription: { fontSize: 12, color: '#64748B', lineHeight: 18, marginTop: 8, marginBottom: 14, fontWeight: '500' },
  listTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  listSubTitle: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  memberCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  memberUsername: { fontSize: 13, fontWeight: 'bold', color: '#334155', marginLeft: 10 },
  teamCountLabel: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  bottomTabNav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  tabRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9', gap: 4 },
  tabButtonText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  inactiveNote: { fontSize: 11, color: '#92400E', backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 10, padding: 10, marginBottom: 12, lineHeight: 15, fontWeight: '500' }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  growthCard: { flex: 1, backgroundColor: '#161B22', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#21262D' },
  promoCard: { backgroundColor: '#161B22', borderRadius: 18, padding: 16, marginTop: 4, marginBottom: 20, borderWidth: 1, borderColor: '#21262D' },
  promoTitle: { fontSize: 13, fontWeight: 'bold', color: '#FFFFFF', marginLeft: 8 },
  promoDescription: { fontSize: 12, color: '#94A3B8', lineHeight: 18, marginTop: 8, marginBottom: 14, fontWeight: '500' },
  listTitle: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' },
  listSubTitle: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  memberCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, borderWidth: 1, borderColor: '#21262D' },
  memberUsername: { fontSize: 13, fontWeight: 'bold', color: '#E2E8F0', marginLeft: 10 },
  teamCountLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  emptyCard: { backgroundColor: '#161B22', borderRadius: 14, padding: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#21262D' },
  bottomTabNav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#161B22', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#21262D' },
  tabRow: { flexDirection: 'row', backgroundColor: '#161B22', borderRadius: 14, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: '#21262D', gap: 4 },
  tabButtonText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  inactiveNote: { fontSize: 11, color: '#FDE68A', backgroundColor: '#2A1F05', borderWidth: 1, borderColor: '#92400E', borderRadius: 10, padding: 10, marginBottom: 12, lineHeight: 15, fontWeight: '500' }
});

const styles = StyleSheet.create({
  scrollContainer: { paddingHorizontal: 16, paddingTop: 4 },
  backBtn: { padding: 2 },
  mainStatsCard: { backgroundColor: '#3B82F6', borderRadius: 20, padding: 20, marginTop: 16, marginBottom: 12 },
  mainStatsLabel: { color: 'rgba(255, 255, 255, 0.75)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  mainStatsValue: { color: '#FFFFFF', fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginTop: 4 },
  mainStatsDivider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)', marginVertical: 14 },
  mainStatsRow: { flexDirection: 'row' },
  subStatBox: { flex: 1, alignItems: 'center' },
  subStatLabel: { color: 'rgba(255, 255, 255, 0.75)', fontSize: 11, fontWeight: '600' },
  subStatValue: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  iconIndicator: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  growthLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
  growthValue: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  promoHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  inviteButton: { backgroundColor: '#2563EB', height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  inviteButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 2 },
  listContainer: { paddingBottom: 10 },
  memberLeft: { flexDirection: 'row', alignItems: 'center' },
  avatarBox: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center' },
  memberRight: { flexDirection: 'row', alignItems: 'center' },
  teamCountValue: { fontSize: 13, fontWeight: 'bold', color: '#22C55E' },
  emptyText: { color: '#94A3B8', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 9, fontWeight: '700', color: '#94A3B8', marginTop: 3 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 38, borderRadius: 10, gap: 6 },
  tabButtonActive: { backgroundColor: 'rgba(59, 130, 246, 0.12)' },
  tabButtonTextActive: { color: '#3B82F6' },
  tabDot: { width: 7, height: 7, borderRadius: 3.5 }
});