import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { useUser } from "../context/UserContext";

export function BaseUrlGuard({ children }: { children: React.ReactNode }) {
    const { isValidConnection, isLoading } = useUser();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const segmentsList = segments as string[];
        const inSettingsGroup = segmentsList.length > 1 && segmentsList[0] === "(tabs)" && segmentsList[1] === "settings";

        if (!isValidConnection && !inSettingsGroup) {
            // If connection is invalid and we aren't already in settings, go there
            // We use replace to prevent going back to a broken state
            router.replace("/(tabs)/settings");
        }
    }, [isValidConnection, isLoading, segments]);

    if (isLoading) {
        return <View />; // Or a splash screen
    }

    return <>{children}</>;
}
