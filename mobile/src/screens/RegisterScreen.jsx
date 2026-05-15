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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setForm((prev) => ({ ...prev, profileImage: result.assets[0].uri }));
    }
  };

  const onSubmit = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      await register(form);
    } catch (error) {
      const validationMessages = error.response?.data?.errors?.map((item) => item.msg).filter(Boolean);
      const message =
        error.response?.data?.message ||
        validationMessages?.join('\n') ||
        'Please try again.';
      setErrorMessage(message);
    } finally {
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
