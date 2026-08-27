import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform, ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Linking from 'expo-linking';
import { auth } from './src/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { ThemeProvider } from './ThemeContext';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import TasksScreen from './src/screens/TasksScreen';
import AboutUsScreen from './src/screens/AboutUsScreen';
import NoticesScreen from './src/screens/NoticesScreen';
import InvitationScreen from './src/screens/InvitationScreen';
import VipScreen from './src/screens/VipScreen';
import TeamScreen from './src/screens/TeamScreen';
import MeScreen from './src/screens/MeScreen';
import ProfileParticularsScreen from './src/screens/ProfileParticularsScreen';
import SettlementConfigScreen from './src/screens/SettlementConfigScreen';
import WithdrawAssetsScreen from './src/screens/WithdrawAssetsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SupportScreen from './src/screens/SupportScreen';
import SecurityScreen from './src/screens/SecurityScreen';
import DepositScreen from './src/screens/DepositScreen';
import AdminWithdrawalsScreen from './src/screens/AdminWithdrawalsScreen';
import PhoneVerifyScreen from './src/screens/PhoneVerifyScreen';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null };

  componentDidCatch(error, errorInfo) {
    this.setState({
      hasError: true,
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>App Error Caught</Text>
          <ScrollView style={styles.errorScroll}>
            <Text style={styles.errorText}>
              {this.state.error && this.state.error.toString()}
            </Text>
            <Text style={styles.errorSubText}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = `
    html, body, #root {
      height: 100% !important;
      overflow-y: auto !important;
      background-color: #0B0E14 !important;
    }
  `;
  document.head.appendChild(style);
}

const prefix = Linking.createURL('/');

const normalizeWebUrl = (url) => {
  if (!url || Platform.OS !== 'web') return url;
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hash.startsWith('#/')) {
      return `${parsedUrl.origin}${parsedUrl.hash.substring(1)}`;
    }
    return url;
  } catch (error) {
    return url;
  }
};

const getWebInitialURL = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return normalizeWebUrl(window.location.href);
};

const subscribeToWebURLChanges = (listener) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return () => {};
  }
  const handleURLChange = () => listener(normalizeWebUrl(window.location.href));
  window.addEventListener('hashchange', handleURLChange);
  window.addEventListener('popstate', handleURLChange);
  return () => {
    window.removeEventListener('hashchange', handleURLChange);
    window.removeEventListener('popstate', handleURLChange);
  };
};

// PhoneVerify is only ever reached with two purposes now: "email_change"
// (Security > Change Email, verified via the CURRENT registered phone) and
// "forgot_password" (Login > Forgot Password, only after 5 failed email
// attempts). "phone_change" was dropped since Phone Number changes no
// longer use SMS at all (Email OTP only), so newPhone/dialCode params are
// no longer needed here.
const linking = {
  prefixes: [
    prefix,
    'taskearn://',
    'https://taskearn-app.com'
  ],
  config: {
    screens: {
      Login: 'login',
      Register: {
        path: 'register',
        parse: { ref: (ref) => ref },
      },
      Home: 'home',
      PhoneVerify: {
        path: 'phone-verify',
        parse: {
          purpose: (v) => v,
          token: (v) => v,
          phone: (v) => v,
          newEmail: (v) => v,
        },
      },
    },
  },
  getInitialURL: async () => {
    if (Platform.OS === 'web') return getWebInitialURL();
    return await Linking.getInitialURL();
  },
  subscribe: (listener) => {
    const nativeSubscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });
    let webUnsubscribe = () => {};
    if (Platform.OS === 'web') {
      webUnsubscribe = subscribeToWebURLChanges(listener);
    }
    return () => {
      nativeSubscription.remove();
      webUnsubscribe();
    };
  },
};

const Stack = createStackNavigator();

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (authenticatedUser) => {
      setUser(authenticatedUser);
      if (initializing) setInitializing(false);
    });
    return subscriber;
  }, [initializing]);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  let initialRouteName = user ? 'Home' : 'Login';

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const currentUrl = normalizeWebUrl(window.location.href);
      if (currentUrl) {
        const parsedUrl = new URL(currentUrl);
        const isRegisterPath =
          parsedUrl.pathname === '/register' ||
          parsedUrl.pathname.endsWith('/register');
        const referralCode = parsedUrl.searchParams.get('ref');
        if (isRegisterPath && referralCode) {
          initialRouteName = 'Register';
        }

        const isPhoneVerifyPath =
          parsedUrl.pathname === '/phone-verify' ||
          parsedUrl.pathname.endsWith('/phone-verify');
        if (isPhoneVerifyPath) {
          initialRouteName = 'PhoneVerify';
        }
      }
    } catch (error) {}
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationContainer linking={linking}>
            <Stack.Navigator
              initialRouteName={initialRouteName}
              screenOptions={{
                headerShown: false,
                animationEnabled: false,
                cardStyle: { backgroundColor: '#0B0E14' }
              }}
            >
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                initialParams={{
                  updatedBalance: 0.0,
                  totalBalance: 0.0,
                  todayEarnings: 0.0,
                  taskCount: 0,
                  recentActivities: []
                }}
              />
              <Stack.Screen name="Tasks" component={TasksScreen} />
              <Stack.Screen name="AboutUs" component={AboutUsScreen} />
              <Stack.Screen name="Notices" component={NoticesScreen} />
              <Stack.Screen name="Invitation" component={InvitationScreen} />
              <Stack.Screen name="Vip" component={VipScreen} />
              <Stack.Screen name="Team" component={TeamScreen} />
              <Stack.Screen name="Me" component={MeScreen} />
              <Stack.Screen name="ProfileParticulars" component={ProfileParticularsScreen} />
              <Stack.Screen name="Settlement" component={SettlementConfigScreen} />
              <Stack.Screen name="WithdrawAssets" component={WithdrawAssetsScreen} />
              <Stack.Screen name="History" component={HistoryScreen} />
              <Stack.Screen name="Support" component={SupportScreen} />
              <Stack.Screen name="SecurityScreen" component={SecurityScreen} />
              <Stack.Screen name="Deposit" component={DepositScreen} />
              <Stack.Screen name="AdminWithdrawalsScreen" component={AdminWithdrawalsScreen} />
              <Stack.Screen name="PhoneVerify" component={PhoneVerifyScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0E14',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  errorTitle: {
    color: '#FF4D4D',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorScroll: {
    width: '100%',
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 8,
  },
  errorSubText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 10,
  },
});