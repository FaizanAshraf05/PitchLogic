import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../theme';
import { TitleScreen } from '../screens/TitleScreen';
import { TeamSelectScreen } from '../screens/TeamSelectScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SquadScreen } from '../screens/SquadScreen';
import { MatchScreen } from '../screens/MatchScreen';
import { LeagueScreen } from '../screens/LeagueScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { TransferScreen } from '../screens/TransferScreen';
import { PreMatchScreen } from '../screens/PreMatchScreen';

export type RootStackParamList = {
  Title: undefined;
  TeamSelect: undefined;
  Main: { teamId: string; managerName: string } | undefined;
  Schedule: { teamId: number } | undefined;
  Squad: undefined;
  Match: undefined;
  League: undefined;
  More: undefined;
  Transfer: { teamId: number } | undefined;
  PreMatch: { matchId: number; teamId: number } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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
        <Stack.Screen name="Main" component={HomeScreen} />
        <Stack.Screen name="Squad" component={SquadScreen} />
        <Stack.Screen name="Match" component={MatchScreen} />
        <Stack.Screen name="League" component={LeagueScreen} />
        <Stack.Screen name="More" component={MoreScreen} />
        <Stack.Screen name="Schedule" component={ScheduleScreen} />
        <Stack.Screen name="Transfer" component={TransferScreen} />
        <Stack.Screen name="PreMatch" component={PreMatchScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
