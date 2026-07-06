import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import ARScreen from '../screens/ARScreen';
import AuthScreen from '../screens/AuthScreen';
import AgencyReservationsScreen from '../screens/AgencyReservationsScreen';
import AgencyDashboardScreen from '../screens/AgencyDashboardScreen';
import CreatePackageScreen from '../screens/CreatePackageScreen';
import CreatePlaceScreen from '../screens/CreatePlaceScreen';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import MyReservationsScreen from '../screens/MyReservationsScreen';
import PlaceDetailScreen from '../screens/PlaceDetailScreen';
import ManagePlacesScreen from '../screens/ManagePlacesScreen';
import ManagePackagesScreen from '../screens/ManagePackagesScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';

const Stack = createNativeStackNavigator();

// Navegador con soporte AR multiplataforma usando ViroReact
const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="ARView" component={ARScreen} />
      <Stack.Screen name="Map" component={MapScreen} />
      <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} />
      <Stack.Screen name="MyReservations" component={MyReservationsScreen} />
      <Stack.Screen name="AgencyReservations" component={AgencyReservationsScreen} />
      <Stack.Screen name="AgencyDashboard" component={AgencyDashboardScreen} />
      <Stack.Screen name="CreatePlace" component={CreatePlaceScreen} />
      <Stack.Screen name="CreatePackage" component={CreatePackageScreen} />
      <Stack.Screen name="ManagePlaces" component={ManagePlacesScreen} />
      <Stack.Screen name="ManagePackages" component={ManagePackagesScreen} />
      <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;
