import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AuthInput from '../components/AuthInput';
import { useAuth } from '../context/AuthContext';

const RegisterScreen = () => {
  const { register } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    profileImage: null,
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setForm((prev) => ({ ...prev, profileImage: result.assets[0].uri }));
    }
  };

  const onSubmit = async () => {
    try {
      console.log('[RegisterScreen] Submit clicked');
      setLoading(true);
      setErrorMessage('');

      console.log('[RegisterScreen] Calling register with form data');
      await register(form);

      console.log('[RegisterScreen] Registration succeeded!');
      // Success will be handled by navigation context
    } catch (error) {
      console.error('[RegisterScreen] Registration error caught!');
      console.error('[RegisterScreen] Error type:', error.constructor.name);
      console.error('[RegisterScreen] Error message:', error.message);
      console.error('[RegisterScreen] Error code:', error.code);
      console.error('[RegisterScreen] Full error:', JSON.stringify(error, null, 2));

      if (error.response) {
        console.error('[RegisterScreen] HTTP Error Response:');
        console.error('  Status:', error.response.status);
        console.error('  Status Text:', error.response.statusText);
        console.error('  Data:', error.response.data);
      }

      if (error.request && !error.response) {
        console.error('[RegisterScreen] Network request failed (no response)');
        console.error('  Request:', error.request);
      }

      if (!error.request && !error.response) {
        console.error('[RegisterScreen] Error occurred before request could be sent');
      }

      // Extract and display error message
      let displayMessage = 'Please try again.';

      if (error.response?.data?.message) {
        displayMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const validationMessages = error.response.data.errors
          .map((item) => item.msg)
          .filter(Boolean);
        displayMessage = validationMessages.join('\n') || displayMessage;
      } else if (error.message) {
        displayMessage = error.message;
      }

      console.log('[RegisterScreen] Displaying error message:', displayMessage);
      setErrorMessage(displayMessage);

      // Also show an alert for visibility
      alert(`Registration failed:\n\n${displayMessage}`);
    } finally {
      console.log('[RegisterScreen] Cleanup: resetting loading state');
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-ink px-6 justify-center">
      <Text className="text-3xl text-slate-100 font-bold mb-6">Create account</Text>

      <AuthInput label="Full Name" value={form.fullName} onChangeText={(fullName) => setForm((prev) => ({ ...prev, fullName }))} />
      <AuthInput label="Username" value={form.username} onChangeText={(username) => setForm((prev) => ({ ...prev, username }))} autoCapitalize="none" />
      <AuthInput label="Email" value={form.email} onChangeText={(email) => setForm((prev) => ({ ...prev, email }))} autoCapitalize="none" keyboardType="email-address" />
      <AuthInput label="Password" value={form.password} onChangeText={(password) => setForm((prev) => ({ ...prev, password }))} secureTextEntry />

      <Pressable onPress={pickImage} className="bg-slate-800 py-3 rounded-2xl mt-1">
        <Text className="text-slate-200 text-center">{form.profileImage ? 'Change profile image' : 'Select profile image'}</Text>
      </Pressable>

      <Pressable onPress={onSubmit} disabled={loading} className="bg-brand-500 py-4 rounded-2xl mt-5">
        <Text className="text-white font-semibold text-center">{loading ? 'Creating account...' : 'Create account'}</Text>
      </Pressable>

      {!!errorMessage && <Text className="text-red-400 text-sm mt-3 text-center">{errorMessage}</Text>}
    </View>
  );
};

export default RegisterScreen;
