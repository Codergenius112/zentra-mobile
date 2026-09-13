import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 } from '@expo/vector-icons';
import StarField from '../../components/StarField';
import { authAPI } from '../../services/api';

type Step = 'request' | 'reset';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.forgotPassword(email.trim());
      setLoading(false);
      if (response.resetToken) {
        Alert.alert(
          'Reset Token',
          `Your reset token is: ${response.resetToken}\n\nCopy this token and use it in the next step.`,
          [{ text: 'OK', onPress: () => setStep('reset') }],
        );
      } else {
        Alert.alert(
          'Check Your Email',
          'If an account exists with that email, you will receive a password reset link. Please check your inbox.',
          [{ text: 'OK', onPress: () => setStep('reset') }],
        );
      }
    } catch (error: any) {
      setLoading(false);
      const errorMessage = error?.response?.data?.message || error?.message || 'Unable to process your request. Please try again.';
      Alert.alert('Request Failed', errorMessage);
    }
  };

  const handleResetPassword = async () => {
    if (!token.trim()) {
      Alert.alert('Error', 'Please enter the reset token');
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await authAPI.resetPassword(token.trim(), newPassword);
      setLoading(false);
      Alert.alert('Password Reset Successful', 'Your password has been reset successfully. You can now login with your new password.', [
        { text: 'Login', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error: any) {
      setLoading(false);
      const errorMessage = error?.response?.data?.message || error?.message || 'Unable to reset password. Please check your token and try again.';
      Alert.alert('Reset Failed', errorMessage);
    }
  };

  const renderRequestStep = () => (
    <>
      <View style={styles.header}>
        <View style={styles.orbHint}>
          <FontAwesome6 name="lock" size={17} color="#C9972A" />
        </View>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>Enter your email and we'll guide you through the reset.</Text>
      </View>
      <View style={styles.inputWrapper}>
        <FontAwesome6 name="envelope" size={15} color="rgba(255,255,255,0.35)" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor="rgba(255,255,255,0.28)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <TouchableOpacity onPress={handleRequestReset} activeOpacity={0.85} disabled={loading}>
        <LinearGradient colors={['#C9972A', '#E8B84B', '#F5C842']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
          {loading ? <ActivityIndicator color="#1a0f00" /> : <Text style={styles.buttonText}>Send Reset Token</Text>}
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
        <FontAwesome6 name="chevron-left" size={13} color="rgba(201,151,42,0.85)" />
        <Text style={styles.backLinkText}>Back to Login</Text>
      </TouchableOpacity>
    </>
  );

  const renderResetStep = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Use the token from your inbox and pick a new password.</Text>
      </View>
      <View style={styles.inputWrapper}>
        <FontAwesome6 name="key" size={15} color="rgba(255,255,255,0.35)" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Reset Token"
          placeholderTextColor="rgba(255,255,255,0.28)"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.inputWrapper}>
        <FontAwesome6 name="lock" size={15} color="rgba(255,255,255,0.35)" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { paddingRight: 46 }]}
          placeholder="New Password"
          placeholderTextColor="rgba(255,255,255,0.28)"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
          <FontAwesome6 name={showPassword ? 'eye-slash' : 'eye'} size={15} color="rgba(255,255,255,0.35)" />
        </TouchableOpacity>
      </View>
      <View style={styles.inputWrapper}>
        <FontAwesome6 name="shield-halved" size={15} color="rgba(255,255,255,0.35)" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Confirm New Password"
          placeholderTextColor="rgba(255,255,255,0.28)"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.passwordHint}>
        <FontAwesome6 name="circle-info" size={12} color="rgba(255,255,255,0.35)" />
        <Text style={styles.passwordHintText}>Password must be at least 8 characters</Text>
      </View>
      <TouchableOpacity onPress={handleResetPassword} activeOpacity={0.85} disabled={loading}>
        <LinearGradient colors={['#C9972A', '#E8B84B', '#F5C842']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
          {loading ? <ActivityIndicator color="#1a0f00" /> : <Text style={styles.buttonText}>Reset Password</Text>}
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backLink} onPress={() => setStep('request')}>
        <FontAwesome6 name="chevron-left" size={13} color="rgba(201,151,42,0.85)" />
        <Text style={styles.backLinkText}>Back to Email Step</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StarField count={50} maxTop={45} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 'request' ? renderRequestStep() : renderResetStep()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 36 },
  header: { marginBottom: 26, alignItems: 'center' },
  orbHint: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(201,151,42,0.14)', borderWidth: 1, borderColor: 'rgba(201,151,42,0.22)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 28, fontWeight: '700', color: '#F5C842', fontFamily: 'PlayfairDisplay-Bold', marginBottom: 8, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.42)', lineHeight: 21, textAlign: 'center', letterSpacing: 0.2 },
  inputWrapper: { position: 'relative', flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F0F1C', borderWidth: 1, borderColor: 'rgba(201,151,42,0.2)', borderRadius: 15, paddingHorizontal: 18, marginBottom: 14 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: 'rgba(255,255,255,0.88)', fontSize: 15, paddingVertical: 17, letterSpacing: 0.2 },
  eyeBtn: { position: 'absolute', right: 16, padding: 6 },
  passwordHint: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 4, gap: 8 },
  passwordHintText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  button: { paddingVertical: 18, borderRadius: 15, alignItems: 'center', marginBottom: 20, shadowColor: '#C9972A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 8 },
  buttonText: { color: '#1a0f00', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  backLinkText: { color: 'rgba(201,151,42,0.85)', fontSize: 14, fontWeight: '600' },
});
