import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';

const DEFAULT_APK_URL = 'https://firebasestorage.googleapis.com/v0/b/taskearn-e5c35.firebasestorage.app/o/TaskEarn.apk?alt=media';

function compareVersions(a, b) {
  const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

// Wraps the whole app. If the installed version is below the minimum set
// by the admin, a full-screen Update Now screen blocks the app.
export default function UpdateGate({ children }) {
  const [required, setRequired] = useState(false);
  const [latestVersion, setLatestVersion] = useState('');
  const [apkUrl, setApkUrl] = useState(DEFAULT_APK_URL);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    (async () => {
      try {
        const current = Application.nativeApplicationVersion;
        if (!current) return;
        const fn = httpsCallable(functions, 'getAppVersionConfig');
        const res = await fn();
        const cfg = res.data || {};
        if (cancelled) return;
        if (cfg.minVersion && compareVersions(current, cfg.minVersion) < 0) {
          setLatestVersion(cfg.latestVersion || cfg.minVersion);
          setApkUrl(cfg.apkUrl || DEFAULT_APK_URL);
          setRequired(true);
        }
      } catch (e) {
        // If the check fails, never block the app.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {required && (
        <View style={styles.overlay}>
          <View style={styles.box}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="cellphone-arrow-down" size={34} color="#3B82F6" />
            </View>
            <Text style={styles.title}>Update Required</Text>
            <Text style={styles.message}>
              A new version of TaskEarn{latestVersion ? ' (' + latestVersion + ')' : ''} is available. Please update the app to continue using it.
            </Text>
            <TouchableOpacity style={styles.button} onPress={() => Linking.openURL(apkUrl).catch(() => {})}>
              <Text style={styles.buttonText}>Update Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0B0E14', justifyContent: 'center', alignItems: 'center', padding: 28, zIndex: 99999, elevation: 99999 },
  box: { width: '100%', maxWidth: 380, alignItems: 'center' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(59,130,246,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 10 },
  message: { fontSize: 14, lineHeight: 21, color: '#C9D1D9', textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#3B82F6', alignSelf: 'stretch', height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
