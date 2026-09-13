import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GoldInput } from '../../components/GoldInput';
import { GoldButton } from '../../components/GoldButton';
import { authAPI } from '../../services/api';
import { useStore } from '../../store/useStore';
import { colors } from '../../theme/colors';
import NightSkyBackground from '../../components/NightSkyBackground';

export const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const login = useStore((s) => s.login);

  const handleLogin = async () => {
    setIsPending(true);
    try {
      const res = await authAPI.login(email.trim(), password);
      login(res.user, res.accessToken, res.refreshToken);
      // No manual navigation needed — RootNavigator switches to Main
      // automatically once isAuthenticated flips true in the store.
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Unable to sign in. Please check your connection and try again.';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <View style={styles.container}>
      <NightSkyBackground />
      <LinearGradient
        colors={['rgba(10,10,15,0.4)', 'rgba(10,10,15,0.85)', '#0A0A0F']}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey</Text>
        </View>

        <View style={styles.form}>
          <GoldInput
            placeholder="Email address"
            iconName="envelope"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <GoldInput
            placeholder="Password"
            isPassword
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.forgotWrap} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgot}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <GoldButton
          title="Sign In"
          onPress={handleLogin}
          loading={isPending}
          disabled={!email || !password}
        />

        <View style={styles.signUpRow}>
          <Text style={styles.signUpText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signUpLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  inner: { flex: 1, paddingHorizontal: 28, justifyContent: 'center', gap: 24 },
  header: { gap: 8, alignItems: 'center', marginBottom: 8 },
  title: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 32, color: colors.goldEnd, textAlign: 'center' },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  form: { gap: 14 },
  forgotWrap: { alignItems: 'flex-end' },
  forgot: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.goldMid },
  signUpRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  signUpText: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textMuted },
  signUpLink: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.goldEnd },
});
