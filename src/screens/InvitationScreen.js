import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Share,
  Alert
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ThemeContext } from '../../ThemeContext';

export default function InvitationScreen({ navigation, route }) {
  const { isDarkMode } = useContext(ThemeContext);
  const [referralCode, setReferralCode] = useState(route?.params?.referralCode || "");
  const [userUid, setUserUid] = useState(route?.params?.userUid || auth.currentUser?.uid || "000000");

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUserUid(currentUser.uid);
      const userRef = doc(db, "users", currentUser.uid);
      const generatedCode = currentUser.uid.substring(0, 6).toUpperCase();

      const unsubscribe = onSnapshot(userRef, async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const code = data.referralCode || data.referral || generatedCode;
          setReferralCode(code);

          if (!data.referralCode && !data.referral) {
            await setDoc(userRef, { referralCode: generatedCode, referral: generatedCode }, { merge: true });
          }
        } else {
          setReferralCode(generatedCode);
          await setDoc(userRef, { referralCode: generatedCode, referral: generatedCode }, { merge: true });
        }
      });

      return () => unsubscribe();
    }
  }, []);

  const currentStyles = isDarkMode ? darkStyles : lightStyles;
  const activeRefCode = referralCode || userUid.substring(0, 6).toUpperCase();
  const referralLink = `https://taskearn-app.com/#/register?ref=${activeRefCode}`;

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(activeRefCode);
      Alert.alert("Success", "Referral Code copied to clipboard!");
    } catch (error) {
      Alert.alert("Error", "Could not copy code.");
    }
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(referralLink);
      Alert.alert("Success", "Referral Link copied to clipboard!");
    } catch (error) {
      Alert.alert("Error", "Could not copy link.");
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join TaskEarn today, complete daily global tasks, and unlock consistent professional digital rewards! Use my code: ${activeRefCode}\nRegister here: ${referralLink}`,
      });
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <SafeAreaView style={currentStyles.container}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#0B0E14" : "#FFFFFF"}
      />

      <View style={currentStyles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Invitation Center</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        <View style={styles.topVisualSection}>
          <View style={[styles.mainIconCircle, { backgroundColor: isDarkMode ? '#1E293B' : '#EFF6FF' }]}>
            <FontAwesome5 name="users" size={40} color="#3B82F6" />
          </View>
          <Text style={currentStyles.mainTitle}>Build Your Global Network</Text>
          <Text style={currentStyles.subTitleText}>Invite friends to TaskEarn and unlock scalable multi-tier commission rewards.</Text>
        </View>

        <View style={currentStyles.linkCard}>
          <View style={styles.codeRowHeader}>
            <Text style={currentStyles.cardLabelText}>YOUR UNIQUE REFERRAL CODE: {activeRefCode}</Text>
            <TouchableOpacity onPress={handleCopyCode} style={styles.copyCodeBadge}>
              <Feather name="copy" size={12} color="#3B82F6" />
              <Text style={styles.copyCodeText}>Copy Code</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.linkBox, { backgroundColor: isDarkMode ? '#0B0E14' : '#F8FAFC' }]}>
            <Text style={currentStyles.linkText} numberOfLines={1}>{referralLink}</Text>
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyLink}>
              <Feather name="copy" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>Copy Link</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Feather name="share-2" size={16} color="#3B82F6" style={{ marginRight: 6 }} />
              <Text style={[styles.btnText, { color: '#3B82F6' }]}>Share Link</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={currentStyles.sectionHeading}>Affiliate Commission System</Text>

        <View style={currentStyles.detailCard}>
          <View style={styles.rewardRow}>
            <View style={[styles.levelBadge, { backgroundColor: '#3B82F6' }]}>
              <Text style={styles.levelBadgeText}>LVL 1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={currentStyles.rewardTitle}>Direct Affiliate Reward</Text>
              <Text style={currentStyles.rewardDescription}>Earn a direct 10% commission bonus from your Level 1 member's active VIP package activation value.</Text>
            </View>
            <Text style={styles.percentageText}>10%</Text>
          </View>

          <View style={styles.dividerLine} />

          <View style={styles.rewardRow}>
            <View style={[styles.levelBadge, { backgroundColor: '#10B981' }]}>
              <Text style={styles.levelBadgeText}>LVL 2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={currentStyles.rewardTitle}>Sub-Affiliate Reward</Text>
              <Text style={currentStyles.rewardDescription}>Earn an additional 5% structural commission bonus from your Level 2 network registrations.</Text>
            </View>
            <Text style={[styles.percentageText, { color: '#10B981' }]}>5%</Text>
          </View>

          <View style={styles.dividerLine} />

          <View style={styles.rewardRow}>
            <View style={[styles.levelBadge, { backgroundColor: '#F59E0B' }]}>
              <Text style={styles.levelBadgeText}>NEW</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={currentStyles.rewardTitle}>New Member Welcome Bonus</Text>
              <Text style={currentStyles.rewardDescription}>Newly registered members instantly receive a 7% signup bonus upon their successful initial deposit transaction.</Text>
            </View>
            <Text style={[styles.percentageText, { color: '#F59E0B' }]}>7%</Text>
          </View>
        </View>

        <Text style={currentStyles.sectionHeading}>Why Build a Team on TaskEarn?</Text>

        <View style={currentStyles.benefitCard}>
          <View style={styles.benefitRow}>
            <MaterialCommunityIcons name="shield-check" size={22} color="#3B82F6" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={currentStyles.benefitTitle}>Accelerate Passive Cash Flow</Text>
              <Text style={currentStyles.benefitText}>Your network works collectively. As your team processes tasks daily, your personal passive income stream multiplies automatically.</Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <MaterialCommunityIcons name="rocket-launch" size={22} color="#10B981" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={currentStyles.benefitTitle}>Achieve Financial Independence</Text>
              <Text style={currentStyles.benefitText}>Turn your smartphone into a global enterprise. Build a long-term decentralized business architecture and secure your dreams today.</Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <MaterialCommunityIcons name="frequently-asked-questions" size={22} color="#F59E0B" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={currentStyles.benefitTitle}>Exclusive VIP Growth Incentives</Text>
              <Text style={currentStyles.benefitText}>High-performing community managers unlock premium higher-tier merchant allocations, lower withdrawal thresholds, and dedicated agency support handles.</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  mainTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginTop: 12, marginBottom: 4 },
  subTitleText: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4, lineHeight: 18 },
  linkCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 20 },
  linkText: { fontSize: 13, color: '#1E293B', fontWeight: '500' },
  sectionHeading: { fontSize: 14, fontWeight: 'bold', color: '#64748B', marginBottom: 12, paddingHorizontal: 4 },
  detailCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 20 },
  rewardTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginBottom: 2 },
  rewardDescription: { fontSize: 11, color: '#64748B', lineHeight: 16, paddingRight: 5 },
  benefitCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 30 },
  benefitTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginBottom: 3 },
  benefitText: { fontSize: 12, color: '#64748B', lineHeight: 18 },
  cardLabelText: { fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 0.5 }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  mainTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginTop: 12, marginBottom: 4 },
  subTitleText: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4, lineHeight: 18 },
  linkCard: { backgroundColor: '#161B22', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#21262D', marginBottom: 20 },
  linkText: { fontSize: 13, color: '#CBD5E1', fontWeight: '500' },
  sectionHeading: { fontSize: 14, fontWeight: 'bold', color: '#CBD5E1', marginBottom: 12, paddingHorizontal: 4 },
  detailCard: { backgroundColor: '#161B22', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#21262D', marginBottom: 20 },
  rewardTitle: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 2 },
  rewardDescription: { fontSize: 11, color: '#CBD5E1', lineHeight: 16, paddingRight: 5 },
  benefitCard: { backgroundColor: '#161B22', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#21262D', marginBottom: 30 },
  benefitTitle: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 3 },
  benefitText: { fontSize: 12, color: '#CBD5E1', lineHeight: 18 },
  cardLabelText: { fontSize: 10, fontWeight: '700', color: '#CBD5E1', letterSpacing: 0.5 }
});

const styles = StyleSheet.create({
  backBtn: { padding: 5 },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  topVisualSection: { alignItems: 'center', textAlign: 'center', marginBottom: 20, paddingHorizontal: 10 },
  mainIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  codeRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  copyCodeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  copyCodeText: { fontSize: 11, fontWeight: 'bold', color: '#3B82F6' },
  linkBox: { width: '100%', height: 44, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.15)', marginBottom: 12 },
  actionButtonsRow: { flexDirection: 'row', gap: 12 },
  copyBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#3B82F6', height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  shareBtn: { flex: 1, flexDirection: 'row', backgroundColor: 'transparent', height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#3B82F6' },
  btnText: { fontSize: 13, fontWeight: 'bold', color: '#FFFFFF' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  levelBadge: { width: 44, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  levelBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  percentageText: { fontSize: 18, fontWeight: 'bold', color: '#3B82F6' },
  dividerLine: { height: 1, backgroundColor: 'rgba(148, 163, 184, 0.12)', marginVertical: 12 },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }
});
