import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet, View } from "react-native";
import { BaseUrlGuard } from "../components/BaseUrlGuard";
import { UserProvider } from "../context/UserContext";
import { colors } from "../theme";



export default function RootLayout() {
  return (
    <UserProvider>
      <BaseUrlGuard>
        <View style={styles.container}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="anime/[id]"
              options={{
                headerShown: false,
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="watch/[id]"
              options={{
                headerShown: false,
                animation: "fade",
                presentation: "fullScreenModal",
              }}
            />
            <Stack.Screen
              name="watch/heaven"
              options={{
                headerShown: false,
                animation: "fade",
                presentation: "fullScreenModal",
              }}
            />
            <Stack.Screen name="character/[id]" />
            <Stack.Screen name="actor/[id]" />
            <Stack.Screen name="genre/[genre]" />
            <Stack.Screen name="results" />
          </Stack>
        </View>
      </BaseUrlGuard>
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
