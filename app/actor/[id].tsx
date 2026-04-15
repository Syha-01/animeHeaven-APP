import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../api/client';
import { useUser } from '../../context/UserContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';
import type { ActorDetails } from '../../types';

export default function ActorScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    const client = apiClient;

    const [actor, setActor] = useState<ActorDetails | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchActor = useCallback(async () => {
        if (!id) return;

        try {
            setLoading(true);
            const data = await client.getActor(id);
            setActor(data);
        } catch (err) {
            console.error('Failed to fetch actor:', err);
        } finally {
            setLoading(false);
        }
    }, [id, client]);

    useEffect(() => {
        fetchActor();
    }, [fetchActor]);

    const handleBack = () => {
        router.back();
    };

    if (loading) {
        return <LoadingSpinner fullScreen />;
    }

    if (!actor) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.errorContainer}>
                    <Ionicons name="person-outline" size={64} color={colors.textTertiary} />
                    <Text style={styles.errorText}>Voice actor not found</Text>
                    <Pressable style={styles.backBtn} onPress={handleBack}>
                        <Text style={styles.backBtnText}>Go Back</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Voice Actor</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Actor Profile */}
                <View style={styles.profile}>
                    <Image
                        source={{ uri: actor.imageUrl }}
                        style={styles.profileImage}
                        resizeMode="cover"
                    />

                    <Text style={styles.name}>{actor.name}</Text>

                    {actor.japanese && (
                        <Text style={styles.japaneseName}>{actor.japanese}</Text>
                    )}

                    {actor.type && (
                        <View style={styles.typeBadge}>
                            <Ionicons name="mic" size={14} color={colors.text} />
                            <Text style={styles.typeText}>{actor.type}</Text>
                        </View>
                    )}
                </View>

                {/* Bio */}
                {actor.bio && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Biography</Text>
                        <View style={styles.bioCard}>
                            <Text style={styles.bioText}>{actor.bio}</Text>
                        </View>
                    </View>
                )}

                {/* Voice Acting Roles */}
                {actor.voiceActingRoles && actor.voiceActingRoles.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            Voice Acting Roles ({actor.voiceActingRoles.length})
                        </Text>
                        <View style={styles.rolesList}>
                            {actor.voiceActingRoles.map((role, index) => (
                                <Pressable
                                    key={index}
                                    style={styles.roleCard}
                                    onPress={() => router.push(`/anime/${role.id}`)}
                                >
                                    <Image
                                        source={{ uri: role.poster }}
                                        style={styles.rolePoster}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.roleInfo}>
                                        <Text style={styles.roleTitle} numberOfLines={2}>
                                            {role.title}
                                        </Text>
                                        {role.typeAndYear && (
                                            <Text style={styles.roleType}>{role.typeAndYear}</Text>
                                        )}
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    backButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 22,
        marginRight: spacing.md,
    },
    headerTitle: {
        color: colors.text,
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
    },
    profile: {
        alignItems: 'center',
        padding: spacing.xl,
    },
    profileImage: {
        width: 180,
        height: 250,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.backgroundTertiary,
        ...shadows.lg,
    },
    name: {
        color: colors.text,
        fontSize: typography.fontSize.xxl,
        fontWeight: '800',
        marginTop: spacing.lg,
        textAlign: 'center',
    },
    japaneseName: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.md,
        marginTop: spacing.xs,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accent,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        marginTop: spacing.md,
    },
    typeText: {
        color: colors.text,
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    section: {
        padding: spacing.lg,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        marginBottom: spacing.md,
    },
    bioCard: {
        backgroundColor: colors.card,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
    },
    bioText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.md,
        lineHeight: 22,
    },
    rolesList: {
        gap: spacing.md,
    },
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    rolePoster: {
        width: 60,
        height: 85,
        borderRadius: borderRadius.md,
        backgroundColor: colors.backgroundTertiary,
    },
    roleInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    roleTitle: {
        color: colors.text,
        fontSize: typography.fontSize.md,
        fontWeight: '600',
        lineHeight: 20,
    },
    roleType: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        marginTop: 4,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxxl,
    },
    errorText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.md,
        marginTop: spacing.lg,
    },
    backBtn: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
    },
    backBtnText: {
        color: colors.text,
        fontWeight: '600',
    },
});
