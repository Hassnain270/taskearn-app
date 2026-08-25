import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  Easing,
  ActivityIndicator,
  Platform,
  Linking,
  Image
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ThemeContext } from '../../ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

const APK_DOWNLOAD_URL = 'https://firebasestorage.googleapis.com/v0/b/taskearn-e5c35.firebasestorage.app/o/TaskEarn.apk?alt=media';

const baseTickerData = [
  { prefix: "kha", suffix: "7", amount: 45.00 },
  { prefix: "san", suffix: "1", amount: 120.00 },
  { prefix: "zai", suffix: "9", amount: 15.50 },
  { prefix: "ali", suffix: "5", amount: 85.00 },
  { prefix: "joh", suffix: "2", amount: 730.00 },
  { prefix: "fat", suffix: "8", amount: 1299.00 },
  { prefix: "ale", suffix: "4", amount: 370.00 },
  { prefix: "riz", suffix: "3", amount: 23.00 },
  { prefix: "smi", suffix: "6", amount: 663.00 },
  { prefix: "bil", suffix: "9", amount: 47.85 },
  { prefix: "iqr", suffix: "2", amount: 3500.00 },
  { prefix: "dav", suffix: "7", amount: 1309.00 },
  { prefix: "tay", suffix: "b4", amount: 4728.00 },
  { prefix: "aye", suffix: "1", amount: 135.00 },
  { prefix: "was", suffix: "5", amount: 2730.00 },
  { prefix: "amn", suffix: "3", amount: 201.00 },
  { prefix: "rya", suffix: "9", amount: 600.00 },
  { prefix: "has", suffix: "2", amount: 91.00 },
  { prefix: "emm", suffix: "6", amount: 210.00 },
  { prefix: "ume", suffix: "8", amount: 5390.00 },
  { prefix: "sof", suffix: "4", amount: 942.00 },
  { prefix: "asi", suffix: "1", amount: 70.00 },
  { prefix: "lia", suffix: "7", amount: 55.00 },
  { prefix: "nid", suffix: "3", amount: 20.00 },
  { prefix: "luc", suffix: "5", amount: 87.00 },
  { prefix: "ham", suffix: "9", amount: 115.00 },
  { prefix: "mar", suffix: "2", amount: 95.00 },
  { prefix: "saa", suffix: "6", amount: 250.00 },
  { prefix: "noa", suffix: "4", amount: 40.00 },
  { prefix: "zoy", suffix: "1", amount: 75.00 },
  { prefix: "jac", suffix: "8", amount: 55.00 },
  { prefix: "tar", suffix: "3", amount: 190.00 },
  { prefix: "oli", suffix: "5", amount: 30.00 },
  { prefix: "fai", suffix: "7", amount: 165.00 },
  { prefix: "mia", suffix: "2", amount: 42.00 },
  { prefix: "usm", suffix: "9", amount: 280.00 },
  { prefix: "eth", suffix: "4", amount: 65.00 },
  { prefix: "sad", suffix: "1", amount: 195.00 },
  { prefix: "chl", suffix: "6", amount: 38.00 },
  { prefix: "abi", suffix: "8", amount: 125.00 },
  { prefix: "mas", suffix: "3", amount: 50.00 },
  { prefix: "sab", suffix: "5", amount: 310.00 },
  { prefix: "zoe", suffix: "7", amount: 48.00 },
  { prefix: "qas", suffix: "2", amount: 160.00 },
  { prefix: "owe", suffix: "9", amount: 28.00 },
  { prefix: "reh", suffix: "4", amount: 88.00 },
  { prefix: "lil", suffix: "1", amount: 175.00 },
  { prefix: "irf", suffix: "6", amount: 52.00 },
  { prefix: "mil", suffix: "8", amount: 90.00 },
  { prefix: "yas", suffix: "3", amount: 230.00 },
  { prefix: "lau", suffix: "5", amount: 33.00 },
  { prefix: "kas", suffix: "7", amount: 145.00 },
  { prefix: "imr", suffix: "4", amount: 315.00 },
  { prefix: "tan", suffix: "8", amount: 85.00 },
  { prefix: "ana", suffix: "2", amount: 140.00 },
  { prefix: "sha", suffix: "9", amount: 620.00 },
  { prefix: "fiz", suffix: "5", amount: 45.50 },
  { prefix: "kam", suffix: "1", amount: 2100.00 },
  { prefix: "mah", suffix: "7", amount: 185.00 },
  { prefix: "ade", suffix: "3", amount: 95.00 },
  { prefix: "sid", suffix: "6", amount: 340.00 },
  { prefix: "nav", suffix: "0", amount: 1250.00 },
  { prefix: "aro", suffix: "4", amount: 65.00 },
  { prefix: "bab", suffix: "2", amount: 430.00 },
  { prefix: "mom", suffix: "9", amount: 110.00 },
  { prefix: "far", suffix: "5", amount: 520.00 },
  { prefix: "sai", suffix: "8", amount: 280.00 },
  { prefix: "reh", suffix: "1", amount: 950.00 },
  { prefix: "kom", suffix: "3", amount: 165.00 },
  { prefix: "waq", suffix: "7", amount: 740.00 },
  { prefix: "nim", suffix: "6", amount: 55.00 },
  { prefix: "ati", suffix: "2", amount: 320.00 },
  { prefix: "jaw", suffix: "9", amount: 890.00 },
  { prefix: "bus", suffix: "4", amount: 115.00 },
  { prefix: "ars", suffix: "1", amount: 640.00 },
  { prefix: "nab", suffix: "5", amount: 175.00 },
  { prefix: "meh", suffix: "8", amount: 230.00 },
  { prefix: "har", suffix: "3", amount: 410.00 },
  { prefix: "zar", suffix: "0", amount: 135.00 },
  { prefix: "saj", suffix: "6", amount: 580.00 },
  { prefix: "uza", suffix: "2", amount: 90.00 },
  { prefix: "foz", suffix: "7", amount: 210.00 },
  { prefix: "cry", suffix: "x2", amount: 1450.00 },
  { prefix: "bit", suffix: "n1", amount: 2850.00 },
  { prefix: "eth", suffix: "v5", amount: 3920.00 },
  { prefix: "dex", suffix: "m8", amount: 4180.00 },
  { prefix: "max", suffix: "k3", amount: 5600.00 },
  { prefix: "win", suffix: "r7", amount: 6250.00 },
  { prefix: "sol", suffix: "p9", amount: 7340.00 },
  { prefix: "run", suffix: "w4", amount: 8450.00 },
  { prefix: "sky", suffix: "z1", amount: 9120.00 },
  { prefix: "fox", suffix: "q6", amount: 1850.00 },
  { prefix: "neo", suffix: "x9", amount: 2940.00 },
  { prefix: "zen", suffix: "y2", amount: 3180.00 },
  { prefix: "alpha", suffix: "7", amount: 4650.00 },
  { prefix: "beta", suffix: "3", amount: 5890.00 },
  { prefix: "giga", suffix: "9", amount: 6730.00 },
  { prefix: "mega", suffix: "1", amount: 7900.00 },
  { prefix: "tera", suffix: "5", amount: 8850.00 },
  { prefix: "peta", suffix: "8", amount: 9480.00 }
];

const generateRandomTickerText = () => {
  const shuffled = [...baseTickerData];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.map(item => {
    const variation = (Math.random() * 200 - 100);
    const finalAmount = Math.max(15, item.amount + variation).toFixed(2);
    return `User ${item.prefix}***${item.suffix} just withdrew ${finalAmount} USDT successfully`;
  }).join(" • ");
};

const bannerData = [
  { id: 1, title: "Invite Friends & Team Commission", desc: "Get 10% instant commission on Level 1 direct members and 5% recurring bonus on Level 2 indirect team task completions.", icon: "account-multiple-plus", color: "#10B981" },
  { id: 2, title: "Daily Task Reward Model", desc: "Complete exactly 5 orders daily to qualify for profit settlement. Higher VIPs unlock bigger profits.", icon: "clipboard-check", color: "#3B82F6" },
  { id: 3, title: "Sign-Up Bonus Promo", desc: "Exclusive 7% balance bonus on your first-ever deposit. Boost your trading capital instantly.", icon: "gift", color: "#EAB308" }
];

export default function HomeScreen({ navigation, route }) {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("Loading...");
  const [userUid, setUserUid] = useState("");
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0.00);
  const [todayIncome, setTodayIncome] = useState(0.00);
  const [lastTaskReset, setLastTaskReset] = useState(null);
  const [totalEarnings, setTotalEarnings] = useState(0.00);
  const [totalWithdraw, setTotalWithdraw] = useState(0.00);
  const [teamReward, setTeamReward] = useState(0.00);
  const [taskCount, setTaskCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [combinedTickerText, setCombinedTickerText] = useState("");
  const translateX = useRef(new Animated.Value(screenWidth)).current;
  const [textWidth, setTextWidth] = useState(0);
  const bannerRef = useRef(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

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

  const vipLevel = getLiveVipLevel(totalBalance);

  // Same 4 PM UTC (9 PM PKT) daily boundary used everywhere else (Tasks
  // screen, backend). The server only actually resets todayEarnings the
  // NEXT time a task is completed, so if the day has rolled over and no
  // task has been done yet today, the stored Firestore value is stale —
  // this computes the correct "live" value for display without needing to
  // wait for a task to be completed.
  const getCurrentDayBoundary = () => {
    const now = new Date();
    let boundary = new Date();
    boundary.setUTCHours(16, 0, 0, 0);
    if (now.getTime() < boundary.getTime()) {
      boundary.setUTCDate(boundary.getUTCDate() - 1);
    }
    return boundary;
  };

  const isStoredTodayIncomeStale = () => {
    if (!lastTaskReset) return false;
    const boundary = getCurrentDayBoundary();
    return lastTaskReset.getTime() < boundary.getTime();
  };

  const effectiveTodayIncome = isStoredTodayIncomeStale() ? 0 : todayIncome;

  useEffect(() => {
    setCombinedTickerText(generateRandomTickerText());
  }, []);

  useEffect(() => {
    let unsubscribeFirestore = null;

    const passedUser = route?.params?.userData;
    if (passedUser) {
      setUserUid(passedUser.uid || "");
      setUsername(passedUser.username || "User");
      setTotalBalance(Number(passedUser.balance || 0));
      setTodayIncome(Number(passedUser.todayEarnings || 0));
      setTotalEarnings(Number(passedUser.totalEarnings || 0));
      setTotalWithdraw(Number(passedUser.totalWithdraw || 0));
      setTeamReward(Number(passedUser.teamReward || 0));
      setTaskCount(Number(passedUser.taskCount || 0));
      if (passedUser.lastTaskReset) {
        const resetDate = typeof passedUser.lastTaskReset.toDate === 'function'
          ? passedUser.lastTaskReset.toDate()
          : new Date(passedUser.lastTaskReset);
        setLastTaskReset(resetDate);
      }
      setLoading(false);
    }

    const attachDocListener = (uid) => {
      setUserUid(uid);
      if (unsubscribeFirestore) unsubscribeFirestore();
      
      const userRef = doc(db, "users", uid);
      unsubscribeFirestore = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUsername(data.username || "User");
          setTotalBalance(Number(data.balance || 0));
          setTodayIncome(Number(data.todayEarnings || 0));
          setTotalEarnings(Number(data.totalEarnings || 0));
          setTotalWithdraw(Number(data.totalWithdraw || 0));
          setTeamReward(Number(data.teamReward || 0));
          setTaskCount(Number(data.taskCount || 0));
          if (data.lastTaskReset) {
            const resetDate = typeof data.lastTaskReset.toDate === 'function'
              ? data.lastTaskReset.toDate()
              : new Date(data.lastTaskReset);
            setLastTaskReset(resetDate);
          } else {
            setLastTaskReset(null);
          }
        }
        setLoading(false);
      }, (error) => {
        setLoading(false);
      });
    };

    if (auth.currentUser?.uid) {
      attachDocListener(auth.currentUser.uid);
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        attachDocListener(user.uid);
      } else if (!passedUser) {
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      unsubscribeAuth();
    };
  }, [route?.params?.userData]);

  useEffect(() => {
    if (textWidth === 0) return;
    const startAnimation = () => {
      translateX.setValue(screenWidth - 140);
      Animated.timing(translateX, {
        toValue: -textWidth,
        duration: (textWidth + screenWidth) * 18,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web'
      }).start((finished) => { if (finished) startAnimation(); });
    };
    startAnimation();
    return () => translateX.stopAnimation();
  }, [textWidth, combinedTickerText]);

  useEffect(() => {
    const timer = setInterval(() => {
      let nextIndex = (currentBannerIndex + 1) % bannerData.length;
      setCurrentBannerIndex(nextIndex);
      bannerRef.current?.scrollTo({ x: nextIndex * (screenWidth - 32), animated: true });
    }, 4000);
    return () => clearInterval(timer);
  }, [currentBannerIndex]);

  const handleDownloadApp = () => {
    Linking.openURL(APK_DOWNLOAD_URL).catch(() => {});
  };

  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  if (loading) {
    return (
      <SafeAreaView style={[currentStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#3B82F6" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={currentStyles.container}>
      <StatusBar backgroundColor={isDarkMode ? "#0B0E14" : "#FFFFFF"} barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <View style={currentStyles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <Image source={require('../../assets/icon.png')} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Text style={currentStyles.appTitle}>TaskEarn</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleTheme} style={styles.headerIcon}>
            <Feather color={isDarkMode ? "#F59E0B" : "#1E293B"} name={isDarkMode ? "sun" : "moon"} size={22} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Notices')} style={styles.headerIcon}>
            <Feather color={isDarkMode ? "#E2E8F0" : "#1E293B"} name="bell" size={22} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={true} 
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: 120 + insets.bottom }]}
        style={Platform.OS === 'web' ? { flex: 1, overflowY: 'auto' } : { flex: 1 }}
      >
        <View style={styles.profileRow}>
          <View style={styles.statusDot} />
          <Text style={currentStyles.usernameText}>{username}</Text>
        </View>

        <View style={styles.walletCard}>
          <View style={styles.walletCardHeader}>
            <Text style={styles.walletLabel}>TOTAL BALANCE</Text>
            <View style={styles.vipBadge}>
              <FontAwesome5 name="crown" size={10} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.vipText}>{vipLevel}</Text>
            </View>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceAmount}>${totalBalance.toFixed(2)}</Text>
            <Text style={styles.currencyText}>USDT</Text>
          </View>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Deposit')} style={styles.actionBtn}>
              <Feather name="arrow-down" size={16} color="#3B82F6" />
              <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>Deposit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('WithdrawAssets', { totalBalance, taskCount })} style={[styles.actionBtn, styles.withdrawBtn]}>
              <Feather name="arrow-up" size={16} color="#FFFFFF" />
              <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={currentStyles.statsCard}>
            <Text style={styles.statsLabel}>TODAY'S INCOME</Text>
            <Text style={[styles.statsValue, { color: '#22C55E' }]}>${effectiveTodayIncome.toFixed(2)}</Text>
          </View>
          <View style={currentStyles.statsCard}>
            <Text style={styles.statsLabel}>TOTAL EARNINGS</Text>
            <Text style={[styles.statsValue, { color: '#3B82F6' }]}>${totalEarnings.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={currentStyles.statsCard}>
            <Text style={styles.statsLabel}>TOTAL WITHDRAW</Text>
            <Text style={[styles.statsValue, { color: '#EF4444' }]}>${totalWithdraw.toFixed(2)}</Text>
          </View>
          <View style={currentStyles.statsCard}>
            <Text style={styles.statsLabel}>TEAM REWARD</Text>
            <Text style={[styles.statsValue, { color: '#EAB308' }]}>${teamReward.toFixed(2)}</Text>
          </View>
        </View>

        <View style={currentStyles.tickerContainer}>
          <View style={styles.tickerHeader}>
            <MaterialCommunityIcons name="volume-high" size={18} color="#3B82F6" />
          </View>
          <View style={styles.tickerBox}>
            <ScrollView horizontal scrollEnabled={false} contentContainerStyle={{ alignItems: 'center' }}>
              <Animated.View style={{ flexDirection: 'row', transform: [{ translateX }] }}>
                <Text style={currentStyles.tickerText} onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}>
                  {combinedTickerText}
                </Text>
              </Animated.View>
            </ScrollView>
          </View>
        </View>

        <View style={currentStyles.menuGrid}>
          {[
            { title: 'VIP Levels', icon: 'crown', color: '#EAB308', iconSet: 'FontAwesome5' },
            { title: 'History', icon: 'history', color: '#3B82F6', iconSet: 'FontAwesome5' },
            { title: 'Invitation', icon: 'user-plus', color: '#10B981', iconSet: 'FontAwesome5' },
            { title: 'Notices', icon: 'bell', color: '#EF4444', iconSet: 'FontAwesome5' },
            { title: 'About Us', icon: 'information', color: '#8B5CF6', iconSet: 'MaterialCommunityIcons' },
            { title: 'Download App', icon: 'download', color: '#EC4899', iconSet: 'FontAwesome5' }
          ].map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={() => {
              if (item.title === 'VIP Levels') navigation.navigate('Vip', { totalBalance });
              else if (item.title === 'History') navigation.navigate('History');
              else if (item.title === 'About Us') navigation.navigate('AboutUs');
              else if (item.title === 'Invitation') navigation.navigate('Invitation', { userUid });
              else if (item.title === 'Notices') navigation.navigate('Notices');
              else if (item.title === 'Download App') handleDownloadApp();
            }}>
              <View style={currentStyles.menuIconContainer}>
                {item.iconSet === 'FontAwesome5' ? (
                  <FontAwesome5 name={item.icon} size={20} color={item.color} />
                ) : (
                  <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
                )}
              </View>
              <Text style={currentStyles.menuItemTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.carouselContainer}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            ref={bannerRef} 
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setCurrentBannerIndex(Math.round(e.nativeEvent.contentOffset.x / (screenWidth - 32)))}
          >
            {bannerData.map((banner) => (
              <View key={banner.id} style={[currentStyles.bannerCard, { width: screenWidth - 32 }]}>
                <View style={styles.bannerHeaderRow}>
                  <MaterialCommunityIcons name={banner.icon} size={22} color={banner.color} />
                  <Text style={currentStyles.bannerTitle}>{banner.title}</Text>
                </View>
                <Text style={currentStyles.bannerDesc}>{banner.desc}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.paginationRow}>
            {bannerData.map((_, i) => (
              <View key={i} style={[styles.dot, currentBannerIndex === i ? styles.activeDot : currentStyles.inactiveDot]} />
            ))}
          </View>
        </View>

      </ScrollView>

      <View style={[currentStyles.bottomTabNav, { height: 65 + insets.bottom, paddingBottom: insets.bottom }]}>
        {[
          { icon: 'home', title: 'HOME' },
          { icon: 'account-group', title: 'TEAM' },
          { icon: 'clipboard-text', title: 'TASKS' },
          { icon: 'headset', title: 'SUPPORT' },
          { icon: 'account', title: 'ME' }
        ].map((tab, i) => (
          <TouchableOpacity key={i} style={styles.tabItem} onPress={() => {
            if(i===1) navigation.navigate('Team', { totalBalance, todayIncome, taskCount, recentActivities });
            if(i===2) navigation.navigate('Tasks', { totalBalance, todayIncome, taskCount, recentActivities });
            if(i===3) navigation.navigate('Support', { totalBalance, todayIncome, taskCount, recentActivities });
            if(i===4) navigation.navigate('Me', { totalBalance, todayIncome, taskCount, recentActivities });
          }}>
            <MaterialCommunityIcons name={tab.icon} size={24} color={i === 0 ? "#3B82F6" : "#94A3B8"} />
            <Text style={[styles.tabText, i === 0 && { color: '#3B82F6' }]}>{tab.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', ...(Platform.OS === 'web' ? { height: '100vh', overflow: 'hidden' } : {}) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  appTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  usernameText: { fontSize: 14, fontWeight: 'bold', color: '#334155' },
  statsCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  tickerContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginTop: 4, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  tickerText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  menuIconContainer: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  menuItemTitle: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  bannerCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  bannerTitle: { fontSize: 13, fontWeight: 'bold', color: '#1E293B' },
  bannerDesc: { fontSize: 11, color: '#64748B', marginTop: 4, lineHeight: 16 },
  inactiveDot: { backgroundColor: '#E2E8F0' },
  bottomTabNav: { 
    backgroundColor: '#FFFFFF', 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    borderTopWidth: 1, 
    borderTopColor: '#E2E8F0',
    position: Platform.OS === 'web' ? 'fixed' : 'relative',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000
  }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14', ...(Platform.OS === 'web' ? { height: '100vh', overflow: 'hidden' } : {}) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  appTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  usernameText: { fontSize: 14, fontWeight: 'bold', color: '#E2E8F0' },
  statsCard: { flex: 1, backgroundColor: '#161B22', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#21262D' },
  tickerContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginTop: 4, marginBottom: 12, borderWidth: 1, borderColor: '#21262D' },
  tickerText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#161B22', borderRadius: 20, paddingVertical: 16, borderWidth: 1, borderColor: '#21262D' },
  menuIconContainer: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#0B0E14', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  menuItemTitle: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  bannerCard: { backgroundColor: '#161B22', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#21262D' },
  bannerTitle: { fontSize: 13, fontWeight: 'bold', color: '#FFFFFF' },
  bannerDesc: { fontSize: 11, color: '#94A3B8', marginTop: 4, lineHeight: 16 },
  inactiveDot: { backgroundColor: '#334155' },
  bottomTabNav: { 
    backgroundColor: '#161B22', 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    borderTopWidth: 1, 
    borderTopColor: '#21262D',
    position: Platform.OS === 'web' ? 'fixed' : 'relative',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000
  }
});

const styles = StyleSheet.create({
  scrollContainer: { paddingHorizontal: 16, flexGrow: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoBox: { width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 8, overflow: 'hidden' },
  logoImage: { width: '100%', height: '100%' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { padding: 4, marginLeft: 10 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', marginRight: 6 },
  walletCard: { backgroundColor: '#3B82F6', borderRadius: 24, padding: 24, marginBottom: 16 },
  walletCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletLabel: { color: '#E2E8F0', fontSize: 11, fontWeight: '700' },
  vipBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  vipText: { fontSize: 11, fontWeight: 'bold', color: '#FFFFFF' },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6, marginBottom: 20 },
  balanceAmount: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold' },
  currencyText: { color: '#E2E8F0', fontSize: 14, marginLeft: 6 },
  actionButtonsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#FFFFFF', height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 6 },
  withdrawBtn: { backgroundColor: '#2563EB', borderWidth: 1, borderColor: '#3B82F6' },
  actionBtnText: { fontSize: 14, fontWeight: 'bold' },
  carouselContainer: { marginTop: 16, marginBottom: 16 },
  bannerHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paginationRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  activeDot: { backgroundColor: '#3B82F6', width: 14 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statsLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '700', marginBottom: 4 },
  statsValue: { fontSize: 16, fontWeight: 'bold' },
  tickerHeader: { borderRightWidth: 1, borderRightColor: '#E2E8F0', paddingRight: 8, marginRight: 8 },
  tickerBox: { flex: 1, height: 24, overflow: 'hidden' },
  menuItem: { width: '33.33%', alignItems: 'center', paddingVertical: 12 },
  tabItem: { alignItems: 'center' },
  tabText: { fontSize: 9, fontWeight: '700', color: '#94A3B8', marginTop: 3 }
});