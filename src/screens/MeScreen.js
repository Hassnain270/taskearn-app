import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { ThemeContext } from '../../ThemeContext';

export default function MeScreen({ navigation }) {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const [balance, setBalance] = useState(0.0);
  const [todayEarnings, setTodayEarnings] = useState(0.0);
  const [taskCount, setTaskCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [username, setUsername] = useState('User');
  const [userUid, setUserUid] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUserUid(currentUser.uid.substring(0, 8).toUpperCase());
      const userRef = doc(db, 'users', currentUser.uid);

      unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.username || data.name) setUsername(data.username || data.name);
          if (data.totalBalance !== undefined) setBalance(Number(data.totalBalance));
          else if (data.balance !== undefined) setBalance(Number(data.balance));

          if (data.todayIncome !== undefined) setTodayEarnings(Number(data.todayIncome));
          else if (data.todayEarnings !== undefined) setTodayEarnings(Number(data.todayEarnings));

          if (data.taskCount !== undefined) setTaskCount(Number(data.taskCount));
          
          if (data.isAdmin === true) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        }
      }, (error) => {
        console.error("Firebase Snapshot Error: ", error);
      });
    }
    return () => unsubscribe();
  }, []);

  const getLiveVipLevel = (currentBalance) => {
    if (currentBalance >= 20000.0) return "VIP 10";
    if (currentBalance >= 10000.0) return "VIP 9";
    if (currentBalance >= 5000.0) return "VIP 8";
    if (currentBalance >= 3000.0) return "VIP 7";
    if (currentBalance >= 1500.0) return "VIP 6";
    if (currentBalance >= 1000.0) return "VIP 5";
    if (currentBalance >= 500.0) return "VIP 4";
    if (currentBalance >= 300.0) return "VIP 3";
    if (currentBalance >= 150.0) return "VIP 2";
    if (currentBalance >= 70.0) return "VIP 1";
    return "No VIP";
  };

  const vipLevel = getLiveVipLevel(balance);
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  const safeNavigate = (targetScreen, params = {}) => {
    try {
      if (navigation) {
        if (typeof navigation.navigate === 'function') {
          navigation.navigate(targetScreen, params);
        } else if (typeof navigation.push === 'function') {
          navigation.push(targetScreen, params);
        }
      }
    } catch (err) {
      console.log("Navigation error:", err);
    }
  };

  const handleLanguageAlert = () => {
    if (Platform.OS === 'web') {
      window.alert("System Language: English (US) is currently the default system language. Multi-language configurations will be operational in future updates.");
    } else {
      Alert.alert(
        "System Language",
        "English (US) is currently the default system language. Multi-language configurations will be operational in future updates."
      );
    }
  };

  // Signing out only ends the Firebase Auth session. It deliberately does
  // NOT wipe local device storage (AsyncStorage/localStorage), because that
  // storage holds per-user-scoped data that needs to survive a logout:
  // Passkey login credentials (keyed by uid) and today's local task activity
  // cache (also keyed by uid). Wiping everything on logout previously broke
  // both of those features.
  const performLogoutProcess = async () => {
    try {
      await signOut(auth);
    } catch (authErr) {
      console.log("Firebase SignOut Error:", authErr);
    }

    try {
      if (navigation) {
        if (typeof navigation.reset === 'function') {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        } else if (typeof navigation.replace === 'function') {
          navigation.replace('Login');
        } else if (typeof navigation.navigate === 'function') {
          navigation.navigate('Login');
        }
      }
    } catch (navErr) {
      console.log("Navigation Error:", navErr);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm("Are you sure you want to end your current session?");
      if (confirmLogout) {
        performLogoutProcess();
      }
    } else {
      Alert.alert(
        "Confirm Logout",
        "Are you sure you want to end your current session?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "OK",
            onPress: performLogoutProcess
          }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={currentStyles.container}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#0B0E14" : "#FFFFFF"}
      />

      <View style={currentStyles.header}>
        <TouchableOpacity onPress={() => safeNavigate('Home')} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={30} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Profile Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: (Platform.OS === 'web' ? 140 : 110) + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.avatarSection}>
          <View style={currentStyles.avatarCircle}>
            <FontAwesome5 name="user" size={32} color={isDarkMode ? "#94A3B8" : "#3B82F6"} />
          </View>
          <View style={styles.vipBadge}>
            <Text style={styles.vipText}>{vipLevel}</Text>
          </View>
          <Text style={currentStyles.nameText}>{username}</Text>
          <Text style={styles.affiliateText}>UID: {userUid || "N/A"}</Text>
          <Text style={[styles.balancePreviewText, { color: isDarkMode ? "#60A5FA" : "#3B82F6" }]}>
            Live Balance: ${balance.toFixed(2)}
          </Text>
        </View>

        <Text style={styles.sectionHeading}>PERSONAL MANAGEMENT</Text>

        <View style={currentStyles.optionsGroup}>
          <TouchableOpacity
            style={currentStyles.optionItem}
            activeOpacity={0.7}
            onPress={() => safeNavigate('ProfileParticulars')}
          >
            <View style={styles.optionLeft}>
              <View style={currentStyles.iconWrapper}>
                <Feather name="user" size={16} color={isDarkMode ? "#94A3B8" : "#64748B"} />
              </View>
              <Text style={currentStyles.optionTitle}>Profile Particulars</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <View style={currentStyles.divider} />

          <TouchableOpacity
            style={currentStyles.optionItem}
            activeOpacity={0.7}
            onPress={() => safeNavigate('Settlement')}
          >
            <View style={styles.optionLeft}>
              <View style={currentStyles.iconWrapper}>
                <Feather name="settings" size={16} color={isDarkMode ? "#94A3B8" : "#64748B"} />
              </View>
              <Text style={currentStyles.optionTitle}>Wallet Configuration</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <View style={currentStyles.divider} />

          <TouchableOpacity
            style={currentStyles.optionItem}
            activeOpacity={0.7}
            onPress={() => safeNavigate('SecurityScreen')}
          >
            <View style={styles.optionLeft}>
              <View style={currentStyles.iconWrapper}>
                <Feather name="shield" size={16} color={isDarkMode ? "#94A3B8" : "#64748B"} />
              </View>
              <Text style={currentStyles.optionTitle}>Security & Auth</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {isAdmin && (
          <>
            <Text style={styles.sectionHeading}>ADMINISTRATION</Text>
            <View style={currentStyles.optionsGroup}>
              <TouchableOpacity
                style={currentStyles.optionItem}
                activeOpacity={0.7}
                onPress={() => safeNavigate('AdminWithdrawalsScreen')}
              >
                <View style={styles.optionLeft}>
                  <View style={[currentStyles.iconWrapper, { backgroundColor: isDarkMode ? '#1E293B' : '#EFF6FF' }]}>
                    <Feather name="check-square" size={16} color="#2563EB" />
                  </View>
                  <Text style={[currentStyles.optionTitle, { color: '#2563EB', fontWeight: '700' }]}>
                    Withdrawal Approvals
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color="#2563EB" />
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={styles.sectionHeading}>APP OPTIONS</Text>

        <View style={currentStyles.optionsGroup}>
          <TouchableOpacity style={currentStyles.optionItem} activeOpacity={0.7} onPress={handleLanguageAlert}>
            <View style={styles.optionLeft}>
              <View style={currentStyles.iconWrapper}>
                <Feather name="globe" size={16} color={isDarkMode ? "#94A3B8" : "#64748B"} />
              </View>
              <Text style={currentStyles.optionTitle}>System Language</Text>
            </View>
            <View style={styles.optionRight}>
              <Text style={styles.rightValueText}>English (US)</Text>
              <Feather name="chevron-right" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <View style={currentStyles.divider} />

          <TouchableOpacity style={currentStyles.optionItem} activeOpacity={0.7} onPress={toggleTheme}>
            <View style={styles.optionLeft}>
              <View style={currentStyles.iconWrapper}>
                <Feather name={isDarkMode ? "moon" : "sun"} size={16} color={isDarkMode ? "#94A3B8" : "#64748B"} />
              </View>
              <Text style={currentStyles.optionTitle}>Interface Theme</Text>
            </View>
            <View style={styles.optionRight}>
              <Text style={styles.rightValueText}>{isDarkMode ? "Dark Mode" : "Light Mode"}</Text>
              <Feather name="chevron-right" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={currentStyles.logoutButton}
          activeOpacity={0.7}
          onPress={handleLogout}
        >
          <MaterialCommunityIcons name="logout" size={16} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>End Session</Text>
        </TouchableOpacity>

      </ScrollView>

      <View style={[currentStyles.bottomTabNav, { height: 65 + insets.bottom, paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.tabItem} activeOpacity={0.7} onPress={() => safeNavigate('Home')}>
          <MaterialCommunityIcons name="home" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => safeNavigate('Team')}
        >
          <MaterialCommunityIcons name="account-group" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>TEAM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => safeNavigate('Tasks')}
        >
          <MaterialCommunityIcons name="clipboard-text" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>TASKS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => safeNavigate('Support')}
        >
          <MaterialCommunityIcons name="headset" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>SUPPORT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} activeOpacity={0.7}>
          <MaterialCommunityIcons name="account" size={24} color="#3B82F6" />
          <Text style={[styles.tabText, { color: '#3B82F6' }]}>ME</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    height: Platform.OS === 'web' ? '100vh' : '100%'
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  avatarCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  nameText: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginTop: 10, letterSpacing: -0.3 },
  optionsGroup: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14 },
  iconWrapper: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  optionTitle: { fontSize: 13, fontWeight: '600', color: '#334155' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 58 },
  logoutButton: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 25, borderWidth: 1, borderColor: '#F1F5F9' },
  bottomTabNav: { backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E2E8F0' }
});

const darkStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
    height: Platform.OS === 'web' ? '100vh' : '100%'
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  avatarCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#161B22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  nameText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginTop: 10, letterSpacing: -0.3 },
  optionsGroup: { backgroundColor: '#161B22', borderRadius: 16, borderWidth: 1, borderColor: '#21262D', overflow: 'hidden' },
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14 },
  iconWrapper: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#0B0E14', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#21262D' },
  optionTitle: { fontSize: 13, fontWeight: '600', color: '#E2E8F0' },
  divider: { height: 1, backgroundColor: '#21262D', marginLeft: 58 },
  logoutButton: { flexDirection: 'row', backgroundColor: '#161B22', borderRadius: 14, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 25, borderWidth: 1, borderColor: '#21262D' },
  bottomTabNav: { backgroundColor: '#161B22', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#21262D' }
});

const styles = StyleSheet.create({
  scrollContainer: { paddingHorizontal: 20, paddingTop: 10 },
  backBtn: { padding: 5 },
  avatarSection: { alignItems: 'center', marginTop: 20, marginBottom: 25 },
  vipBadge: { backgroundColor: '#EAB308', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, position: 'absolute', top: 58 },
  vipText: { fontSize: 9, fontWeight: 'bold', color: '#000000' },
  affiliateText: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginTop: 4, letterSpacing: 0.5 },
  balancePreviewText: { fontSize: 11, fontWeight: '700', marginTop: 6, letterSpacing: 0.2 },
  sectionHeading: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginTop: 16, marginBottom: 8, paddingLeft: 4 },
  optionLeft: { flexDirection: 'row', alignItems: 'center' },
  optionRight: { flexDirection: 'row', alignItems: 'center' },
  rightValueText: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginRight: 8 },
  logoutText: { fontSize: 13, fontWeight: '700', color: '#EF4444' },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 9, fontWeight: '700', color: '#94A3B8', marginTop: 3 }
});