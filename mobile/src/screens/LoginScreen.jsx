import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import AuthInput from '../components/AuthInput';
import { useAuth } from '../context/AuthContext';

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    try {
      setLoading(true);
      await login({ email, password });
    } catch (error) {
      Alert.alert('Login failed', error.userMessage || error.response?.data?.message || error.message || 'Please check your credentials and network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-ink px-6 justify-center">
      <Text className="text-3xl text-slate-100 font-bold mb-8">Welcome back</Text>
      <AuthInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <AuthInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />

      <Pressable onPress={onSubmit} disabled={loading} className="bg-brand-500 py-4 rounded-2xl mt-2">
        <Text className="text-white font-semibold text-center">{loading ? 'Signing in...' : 'Sign in'}</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate('ForgotPassword')} className="mt-4">
        <Text className="text-brand-500 text-center">Forgot password?</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Register')} className="mt-3">
        <Text className="text-slate-300 text-center">No account? Create one</Text>
      </Pressable>
    </View>
  );
};

export default LoginScreen;
