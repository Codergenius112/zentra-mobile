import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GoldInput } from '../../components/GoldInput';
import { GoldButton } from '../../components/GoldButton';
import { authAPI } from '../../services/api';
import { useStore } from '../../store/useStore';
import { colors } from '../../theme/colors';
import NightSkyBackground from '../../components/NightSkyBackground';

export const SignUpScreen = ({ navigation }: any) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const login = useStore((s) => s.login);

  const handleSignUp = async () => {
    if (password !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');

    setIsPending(true);
    try {
      const res = await authAPI.register({ email, password, firstName, lastName });
      login(res.user, res.accessToken, res.refreshToken);
    } catch (err) {
      Alert.alert('Error', 'Could not create account. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  const canSubmit = firstName && lastName && email && password && confirmPassword;

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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join and elevate your nights</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.nameRow}>
              <GoldInput
                placeholder="First name"
                iconName="user"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                style={styles.nameInput}
              />
              <GoldInput
                placeholder="Last name"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                style={styles.nameInput}
              />
            </View>
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
            <GoldInput
              placeholder="Confirm Password"
              isPassword
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <GoldButton
            title="Create Account"
            onPress={handleSignUp}
            loading={isPending}
            disabled={!canSubmit}
          />

          <Text style={styles.terms}>
            By signing up you agree to our Terms & Privacy Policy
          </Text>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  inner: { flex: 1, paddingHorizontal: 28 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', gap: 20, paddingVertical: 40 },
  header: { gap: 8, alignItems: 'center' },
  title: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 32, color: colors.goldEnd, textAlign: 'center' },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  form: { gap: 14 },
  nameRow: { flexDirection: 'row', gap: 12 },
  nameInput: { flex: 1 },
  terms: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textMuted },
  loginLink: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.goldEnd },
});
