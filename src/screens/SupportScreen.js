import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Platform
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { ThemeContext } from '../../ThemeContext';

export default function LiveSupportScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const [connectionState, setConnectionState] = useState('idle'); 
  const [dotCount, setDotCount] = useState('');

  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  useEffect(() => {
    let interval;
    if (connectionState === 'connecting') {
      interval = setInterval(() => {
        setDotCount((prev) => (prev.length >= 3 ? '' : prev + '.'));
      }, 400);
    } else {
      setDotCount('');
    }
    return () => clearInterval(interval);
  }, [connectionState]);

  const handleSupportConnect = () => {
    if (connectionState === 'connecting') return;
    setConnectionState('connecting');
  };

  const handleBackAction = () => {
    if (navigation && typeof navigation.goBack === 'function') {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={currentStyles.container}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? "#0B0E14" : "#FFFFFF"} 
      />

      <View style={currentStyles.header}>
        <TouchableOpacity style={currentStyles.backButton} onPress={handleBackAction}>
          <Feather name="arrow-left" size={18} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Live Support</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.contentContainer}>
        <View style={currentStyles.imageOuterRing}>
          <View style={currentStyles.imageInnerRing}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop' }}
              style={styles.supportAvatar}
            />
          </View>
          <View style={currentStyles.onlineBadge} />
        </View>

        <Text style={currentStyles.mainHeading}>How can we help you today?</Text>
        <Text style={currentStyles.subHeading}>
          Our official support agents are online to secure and assist your financial tasks.
        </Text>

        <TouchableOpacity
          style={[
            styles.telegramButton, 
            connectionState === 'connecting' && (isDarkMode ? styles.buttonDisabledDark : styles.buttonDisabledLight)
          ]}
          onPress={handleSupportConnect}
          activeOpacity={0.8}
        >
          {connectionState !== 'connecting' && (
            <FontAwesome5 name="telegram-plane" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          )}
          <Text style={[
            styles.telegramButtonText,
            connectionState === 'connecting' && (isDarkMode ? styles.textDisabledDark : styles.textDisabledLight)
          ]}>
            {connectionState === 'connecting' ? `Connecting${dotCount}` : 'Connect to Customer Service'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={currentStyles.footerText}>Secure Connection • 24/7 Instant Routing</Text>
      </View>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', fontStyle: 'italic' },
  imageOuterRing: { width: 154, height: 154, borderRadius: 77, borderWidth: 2, borderColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: 32 },
  imageInnerRing: { width: 142, height: 142, borderRadius: 71, overflow: 'hidden', backgroundColor: '#F1F5F9' },
  onlineBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#10B981', position: 'absolute', bottom: 8, right: 12, borderWidth: 3, borderColor: '#F8FAFC' },
  mainHeading: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', textAlign: 'center', marginBottom: 12, letterSpacing: -0.2 },
  subHeading: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, paddingHorizontal: 12, marginBottom: 40 },
  footerText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#161B22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', fontStyle: 'italic' },
  imageOuterRing: { width: 154, height: 154, borderRadius: 77, borderWidth: 2, borderColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: 32 },
  imageInnerRing: { width: 142, height: 142, borderRadius: 71, overflow: 'hidden', backgroundColor: '#161B22' },
  onlineBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#10B981', position: 'absolute', bottom: 8, right: 12, borderWidth: 3, borderColor: '#0B0E14' },
  mainHeading: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 12, letterSpacing: -0.2 },
  subHeading: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20, paddingHorizontal: 12, marginBottom: 40 },
  footerText: { fontSize: 11, color: '#484F58', fontWeight: '500' }
});

const styles = StyleSheet.create({
  contentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  supportAvatar: { width: '100%', height: '100%', resizeMode: 'cover' },
  telegramButton: { flexDirection: 'row', width: '100%', height: 54, backgroundColor: '#2AABEE', borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#2AABEE', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  buttonDisabledDark: { backgroundColor: '#1E293B', shadowOpacity: 0 },
  buttonDisabledLight: { backgroundColor: '#E2E8F0', shadowOpacity: 0 },
  buttonIcon: { marginRight: 10 },
  telegramButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  textDisabledDark: { color: '#94A3B8' },
  textDisabledLight: { color: '#64748B' },
  footer: { paddingBottom: Platform.OS === 'ios' ? 20 : 16, alignItems: 'center' }
});
