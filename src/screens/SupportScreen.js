import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../../ThemeContext';
import { functions } from '../firebaseConfig';
import { httpsCallable } from 'firebase/functions';

export default function LiveSupportScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'model',
      text: "Hi! I'm the TaskEarn AI Assistant. Ask me anything about deposits, withdrawals, VIP levels, tasks, referrals, or your account — I'm here to help."
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  const handleBack = () => {
    if (navigation && typeof navigation.goBack === 'function') {
      navigation.goBack();
    }
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    const userMsg = { id: `u-${Date.now()}`, role: 'user', text: trimmed };
    const historyForBackend = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setSending(true);

    try {
      const chatFn = httpsCallable(functions, 'chatWithSupportAI');
      const result = await chatFn({ message: trimmed, history: historyForBackend });
      const replyText = result?.data?.reply || "Sorry, I couldn't process that. Please try again.";
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'model', text: replyText }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'model', text: "Sorry, I'm having trouble responding right now. Please try again in a moment." }
      ]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAI]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Image source={require('../../assets/icon.png')} style={styles.aiAvatarImage} resizeMode="cover" />
          </View>
        )}
        <View style={[
          styles.bubble,
          isUser ? styles.bubbleUser : currentStyles.bubbleAI
        ]}>
          <Text style={isUser ? styles.bubbleUserText : currentStyles.bubbleAIText}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={currentStyles.container}>
      <StatusBar backgroundColor={isDarkMode ? "#0B0E14" : "#FFFFFF"} barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <View style={currentStyles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={isDarkMode ? "#E2E8F0" : "#1E293B"} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerIconBox}>
            <Image source={require('../../assets/icon.png')} style={styles.headerLogoImage} resizeMode="cover" />
          </View>
          <View>
            <Text style={currentStyles.headerTitle}>TaskEarn AI Assistant</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
        </View>
        <View style={{ width: 30 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {sending && (
          <View style={styles.typingRow}>
            <View style={styles.aiAvatar}>
              <Image source={require('../../assets/icon.png')} style={styles.aiAvatarImage} resizeMode="cover" />
            </View>
            <View style={[styles.bubble, currentStyles.bubbleAI, styles.typingBubble]}>
              <ActivityIndicator size="small" color={isDarkMode ? "#94A3B8" : "#64748B"} />
            </View>
          </View>
        )}

        <View style={[currentStyles.inputBar, { paddingBottom: 10 + insets.bottom }]}>
          <TextInput
            style={currentStyles.textInput}
            placeholder="Type your message..."
            placeholderTextColor={isDarkMode ? "#64748B" : "#94A3B8"}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <Feather name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 8 },
  textInput: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#1E293B', maxHeight: 100, borderWidth: 1, borderColor: '#F1F5F9' },
  bubbleAI: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9' },
  bubbleAIText: { color: '#334155', fontSize: 14, lineHeight: 20 }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#161B22', paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#21262D', gap: 8 },
  textInput: { flex: 1, backgroundColor: '#0B0E14', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#E2E8F0', maxHeight: 100, borderWidth: 1, borderColor: '#21262D' },
  bubbleAI: { backgroundColor: '#161B22', borderWidth: 1, borderColor: '#21262D' },
  bubbleAIText: { color: '#E2E8F0', fontSize: 14, lineHeight: 20 }
});

const styles = StyleSheet.create({
  backBtn: { padding: 4, width: 30 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' },
  headerIconBox: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden', backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  headerLogoImage: { width: '100%', height: '100%' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  statusText: { fontSize: 10, color: '#22C55E', fontWeight: '600' },
  messagesList: { paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAI: { justifyContent: 'flex-start' },
  aiAvatar: { width: 26, height: 26, borderRadius: 13, overflow: 'hidden', backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  aiAvatarImage: { width: '100%', height: '100%' },
  bubble: { maxWidth: '75%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: '#3B82F6', borderBottomRightRadius: 4 },
  bubbleUserText: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  typingBubble: { paddingVertical: 12, paddingHorizontal: 16 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  sendBtnDisabled: { backgroundColor: '#94A3B8' }
});