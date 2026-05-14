import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import AuthInput from '../components/AuthInput';
import { forgotPasswordRequest } from '../services/authService';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    try {
      setLoading(true);
      const response = await forgotPasswordRequest(email);
      Alert.alert('Request received', response.message || 'Password reset instructions sent.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Request failed', error.response?.data?.message || 'Try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-ink px-6 justify-center">
      <Text className="text-3xl text-slate-100 font-bold mb-8">Forgot password</Text>
      <AuthInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Pressable onPress={onSubmit} className="bg-brand-500 py-4 rounded-2xl mt-2" disabled={loading}>
        <Text className="text-center text-white font-semibold">{loading ? 'Sending...' : 'Send reset request'}</Text>
      </Pressable>
    </View>
  );
};

export default ForgotPasswordScreen;
