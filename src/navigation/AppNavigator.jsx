import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Platform } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import ArKitScreen from '../screens/ArKitScreen';

const Stack = createNativeStackNavigator();

// Navegador mínimo con una sola pantalla para descartar errores de hijos inválidos
const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      {Platform.OS === 'ios' ? <Stack.Screen name="ARKit" component={ArKitScreen} /> : null}
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;
