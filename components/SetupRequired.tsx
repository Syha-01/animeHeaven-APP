import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface SetupRequiredProps {
    reason?: 'missing_config' | 'connection_failed';
    currentUrl?: string | null;
}

export function SetupRequired({ reason = 'missing_config', currentUrl }: SetupRequiredProps) {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Ionicons
                    name={reason === 'connection_failed' ? 'cloud-offline-outline' : 'settings-outline'}
                    size={64}
                    color={reason === 'connection_failed' ? '#FF6B6B' : colors.primary}
                />
                <Text style={styles.title}>
                    {reason === 'connection_failed' ? 'Connection Failed' : 'Setup Required'}
                </Text>

                <Text style={styles.description}>
                    {reason === 'connection_failed'
                        ? `Cannot reach server at:\n${currentUrl}\n\nPlease ensure your server is running and accessible.`
                        : 'Please configure the Server Base URL in settings to start using the app.'}
                </Text>

                <Pressable
                    style={[styles.button, reason === 'connection_failed' && styles.errorButton]}
                    onPress={() => router.push('/(tabs)/settings')}
                >
                    <Text style={styles.buttonText}>
                        {reason === 'connection_failed' ? 'Check Settings' : 'Go to Settings'}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    content: {
        alignItems: 'center',
        maxWidth: 300,
    },
    title: {
        fontSize: typography.fontSize.xxxl,
        fontWeight: '800',
        color: colors.text,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    description: {
        fontSize: typography.fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 24,
    },
    button: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 50,
    },
    errorButton: {
        backgroundColor: '#FF6B6B',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: typography.fontSize.md,
        fontWeight: '600',
    },
});
