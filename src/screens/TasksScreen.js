import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
  Alert,
  Image
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

const functionsInstance = getFunctions();

export default function TasksScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const [balance, setBalance] = useState(0.0);
  const [todayEarnings, setTodayEarnings] = useState(0.0);
  const [totalEarnings, setTotalEarnings] = useState(0.0);
  const [taskCount, setTaskCount] = useState(0);
  const [lastTaskReset, setLastTaskReset] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isGrabbing, setIsGrabbing] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false);
  const [currentOrderID, setCurrentOrderID] = useState('');
  const [currentProfit, setCurrentProfit] = useState(0);
  const [countdown, setCountdown] = useState('00:00:00');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [selectedProduct, setSelectedProduct] = useState({ name: '', icon: 'cart', price: 0 });

  // Defaults to the standard rate while the real value loads from the
  // central config, so the estimate shown before confirming a task is
  // never wrong for more than a moment. The actual credited amount always
  // comes from the backend's own (equally centralized) calculation — and,
  // as of this update, the backend also randomizes that amount slightly
  // per order across the day's 5 tasks, so this local estimate is only
  // ever an approximate preview shown before a task is confirmed.
  const [dailyTaskProfitRate, setDailyTaskProfitRate] = useState(0.0032);

  const cycleKeyRef = useRef(null);

  // Local activity storage is scoped per user UID, tracked as REACTIVE
  // state via onAuthStateChanged rather than read once at render time.
  // Reading auth.currentUser.uid directly during the very first render
  // (right after a fresh login) can briefly return null before Firebase
  // finishes restoring the session, which was causing activities to be
  // saved/loaded under a wrong key and appear to randomly vanish.
  const [authUid, setAuthUid] = useState(auth.currentUser ? auth.currentUser.uid : null);

  useEffect(() => {
    const unsubscribeAuthUid = onAuthStateChanged(auth, (user) => {
      setAuthUid(user ? user.uid : null);
    });
    return () => unsubscribeAuthUid();
  }, []);

  const currentUid = authUid || 'guest';
  const CYCLE_KEY_STORAGE = 'taskCycleKey_' + currentUid;
  const ACTIVITIES_STORAGE = 'taskRecentActivities_' + currentUid;

  const productPool = [
    { name: "iPhone 16 Pro Max (256GB)", icon: "cellphone", basePrice: 1199, color: '#3B82F6' },
    { name: "Samsung Galaxy S26 Ultra", icon: "cellphone-android", basePrice: 1299, color: '#8B5CF6' },
    { name: "Sony WH-1000XM5 ANC Headphones", icon: "headphones", basePrice: 399, color: '#EC4899' },
    { name: "MacBook Pro M3 (14-inch)", icon: "laptop", basePrice: 1599, color: '#3B82F6' },
    { name: "iPad Pro M4 Ultra Thin", icon: "tablet-android", basePrice: 999, color: '#3B82F6' },
    { name: "PlayStation 5 Pro 2TB", icon: "sony-playstation", basePrice: 699, color: '#1D4ED8' },
    { name: "Apple Watch Ultra 2 Titanium", icon: "watch-variant", basePrice: 799, color: '#F59E0B' },
    { name: "Dell XPS 16 OLED Touch Laptop", icon: "laptop-chromebook", basePrice: 1899, color: '#3B82F6' },
    { name: "Canon EOS R5 Mark II Camera", icon: "camera", basePrice: 3899, color: '#EF4444' },
    { name: "Bose QuietComfort Ultra Earbuds", icon: "earbuds", basePrice: 299, color: '#EC4899' },
    { name: "LG C4 65-inch OLED EVO 4K TV", icon: "television", basePrice: 1699, color: '#8B5CF6' },
    { name: "Dyson V15 Detect Submarine Vacuum", icon: "vacuum", basePrice: 949, color: '#8B5CF6' },
    { name: "DJI Mavic 3 Pro Cine Drone", icon: "drone", basePrice: 2199, color: '#EF4444' },
    { name: "Google Pixel 9 Pro Fold (256GB)", icon: "cellphone-text", basePrice: 1799, color: '#22C55E' },
    { name: "Asus ROG Ally X Handheld Console", icon: "gamepad-variant", basePrice: 799, color: '#EF4444' },
    { name: "Nvidia GeForce RTX 4090 24GB", icon: "expansion-card", basePrice: 1599, color: '#22C55E' },
    { name: "GoPro HERO12 Black Creator Edition", icon: "camera-gopro", basePrice: 599, color: '#3B82F6' },
    { name: "Sonos Era 300 Smart Speaker", icon: "speaker-wireless", basePrice: 449, color: '#1E293B' },
    { name: "Sennheiser HD 800 S Audiophile", icon: "headphones-settings", basePrice: 1799, color: '#EC4899' },
    { name: "Samsung Odyssey OLED G9 Monitor", icon: "monitor-screenshot", basePrice: 1299, color: '#8B5CF6' },
    { name: "Meta Quest 3 512GB VR Headset", icon: "headset-vr", basePrice: 649, color: '#3B82F6' },
    { name: "Microsoft Surface Laptop Studio 2", icon: "laptop-mac", basePrice: 2399, color: '#3B82F6' },
    { name: "Garmin Fenix 7X Pro Sapphire Solar", icon: "watch", basePrice: 899, color: '#F59E0B' },
    { name: "Nintendo Switch OLED Edition", icon: "nintendo-switch", basePrice: 349, color: '#EF4444' },
    { name: "Alienware Aurora R16 Gaming Desktop", icon: "desktop-tower", basePrice: 2499, color: '#8B5CF6' },
    { name: "Marshall Woburn III Bluetooth Speaker", icon: "speaker", basePrice: 579, color: '#1E293B' },
    { name: "Logitech MX Master 3S Wireless Mouse", icon: "mouse", basePrice: 99, color: '#3B82F6' },
    { name: "Keychron Q1 Max Wireless Keyboard", icon: "keyboard", basePrice: 219, color: '#22C55E' },
    { name: "Shure SM7B Vocal Dynamic Mic", icon: "microphone-variant", basePrice: 399, color: '#1E293B' },
    { name: "Anker SOLIX C1000 Portable Power", icon: "battery-charging-100", basePrice: 999, color: '#F59E0B' },
    { name: "Breville Barista Touch Impress", icon: "coffee-maker", basePrice: 1499, color: '#78350F' },
    { name: "Theragun PRO Gen 5 Massager", icon: "tire", basePrice: 599, color: '#1E293B' }
  ];

  const serverSteps = [
    "Initializing secure smart node verification...",
    "Connecting global encrypted proxy gateway...",
    "Executing smart contract transaction parameters...",
    "Finalizing double-entry settlement report..."
  ];

  const getCurrentCycleKey = () => {
    const now = new Date();
    let cycleStart = new Date();
    cycleStart.setUTCHours(16, 0, 0, 0);
    if (now.getTime() < cycleStart.getTime()) {
      cycleStart.setUTCDate(cycleStart.getUTCDate() - 1);
    }
    return cycleStart.toISOString();
  };

  const getCurrentDayBoundary = () => {
    const now = new Date();
    let boundary = new Date();
    boundary.setUTCHours(16, 0, 0, 0);
    if (now.getTime() < boundary.getTime()) {
      boundary.setUTCDate(boundary.getUTCDate() - 1);
    }
    return boundary;
  };

  const isStoredCountStale = () => {
    if (!lastTaskReset) return false;
    const boundary = getCurrentDayBoundary();
    return lastTaskReset.getTime() < boundary.getTime();
  };

  const effectiveTaskCount = isStoredCountStale() ? 0 : taskCount;

  useEffect(() => {
    let unsubscribeUser = () => {};
    const currentUser = auth.currentUser;

    if (currentUser) {
      const userRef = doc(db, "users", currentUser.uid);
      unsubscribeUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBalance(Number(data.balance || 0));
          setTodayEarnings(Number(data.todayEarnings || 0));
          setTotalEarnings(Number(data.totalEarnings || 0));
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
      }, () => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => {
      unsubscribeUser();
    };
  }, []);

  useEffect(() => {
    const loadBonusRate = async () => {
      try {
        const getBonusConfig = httpsCallable(functionsInstance, 'getBonusConfig');
        const res = await getBonusConfig();
        if (typeof res.data?.rates?.dailyTaskProfitRate === 'number') {
          setDailyTaskProfitRate(res.data.rates.dailyTaskProfitRate);
        }
      } catch (err) {
        // Keep the default rate if this fails — never block the task flow.
      }
    };
    loadBonusRate();
  }, []);

  // Local, per-user "Recent Activity" list. Persists across navigating away
  // and back to this screen, and across logging out and back in on the same
  // device — but automatically clears once the daily task cycle rolls over.
  // It never touches Firestore, so it never appears on the Home screen's
  // global Transaction History.
  useEffect(() => {
    if (!authUid) return;
    const loadLocalActivities = async () => {
      try {
        const currentKey = getCurrentCycleKey();
        const storedKey = await AsyncStorage.getItem(CYCLE_KEY_STORAGE);
        const storedActivities = await AsyncStorage.getItem(ACTIVITIES_STORAGE);

        cycleKeyRef.current = currentKey;

        console.log('[DEBUG-ACTIVITIES] authUid=' + authUid + ' key=' + ACTIVITIES_STORAGE + ' storedKey=' + storedKey + ' currentKey=' + currentKey + ' storedActivities=' + storedActivities);

        if (storedKey === currentKey && storedActivities) {
          console.log('[DEBUG-ACTIVITIES] LOADED existing activities');
          setRecentActivities(JSON.parse(storedActivities));
        } else {
          console.log('[DEBUG-ACTIVITIES] RESETTING to empty (mismatch or no stored data)');
          await AsyncStorage.setItem(CYCLE_KEY_STORAGE, currentKey);
          await AsyncStorage.setItem(ACTIVITIES_STORAGE, JSON.stringify([]));
          setRecentActivities([]);
        }
      } catch (e) {}
    };

    loadLocalActivities();
  }, [authUid]);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      let target = new Date();
      target.setUTCHours(16, 0, 0, 0);

      if (now.getTime() >= target.getTime()) {
        target.setUTCDate(target.getUTCDate() + 1);
      }

      const diff = target.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown('00:00:00');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );

      const liveCycleKey = getCurrentCycleKey();
      if (cycleKeyRef.current && liveCycleKey !== cycleKeyRef.current) {
        cycleKeyRef.current = liveCycleKey;
        setRecentActivities([]);
        AsyncStorage.setItem(CYCLE_KEY_STORAGE, liveCycleKey).catch(() => {});
        AsyncStorage.setItem(ACTIVITIES_STORAGE, JSON.stringify([])).catch(() => {});
      }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    return () => clearInterval(timerInterval);
  }, [authUid]);

  const handleGrabOrder = () => {
    if (effectiveTaskCount >= 5) return;

    if (balance < 70) {
      setShowInsufficientBalanceModal(true);
      return;
    }

    setIsGrabbing(true);
    setCurrentStepIndex(0);
    const executionDuration = 4000;
    const stepIntervalDuration = Math.floor(executionDuration / serverSteps.length);

    let stepIndex = 0;

    const statusInterval = setInterval(() => {
      stepIndex++;
      if (stepIndex < serverSteps.length) {
        setCurrentStepIndex(stepIndex);
      }
    }, stepIntervalDuration);

    setTimeout(() => {
      clearInterval(statusInterval);
      setCurrentStepIndex(serverSteps.length - 1);
      const randomProduct = productPool[Math.floor(Math.random() * productPool.length)];
      const finalProfit = parseFloat((balance * dailyTaskProfitRate).toFixed(2));
      const randomID = Math.floor(100000 + Math.random() * 900000).toString();

      setSelectedProduct({
        name: randomProduct.name,
        icon: randomProduct.icon,
        price: randomProduct.basePrice,
        color: randomProduct.color
      });

      setCurrentOrderID(randomID);
      setCurrentProfit(finalProfit);
      setIsGrabbing(false);
      setShowPopup(true);
    }, executionDuration);
  };

  const handleConfirmOrder = async () => {
    setShowPopup(false);
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const completeTask = httpsCallable(functionsInstance, 'completeTask');
      const res = await completeTask({
        productName: selectedProduct.name,
        orderId: currentOrderID
      });

      const finalProfit = (res && res.data && typeof res.data.profit === 'number')
        ? res.data.profit
        : currentProfit;

      setCurrentProfit(finalProfit);

      const newActivity = {
        id: currentOrderID,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        profit: finalProfit,
        productName: selectedProduct.name,
        icon: selectedProduct.icon,
        color: selectedProduct.color
      };

      setRecentActivities((prev) => {
        const updated = [newActivity, ...prev].slice(0, 10);
        AsyncStorage.setItem(ACTIVITIES_STORAGE, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to complete task. Please try again.");
    }
  };

  const safeNavigate = (targetScreen) => {
    try {
      if (navigation && navigation.navigate) {
        navigation.navigate(targetScreen);
      }
    } catch (err) {}
  };

  const currentStyles = isDarkMode ? darkStyles : lightStyles;

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
        <TouchableOpacity onPress={() => safeNavigate('Home')} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={30} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Task Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContainer, { paddingBottom: 100 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={currentStyles.progressCard}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressLabel}>DAILY TASK PROGRESS</Text>
              <View style={currentStyles.progressBadge}>
                <MaterialCommunityIcons name="lightning-bolt" size={11} color="#3B82F6" />
                <Text style={styles.progressBadgeText}>5x Daily</Text>
              </View>
            </View>
            <Text style={currentStyles.progressValue}>{effectiveTaskCount} / 5</Text>
            <View style={currentStyles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${(effectiveTaskCount / 5) * 100}%` }]} />
            </View>
            <View style={styles.timerRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#3B82F6" />
              <Text style={styles.timerText}>Next Reset: {countdown}</Text>
            </View>
          </View>

          <View style={currentStyles.workCard}>
            {isGrabbing ? (
              <View style={styles.processingWrapper}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <View style={styles.stepsList}>
                  {serverSteps.map((step, idx) => (
                    <View key={idx} style={styles.stepRow}>
                      <View style={[
                        styles.stepDot,
                        idx < currentStepIndex && styles.stepDotDone,
                        idx === currentStepIndex && styles.stepDotActive
                      ]}>
                        {idx < currentStepIndex ? (
                          <Feather name="check" size={10} color="#FFFFFF" />
                        ) : null}
                      </View>
                      <Text style={[
                        currentStyles.stepText,
                        idx === currentStepIndex && styles.stepTextActive,
                        idx < currentStepIndex && styles.stepTextDone
                      ]}>
                        {step}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <>
                <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? "#1E293B" : "#EFF6FF" }]}>
                  <Image source={require('../../assets/icon.png')} style={styles.workLogo} resizeMode="contain" />
                </View>
                <Text style={currentStyles.workTitle}>Earn Rewards</Text>
                <Text style={currentStyles.workSub}>Click the button below to grab your daily e-commerce verification tasks.</Text>

                <TouchableOpacity
                  style={[styles.grabBtn, effectiveTaskCount >= 5 && styles.disabledBtn]}
                  onPress={handleGrabOrder}
                  disabled={effectiveTaskCount >= 5}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons
                    name={effectiveTaskCount >= 5 ? "check-circle" : "cart-arrow-right"}
                    size={18}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.grabBtnText}>{effectiveTaskCount >= 5 ? "ALL TASKS COMPLETED" : "Grab Order Now"}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="history" size={16} color={isDarkMode ? "#94A3B8" : "#64748B"} />
            <Text style={currentStyles.sectionTitle}>Recent Activity</Text>
            <Text style={styles.sectionHint}>Resets daily</Text>
          </View>

          {recentActivities.length === 0 ? (
            <View style={currentStyles.emptyActivityCard}>
              <MaterialCommunityIcons name="clipboard-list-outline" size={28} color={isDarkMode ? "#334155" : "#CBD5E1"} />
              <Text style={styles.emptyText}>No validated tasks recorded for today.</Text>
            </View>
          ) : (
            recentActivities.map((activity, idx) => (
              <View key={`${activity.id}-${idx}`} style={currentStyles.activityCard}>
                <View style={[styles.activityIconBox, { backgroundColor: (activity.color || '#3B82F6') + '1A' }]}>
                  <MaterialCommunityIcons name={activity.icon || 'cart'} size={20} color={activity.color || '#3B82F6'} />
                </View>
                <View style={styles.activityMiddle}>
                  <Text style={currentStyles.activityProductName} numberOfLines={1}>{activity.productName || 'E-commerce Task'}</Text>
                  <Text style={currentStyles.activityId}>Order #{activity.id}</Text>
                  <Text style={styles.activityTime}>{activity.time} • VALIDATED</Text>
                </View>
                <Text style={currentStyles.activityProfit}>+${activity.profit.toFixed(2)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {showPopup && (
        <View style={styles.webOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? "#161B22" : "#FFFFFF" }]}>

            <View style={styles.brandRow}>
              <Image source={require('../../assets/icon.png')} style={styles.brandLogo} resizeMode="contain" />
              <Text style={currentStyles.brandText}>TaskEarn Verified Order</Text>
            </View>

            <View style={[styles.productIconCircle, { backgroundColor: (selectedProduct.color || '#3B82F6') + '1A', borderColor: (selectedProduct.color || '#3B82F6') + '40' }]}>
              <MaterialCommunityIcons name={selectedProduct.icon} size={40} color={selectedProduct.color || '#3B82F6'} />
            </View>
            <Text style={currentStyles.modalTitle}>Order Matching Success</Text>
            <Text style={currentStyles.productTitleText}>{selectedProduct.name}</Text>

            <View style={currentStyles.receiptBox}>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Order ID</Text>
                <Text style={currentStyles.modalDetailValue}>#{currentOrderID}</Text>
              </View>
              <View style={currentStyles.receiptDivider} />
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Product Price</Text>
                <Text style={currentStyles.modalDetailValue}>${selectedProduct.price.toLocaleString()}</Text>
              </View>
              <View style={currentStyles.receiptDivider} />
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Expected Profit</Text>
                <Text style={[currentStyles.modalDetailValue, { color: '#22C55E' }]}>+${currentProfit.toFixed(2)}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmOrder} activeOpacity={0.85}>
              <Feather name="check-circle" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.confirmBtnText}>Submit & Claim Commission</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showInsufficientBalanceModal && (
        <View style={styles.webOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? "#161B22" : "#FFFFFF" }]}>
            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? "#371B1E" : "#FEF2F2", marginBottom: 12 }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#EF4444" />
            </View>
            <Text style={currentStyles.modalTitle}>Insufficient Balance</Text>
            <Text style={[currentStyles.workSub, { marginBottom: 20 }]}>
              Your account balance is insufficient (Minimum $70 required to unlock VIP level and complete daily orders).
            </Text>
            <TouchableOpacity style={styles.confirmBtn} onPress={() => setShowInsufficientBalanceModal(false)}>
              <Text style={styles.confirmBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={[currentStyles.bottomTabNav, { height: 65 + insets.bottom, paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => safeNavigate('Home')}>
          <MaterialCommunityIcons name="home" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => safeNavigate('Team')}>
          <MaterialCommunityIcons name="account-group" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>TEAM</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <MaterialCommunityIcons name="clipboard-text" size={24} color="#3B82F6" />
          <Text style={[styles.tabText, { color: '#3B82F6' }]}>TASKS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => safeNavigate('Support')}>
          <MaterialCommunityIcons name="headset" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>SUPPORT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => safeNavigate('Me')}>
          <MaterialCommunityIcons name="account" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>ME</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    height: Platform.OS === 'web' ? '100vh' : '100%',
    position: 'relative'
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  progressCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  progressBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 3 },
  progressValue: { fontSize: 32, fontWeight: 'bold', color: '#1E293B', marginVertical: 6 },
  progressBarTrack: { width: '100%', height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  workCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9', minHeight: 280, justifyContent: 'center' },
  workTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginTop: 12, marginBottom: 6 },
  workSub: { fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 10, lineHeight: 18, marginBottom: 20 },
  stepText: { fontSize: 12, fontWeight: '500', color: '#94A3B8' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#334155' },
  emptyActivityCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9', gap: 8 },
  activityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  activityProductName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  activityId: { fontSize: 10, fontWeight: '600', color: '#64748B', marginTop: 2 },
  activityProfit: { fontSize: 14, fontWeight: 'bold', color: '#22C55E' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 6, textAlign: 'center' },
  productTitleText: { fontSize: 14, fontWeight: '700', color: '#3B82F6', textAlign: 'center', marginBottom: 16 },
  receiptBox: { width: '100%', backgroundColor: '#F8FAFC', borderRadius: 14, paddingVertical: 6, paddingHorizontal: 14, marginBottom: 4 },
  receiptDivider: { height: 1, backgroundColor: '#E2E8F0' },
  modalDetailValue: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  brandText: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.3 },
  bottomTabNav: { backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E2E8F0', zIndex: 9999 }
});

const darkStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
    height: Platform.OS === 'web' ? '100vh' : '100%',
    position: 'relative'
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  progressCard: { backgroundColor: '#161B22', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#21262D' },
  progressBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 3 },
  progressValue: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginVertical: 6 },
  progressBarTrack: { width: '100%', height: 6, backgroundColor: '#21262D', borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  workCard: { backgroundColor: '#161B22', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#21262D', minHeight: 280, justifyContent: 'center' },
  workTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginTop: 12, marginBottom: 6 },
  workSub: { fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 10, lineHeight: 18, marginBottom: 20 },
  stepText: { fontSize: 12, fontWeight: '500', color: '#64748B' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#E2E8F0' },
  emptyActivityCard: { backgroundColor: '#161B22', borderRadius: 16, padding: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#21262D', gap: 8 },
  activityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#21262D' },
  activityProductName: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  activityId: { fontSize: 10, fontWeight: '600', color: '#94A3B8', marginTop: 2 },
  activityProfit: { fontSize: 14, fontWeight: 'bold', color: '#22C55E' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 6, textAlign: 'center' },
  productTitleText: { fontSize: 14, fontWeight: '700', color: '#3B82F6', textAlign: 'center', marginBottom: 16 },
  receiptBox: { width: '100%', backgroundColor: '#0B0E14', borderRadius: 14, paddingVertical: 6, paddingHorizontal: 14, marginBottom: 4 },
  receiptDivider: { height: 1, backgroundColor: '#21262D' },
  modalDetailValue: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  brandText: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.3 },
  bottomTabNav: { backgroundColor: '#161B22', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#21262D', zIndex: 9999 }
});

const styles = StyleSheet.create({
  backBtn: { padding: 5 },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 16 },
  progressHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 2 },
  progressLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  progressBadgeText: { fontSize: 9, fontWeight: '700', color: '#3B82F6' },
  progressBarFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 3 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  timerText: { fontSize: 11, fontWeight: '600', color: '#3B82F6' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  workLogo: { width: 40, height: 40, borderRadius: 8 },
  productIconCircle: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 12 },
  grabBtn: { flexDirection: 'row', backgroundColor: '#3B82F6', width: '100%', height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 },
  disabledBtn: { backgroundColor: '#94A3B8', shadowOpacity: 0 },
  grabBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  processingWrapper: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  stepsList: { width: '100%', marginTop: 20, gap: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  stepDotDone: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  stepDotActive: { borderColor: '#3B82F6' },
  stepTextActive: { color: '#3B82F6', fontWeight: '700' },
  stepTextDone: { color: '#22C55E' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 4 },
  sectionHint: { fontSize: 10, fontWeight: '600', color: '#94A3B8', marginLeft: 'auto' },
  emptyText: { color: '#94A3B8', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  activityIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activityMiddle: { flex: 1, paddingRight: 8 },
  activityTime: { fontSize: 10, fontWeight: '600', color: '#94A3B8', marginTop: 2 },
  modalDetailRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 10 },
  modalDetailLabel: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  brandLogo: { width: 22, height: 22, borderRadius: 5 },
  webOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999
  },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 30, padding: 24, alignItems: 'center' },
  confirmBtn: { flexDirection: 'row', backgroundColor: '#3B82F6', width: '100%', height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 18, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 },
  confirmBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 9, fontWeight: '700', color: '#94A3B8', marginTop: 3 }
});