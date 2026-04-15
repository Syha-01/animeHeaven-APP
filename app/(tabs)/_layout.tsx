import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import { colors } from "../../theme";

type TabIconProps = {
    name: keyof typeof Ionicons.glyphMap;
    color: string;
    focused: boolean;
};

function TabIcon({ name, color, focused }: TabIconProps) {
    return (
        <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
            <Ionicons name={name} size={24} color={color} />
            {focused && <View style={styles.activeIndicator} />}
        </View>
    );
}

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textTertiary,
                tabBarShowLabel: true,
                tabBarLabelStyle: styles.tabLabel,
                tabBarBackground: () => (
                    Platform.OS === 'ios' ? (
                        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                    ) : (
                        <View style={[StyleSheet.absoluteFill, styles.tabBarBackground]} />
                    )
                ),
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name={focused ? "home" : "home-outline"} color={color} focused={focused} />
                    ),
                }}
            />

            <Tabs.Screen
                name="search"
                options={{
                    title: "Search",
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name={focused ? "search" : "search-outline"} color={color} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="schedule"
                options={{
                    title: "Schedule",
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name={focused ? "calendar" : "calendar-outline"} color={color} focused={focused} />
                    ),
                }}
            />

            <Tabs.Screen
                name="saved"
                options={{
                    title: "Saved",
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name={focused ? "heart" : "heart-outline"} color={color} focused={focused} />
                    ),
                }}
            />

            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name={focused ? "settings" : "settings-outline"} color={color} focused={focused} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: Platform.OS === 'ios' ? 50 : 70,
        paddingBottom: Platform.OS === 'ios' ? 30 : 20,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: 'transparent',
        elevation: 0,
    },
    tabBarBackground: {
        backgroundColor: colors.backgroundSecondary + 'F5',
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 0,
    },
    iconContainerFocused: {
        transform: [{ scale: 1.1 }],
    },
    activeIndicator: {
        // position: 'absolute',
        // bottom: -8,
        // width: 4,
        // height: 4,
        // borderRadius: 2,
        backgroundColor: colors.primary,
    },
});
