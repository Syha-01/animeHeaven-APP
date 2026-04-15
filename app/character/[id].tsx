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
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useUser } from '../../context/UserContext';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';
import type { CharacterDetails } from '../../types';

export default function CharacterScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    const client = apiClient;

    const [character, setCharacter] = useState<CharacterDetails | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchCharacter = useCallback(async () => {
        if (!id) return;

        try {
            setLoading(true);
            const data = await client.getCharacter(id);
            setCharacter(data);
        } catch (err) {
            console.error('Failed to fetch character:', err);
        } finally {
            setLoading(false);
        }
    }, [id, client]);

    useEffect(() => {
        fetchCharacter();
    }, [fetchCharacter]);

    const handleBack = () => {
        router.back();
    };

    if (loading) {
        return <LoadingSpinner fullScreen />;
    }

    if (!character) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.errorContainer}>
                    <Ionicons name="person-outline" size={64} color={colors.textTertiary} />
                    <Text style={styles.errorText}>Character not found</Text>
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
                <Text style={styles.headerTitle}>Character</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Character Profile */}
                <View style={styles.profile}>
                    <Image
                        source={{ uri: character.imageUrl }}
                        style={styles.profileImage}
                        resizeMode="cover"
                    />

                    <Text style={styles.name}>{character.name}</Text>

                    {character.japanese && (
                        <Text style={styles.japaneseName}>{character.japanese}</Text>
                    )}

                    {character.type && (
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeText}>{character.type}</Text>
                        </View>
                    )}
                </View>

                {/* Bio */}
                {character.bio && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About</Text>
                        <View style={styles.bioCard}>
                            <Text style={styles.bioText}>{character.bio}</Text>
                        </View>
                    </View>
                )}

                {/* Anime Appearances */}
                {character.animeApearances && character.animeApearances.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Anime Appearances</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.animeList}
                        >
                            {character.animeApearances.map((anime, index) => (
                                <Pressable
                                    key={index}
                                    style={styles.animeCard}
                                    onPress={() => router.push(`/anime/${anime.id}`)}
                                >
                                    <Image
                                        source={{ uri: anime.poster }}
                                        style={styles.animePoster}
                                        resizeMode="cover"
                                    />
                                    <Text style={styles.animeTitle} numberOfLines={2}>
                                        {anime.title}
                                    </Text>
                                    <Text style={styles.animeRole}>{anime.role}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
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
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        marginTop: spacing.md,
    },
    typeText: {
        color: colors.text,
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
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
    animeList: {
        paddingRight: spacing.lg,
    },
    animeCard: {
        width: 120,
        marginRight: spacing.md,
    },
    animePoster: {
        width: 120,
        height: 170,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.backgroundTertiary,
    },
    animeTitle: {
        color: colors.text,
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        marginTop: spacing.sm,
        lineHeight: 18,
    },
    animeRole: {
        color: colors.textTertiary,
        fontSize: typography.fontSize.xs,
        marginTop: 2,
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
