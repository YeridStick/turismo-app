import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import ARScreen from '../screens/ARScreen';
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';

const Stack = createNativeStackNavigator();

// Navegador con soporte AR multiplataforma usando ViroReact
const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="ARView" component={ARScreen} />
      <Stack.Screen name="Map" component={MapScreen} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;
