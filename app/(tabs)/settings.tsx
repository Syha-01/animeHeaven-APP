
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../../context/UserContext';
import { borderRadius, colors, spacing, typography } from '../../theme';

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const { baseUrl, setBaseUrl} = useUser();
    const [urlInput, setUrlInput] = useState(baseUrl || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const [tapCount, setTapCount] = useState(0);

    const handleVersionTap = async () => {
        const newCount = tapCount + 1;
        setTapCount(newCount);

        if (newCount >= 10) {
            setTapCount(0);
            Alert.alert(
                'Surprise!',
                'You are currently using AnimeHeaven!',
                [{ text: 'Awesome!' }]
            );
        }

        // Reset tap count after 2 seconds of inactivity
        setTimeout(() => {
            setTapCount((prev) => (prev === newCount ? 0 : prev));
        }, 2000);
    };

    const handleSave = async () => {
        if (!urlInput.trim()) {
            setMessage({ text: 'Please enter a valid URL', type: 'error' });
            return;
        }

        // Basic validation
        let formattedUrl = urlInput.trim();

        // Remove trailing slash if present
        formattedUrl = formattedUrl.replace(/\/$/, '');

        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = `http://${formattedUrl}`;
        }

        Keyboard.dismiss();
        setSaving(true);
        setMessage(null);

        try {
            // Test connection first
            setMessage({ text: 'Testing connection...', type: 'success' });

            // Test the connection
            const response = await fetch(`${formattedUrl}/api/v1/home`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Connection successful, save it
            await setBaseUrl(formattedUrl);
            setMessage({ text: 'Connected & Saved!', type: 'success' });
        } catch (err) {
            console.error('Connection test failed', err);
            setMessage({
                text: 'Connection failed. Check IP and ensure server is running.',
                type: 'error'
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { paddingTop: insets.top }]}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
                <View style={styles.content}>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>API Configuration</Text>
                        <Text style={styles.sectionDescription}>
                            Enter the IP address or Base URL of your anime streaming server.
                        </Text>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. http://192.168.1.5:3000"
                                placeholderTextColor={colors.textTertiary}
                                value={urlInput}
                                onChangeText={(text) => {
                                    setUrlInput(text);
                                    setMessage(null);
                                }}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {urlInput.length > 0 && (
                                <Pressable onPress={() => setUrlInput('')} style={styles.clearButton}>
                                    <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                                </Pressable>
                            )}
                        </View>

                        {message && (
                            <View style={[styles.messageContainer, message.type === 'error' ? styles.errorBox : styles.successBox]}>
                                <Ionicons
                                    name={message.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
                                    size={20}
                                    color={message.type === 'error' ? '#FF4444' : '#4CAF50'}
                                />
                                <Text style={[styles.messageText, { color: message.type === 'error' ? '#FF4444' : '#4CAF50' }]}>
                                    {message.text}
                                </Text>
                            </View>
                        )}

                        <Pressable
                            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.saveButtonText}>Save Configuration</Text>
                            )}
                        </Pressable>
                    </View>

                    <View style={styles.infoSection}>
                        <Ionicons name="information-circle-outline" size={24} color={colors.textSecondary} />
                        <Text style={styles.infoText}>
                            Current Base URL: {baseUrl || 'Not Set'}
                        </Text>
                    </View>



                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>What's New</Text>
                        <View style={styles.changelogCard}>
                            <View style={styles.changelogItem}>
                                <View style={styles.changelogDot} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.changelogTitle}>Episode Downloads</Text>
                                    <Text style={styles.changelogDescription}>
                                        Download episodes directly to your device. Each episode now has a dedicated download button in the episode list and on the watch screen.
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.changelogItem}>
                                <View style={styles.changelogDot} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.changelogTitle}>Download Fix</Text>
                                    <Text style={styles.changelogDescription}>
                                        Fixed an issue where downloads would fail with an invalid URL error. The download link extraction has been updated to match the current site structure.
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.changelogItem}>
                                <View style={styles.changelogDot} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.changelogTitle}>Redesigned Episode List</Text>
                                    <Text style={styles.changelogDescription}>
                                        Episodes are now displayed in a cleaner list layout with play and download buttons, progress bars, and watch status indicators.
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.versionFooter}>
                    <Pressable onPress={handleVersionTap}>
                        <Text style={styles.versionText}>App Version: {Constants.expoConfig?.version || 'Unknown'}</Text>
                    </Pressable>
                    {Updates.updateId && (
                        <Text style={styles.updateIdText}>Update ID: {Updates.updateId.slice(0, 8)}</Text>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        color: colors.text,
        fontSize: typography.fontSize.xxxl,
        fontWeight: '800',
        marginTop: spacing.md,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        marginBottom: spacing.sm,
    },
    sectionDescription: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.md,
        height: 50,
        marginBottom: spacing.lg,
    },
    input: {
        flex: 1,
        color: colors.text,
        fontSize: typography.fontSize.md,
        paddingVertical: spacing.sm,
    },
    clearButton: {
        padding: spacing.xs,
    },
    saveButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: typography.fontSize.md,
        fontWeight: '700',
    },
    messageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.lg,
    },
    errorBox: {
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
    },
    successBox: {
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
    },
    messageText: {
        marginLeft: spacing.sm,
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
    },
    infoSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 'auto',
        marginBottom: spacing.xl
    },
    infoText: {
        color: colors.textSecondary,
        marginLeft: spacing.sm,
        fontSize: typography.fontSize.sm
    },
    scrollContent: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: spacing.xxl,
    },
    changelogCard: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.md,
    },
    changelogItem: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    changelogDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
        marginTop: 6,
    },
    changelogTitle: {
        color: colors.text,
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        marginBottom: 2,
    },
    changelogDescription: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.xs,
        lineHeight: 16,
    },
    versionFooter: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        marginTop: spacing.xl,
    },
    versionText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
    },
    updateIdText: {
        color: colors.textTertiary,
        fontSize: 10,
        marginTop: 4,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    rewardedAdButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    rewardedAdButtonDisabled: {
        opacity: 0.5,
    },
    rewardedAdButtonText: {
        color: '#FFFFFF',
        fontSize: typography.fontSize.md,
        fontWeight: '700',
    },
    rewardedAdButtonSubtext: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: typography.fontSize.xs,
        marginTop: 2,
    },
    adFreeCard: {
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#4CAF50',
    },
    adFreeTitle: {
        color: colors.text,
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        marginTop: spacing.md,
    },
    adFreeTime: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        marginTop: spacing.xs,
    },
    checkAdButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        marginTop: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: 'transparent',
    },
    checkAdButtonText: {
        color: colors.primary,
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
    },
    restoreAdsButton: {
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    restoreAdsText: {
        color: colors.textTertiary,
        fontSize: typography.fontSize.xs,
        textDecorationLine: 'underline',
    },
    providerToggleContainer: {
        flexDirection: 'row',
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.lg,
        padding: 4,
        marginBottom: spacing.lg,
    },
    providerTab: {
        flex: 1,
        paddingVertical: spacing.md,
        alignItems: 'center',
        borderRadius: borderRadius.md,
    },
    providerTabActive: {
        backgroundColor: colors.primary,
    },
    providerTabText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
    },
    providerTabTextActive: {
        color: '#FFFFFF',
    },
});
