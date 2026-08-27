import React, { useState, useEffect } from 'react';
import { Modal, View, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functionsInstance = getFunctions();

const PHONE_VERIFY_BASE_URL = 'https://taskearn-app.com/#/phone-verify';

// Reusable "bridge" that opens a small in-app browser window pointed at the
// PhoneVerifyScreen web page (the same code that already works correctly in
// a real browser). Used only on native (Android/iOS) — on web, the calling
// screen talks to Firebase Phone Auth directly since it's already running
// inside a real browser.
export default function PhoneVerifyBridge({ visible, purpose, phone, newEmail, newPhone, dialCode, onResult, onClose }) {
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      setUrl(null);
      setLoading(true);
      setError('');
      return;
    }

    const prepare = async () => {
      setLoading(true);
      setError('');
      try {
        const issueToken = httpsCallable(functionsInstance, 'issueWebViewSessionToken');
        const res = await issueToken();
        const token = res.data.token;

        const params = new URLSearchParams();
        params.set('purpose', purpose);
        params.set('token', token);
        if (phone) params.set('phone', phone);
        if (newEmail) params.set('newEmail', newEmail);
        if (newPhone) params.set('newPhone', newPhone);
        if (dialCode) params.set('dialCode', dialCode);

        setUrl(`${PHONE_VERIFY_BASE_URL}?${params.toString()}`);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to open verification.');
        setLoading(false);
      }
    };

    prepare();
  }, [visible, purpose, phone, newEmail, newPhone, dialCode]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.success) {
        onResult(data);
      }
    } catch (e) {}
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        )}

        {!!error && (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!loading && !error && url && (
          <WebView
            source={{ uri: url }}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12 },
  closeBtn: { padding: 8 },
  closeBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#EF4444', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 }
});