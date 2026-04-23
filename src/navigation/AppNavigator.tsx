import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors } from '../theme';
import { TitleScreen } from '../screens/TitleScreen';
import { TeamSelectScreen } from '../screens/TeamSelectScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SquadScreen } from '../screens/SquadScreen';
import { MatchScreen } from '../screens/MatchScreen';
import { LeagueScreen } from '../screens/LeagueScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { TabBar } from '../components/TabBar';

export type RootStackParamList = {
  Title: undefined;
  TeamSelect: undefined;
  Main: { teamId: string; managerName: string } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Squad: undefined;
  Match: undefined;
  League: undefined;
  More: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.green,
    background: Colors.bg,
    card: Colors.surface2,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.red,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Squad" component={SquadScreen} />
      <Tab.Screen name="Match" component={MatchScreen} />
      <Tab.Screen name="League" component={LeagueScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer theme={DarkTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="Title" component={TitleScreen} />
        <Stack.Screen name="TeamSelect" component={TeamSelectScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
