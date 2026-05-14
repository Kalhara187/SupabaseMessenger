import React from 'react';
import { TextInput, View, Text } from 'react-native';

const AuthInput = ({ label, error, ...props }) => {
  return (
    <View className="mb-4">
      <Text className="text-slate-300 mb-2">{label}</Text>
      <TextInput
        className="bg-slate-800 text-white rounded-2xl px-4 py-3 border border-slate-700"
        placeholderTextColor="#94A3B8"
        {...props}
      />
      {error ? <Text className="text-red-400 mt-1">{error}</Text> : null}
    </View>
  );
};

export default AuthInput;
