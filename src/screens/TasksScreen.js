import React, { useState, useEffect, useContext } from 'react';
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
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

const functionsInstance = getFunctions();

export default function TasksScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);

  const [balance, setBalance] = useState(0.0);
  const [todayEarnings, setTodayEarnings] = useState(0.0);
  const [totalEarnings, setTotalEarnings] = useState(0.0);
  const [taskCount, setTaskCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isGrabbing, setIsGrabbing] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false);
  const [currentOrderID, setCurrentOrderID] = useState('');
  const [currentProfit, setCurrentProfit] = useState(0);
  const [countdown, setCountdown] = useState('00:00:00');

  const [selectedProduct, setSelectedProduct] = useState({ name: '', icon: 'cart', price: 0 });
  const [animationText, setAnimationText] = useState("Initializing Global Node...");

  const productPool = [
    { name: "iPhone 16 Pro Max (256GB)", icon: "cellphone", basePrice: 1199 },
    { name: "Samsung Galaxy S26 Ultra", icon: "cellphone-android", basePrice: 1299 },
    { name: "Sony WH-1000XM5 ANC Headphones", icon: "headphones", basePrice: 399 },
    { name: "MacBook Pro M3 (14-inch)", icon: "laptop", basePrice: 1599 },
    { name: "iPad Pro M4 Ultra Thin", icon: "tablet-android", basePrice: 999 },
    { name: "PlayStation 5 Pro 2TB", icon: "sony-playstation", basePrice: 699 },
    { name: "Apple Watch Ultra 2 Titanium", icon: "watch-variant", basePrice: 799 },
    { name: "Dell XPS 16 OLED Touch Laptop", icon: "laptop-chromebook", basePrice: 1899 },
    { name: "Canon EOS R5 Mark II Camera", icon: "camera", basePrice: 3899 },
    { name: "Bose QuietComfort Ultra Earbuds", icon: "earbuds", basePrice: 299 },
    { name: "LG C4 65-inch OLED EVO 4K TV", icon: "television", basePrice: 1699 },
    { name: "Dyson V15 Detect Submarine Vacuum", icon: "vacuum", basePrice: 949 },
    { name: "DJI Mavic 3 Pro Cine Drone", icon: "drone", basePrice: 2199 },
    { name: "Google Pixel 9 Pro Fold (256GB)", icon: "cellphone-text", basePrice: 1799 },
    { name: "Asus ROG Ally X Handheld Console", icon: "gamepad-variant", basePrice: 799 },
    { name: "Nvidia GeForce RTX 4090 24GB", icon: "expansion-card", basePrice: 1599 },
    { name: "GoPro HERO12 Black Creator Edition", icon: "camera-gopro", basePrice: 599 },
    { name: "Sonos Era 300 Smart Speaker", icon: "speaker-wireless", basePrice: 449 },
    { name: "Sennheiser HD 800 S Audiophile", icon: "headphones-settings", basePrice: 1799 },
    { name: "Samsung Odyssey OLED G9 Monitor", icon: "monitor-screenshot", basePrice: 1299 },
    { name: "Meta Quest 3 512GB VR Headset", icon: "headset-vr", basePrice: 649 },
    { name: "Microsoft Surface Laptop Studio 2", icon: "laptop-mac", basePrice: 2399 },
    { name: "Garmin Fenix 7X Pro Sapphire Solar", icon: "watch", basePrice: 899 },
    { name: "Nintendo Switch OLED Edition", icon: "nintendo-switch", basePrice: 349 },
    { name: "Alienware Aurora R16 Gaming Desktop", icon: "desktop-tower", basePrice: 2499 },
    { name: "Marshall Woburn III Bluetooth Speaker", icon: "speaker", basePrice: 579 },
    { name: "Logitech MX Master 3S Wireless Mouse", icon: "mouse", basePrice: 99 },
    { name: "Keychron Q1 Max Wireless Keyboard", icon: "keyboard", basePrice: 219 },
    { name: "Shure SM7B Vocal Dynamic Mic", icon: "microphone-variant", basePrice: 399 },
    { name: "Anker SOLIX C1000 Portable Power", icon: "battery-charging-100", basePrice: 999 },
    { name: "Breville Barista Touch Impress", icon: "coffee-maker", basePrice: 1499 },
    { name: "Theragun PRO Gen 5 Massager", icon: "tire", basePrice: 599 }
  ];

  const serverSteps = [
    "Initializing secure smart node verification...",
    "Connecting global encrypted proxy gateway...",
    "Executing smart contract transaction parameters...",
    "Finalizing double-entry settlement report..."
  ];

  useEffect(() => {
    let unsubscribeUser = () => {};
    let unsubscribeTasks = () => {};
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
        }
        setLoading(false);
      }, () => {
        setLoading(false);
      });

      try {
        const tasksQuery = query(
          collection(db, "users", currentUser.uid, "tasks"),
          orderBy("createdAt", "desc"),
          limit(10)
        );

        unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
          const activities = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            const dateObj = data.createdAt ? data.createdAt.toDate() : new Date();
            const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            activities.push({
              id: doc.id.substring(0, 8).toUpperCase(),
              time: formattedTime,
              profit: Number(data.profit || 0)
            });
          });
          setRecentActivities(activities);
        }, () => {});
      } catch (err) {}

    } else {
      setLoading(false);
    }

    return () => {
      unsubscribeUser();
      unsubscribeTasks();
    };
  }, []);

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
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  const handleGrabOrder = () => {
    if (taskCount >= 5) return;

    if (balance < 70) {
      setShowInsufficientBalanceModal(true);
      return;
    }

    setIsGrabbing(true);
    const executionDuration = 4000;
    const stepIntervalDuration = Math.floor(executionDuration / serverSteps.length);

    let stepIndex = 0;
    setAnimationText(serverSteps[0]);

    const statusInterval = setInterval(() => {
      stepIndex++;
      if (stepIndex < serverSteps.length) {
        setAnimationText(serverSteps[stepIndex]);
      }
    }, stepIntervalDuration);

    setTimeout(() => {
      clearInterval(statusInterval);
      const randomProduct = productPool[Math.floor(Math.random() * productPool.length)];
      const finalProfit = parseFloat((balance * 0.0032).toFixed(2));
      const randomID = Math.floor(100000 + Math.random() * 900000).toString();

      setSelectedProduct({
        name: randomProduct.name,
        icon: randomProduct.icon,
        price: randomProduct.basePrice
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

      if (res && res.data && typeof res.data.profit === 'number') {
        setCurrentProfit(res.data.profit);
      }
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
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={currentStyles.progressCard}>
            <Text style={styles.progressLabel}>DAILY TASK PROGRESS</Text>
            <Text style={currentStyles.progressValue}>{taskCount} / 5</Text>
            <View style={styles.timerRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#3B82F6" />
              <Text style={styles.timerText}>Next Reset: {countdown}</Text>
            </View>
          </View>

          <View style={currentStyles.workCard}>
            {isGrabbing ? (
              <View style={styles.processingWrapper}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={currentStyles.grabbingText}>{animationText}</Text>
              </View>
            ) : (
              <>
                <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? "#1E293B" : "#EFF6FF" }]}>
                  <MaterialCommunityIcons name="clipboard-text" size={36} color="#3B82F6" />
                </View>
                <Text style={currentStyles.workTitle}>Earn Rewards</Text>
                <Text style={currentStyles.workSub}>Click the button below to grab your daily e-commerce verification tasks.</Text>

                <TouchableOpacity
                  style={[styles.grabBtn, taskCount >= 5 && styles.disabledBtn]}
                  onPress={handleGrabOrder}
                  disabled={taskCount >= 5}
                >
                  <Text style={styles.grabBtnText}>{taskCount >= 5 ? "ALL TASKS COMPLETED" : "Grab Order Now"}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={currentStyles.sectionTitle}><MaterialCommunityIcons name="history" size={16} /> Recent Activity</Text>

          {recentActivities.length === 0 ? (
            <View style={currentStyles.emptyActivityCard}><Text style={styles.emptyText}>No validated tasks recorded for today.</Text></View>
          ) : (
            recentActivities.map((activity) => (
              <View key={activity.id} style={currentStyles.activityCard}>
                <View><Text style={currentStyles.activityId}>Order #{activity.id}</Text><Text style={currentStyles.activityTime}>{activity.time} | VALIDATED</Text></View>
                <Text style={currentStyles.activityProfit}>+${activity.profit.toFixed(2)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {showPopup && (
        <View style={styles.webOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? "#161B22" : "#FFFFFF" }]}>
            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? "#1E293B" : "#EFF6FF", marginBottom: 12 }]}>
              <MaterialCommunityIcons name={selectedProduct.icon} size={36} color="#3B82F6" />
            </View>
            <Text style={currentStyles.modalTitle}>Order Matching Success</Text>
            <Text style={styles.productTitleText}>{selectedProduct.name}</Text>
            
            <View style={styles.modalDetailRow}>
              <Text style={styles.modalDetailLabel}>Product Price:</Text>
              <Text style={styles.modalDetailValue}>${selectedProduct.price.toLocaleString()}</Text>
            </View>
            
            <View style={styles.modalDetailRow}>
              <Text style={styles.modalDetailLabel}>Expected Profit:</Text>
              <Text style={[styles.modalDetailValue, { color: '#22C55E' }]}>+${currentProfit.toFixed(2)}</Text>
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmOrder}>
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

      <View style={currentStyles.bottomTabNav}>
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
  progressValue: { fontSize: 32, fontWeight: 'bold', color: '#1E293B', marginVertical: 6 },
  workCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9', minHeight: 280, justifyContent: 'center' },
  workTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginTop: 12, marginBottom: 6 },
  workSub: { fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 10, lineHeight: 18, marginBottom: 20 },
  grabbingText: { fontSize: 12, fontWeight: '600', color: '#3B82F6', marginTop: 12, textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#64748B', marginBottom: 12, paddingHorizontal: 4 },
  emptyActivityCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  activityCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  activityId: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  activityTime: { fontSize: 10, fontWeight: '600', color: '#94A3B8', marginTop: 3 },
  activityProfit: { fontSize: 14, fontWeight: 'bold', color: '#22C55E' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 6, textAlign: 'center' },
  bottomTabNav: { height: 65, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingBottom: 5, zIndex: 9999 }
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
  progressValue: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginVertical: 6 },
  workCard: { backgroundColor: '#161B22', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#21262D', minHeight: 280, justifyContent: 'center' },
  workTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginTop: 12, marginBottom: 6 },
  workSub: { fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 10, lineHeight: 18, marginBottom: 20 },
  grabbingText: { fontSize: 12, fontWeight: '600', color: '#3B82F6', marginTop: 12, textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#94A3B8', marginBottom: 12, paddingHorizontal: 4 },
  emptyActivityCard: { backgroundColor: '#161B22', borderRadius: 16, padding: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#21262D' },
  activityCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#21262D' },
  activityId: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  activityTime: { fontSize: 10, fontWeight: '600', color: '#94A3B8', marginTop: 3 },
  activityProfit: { fontSize: 14, fontWeight: 'bold', color: '#22C55E' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 6, textAlign: 'center' },
  bottomTabNav: { height: 65, backgroundColor: '#161B22', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#21262D', paddingBottom: 5, zIndex: 9999 }
});

const styles = StyleSheet.create({
  backBtn: { padding: 5 },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  progressLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  timerText: { fontSize: 11, fontWeight: '600', color: '#3B82F6' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  grabBtn: { backgroundColor: '#3B82F6', width: '100%', height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  disabledBtn: { backgroundColor: '#94A3B8' },
  grabBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  processingWrapper: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  productTitleText: { fontSize: 14, fontWeight: '700', color: '#3B82F6', textAlign: 'center', marginBottom: 16 },
  modalDetailRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 12, paddingVertical: 6 },
  modalDetailLabel: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  modalDetailValue: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
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
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 30, padding: 20, alignItems: 'center' },
  confirmBtn: { backgroundColor: '#3B82F6', width: '100%', height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  confirmBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 9, fontWeight: '700', color: '#94A3B8', marginTop: 3 }
});
