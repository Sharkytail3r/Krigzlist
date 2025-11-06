// app/layout.tsx
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function Layout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false, // hides top bar
          contentStyle: { backgroundColor: "#f7f7f7" },
        }}
      />
    </SafeAreaProvider>
  );
}
