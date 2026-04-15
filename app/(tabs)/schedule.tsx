import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../api/client';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { SetupRequired } from '../../components/SetupRequired';
import { useUser } from '../../context/UserContext';
import { borderRadius, colors, spacing, typography } from '../../theme';
import type { ScheduleItem, ScheduleResponse } from '../../types';

type CategoryType = 'released' | 'upcoming' | 'finished';

const CATEGORIES: { id: CategoryType; label: string }[] = [
    { id: 'released', label: 'Released' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'finished', label: 'Finished' },
];

export default function ScheduleScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { baseUrl, isValidConnection } = useUser();
    const client = apiClient;

    const [scheduleData, setScheduleData] = useState<ScheduleResponse | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<CategoryType>('released');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSchedule = useCallback(async () => {
        try {
            setLoading(true);
            const response = await client.getSchedule();
            setScheduleData(response);
        } catch (err) {
            console.error('Failed to fetch schedule:', err);
            setScheduleData(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [client]);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchSchedule();
    };

    const handleAnimePress = (id: string) => {
        router.push(`/anime/${id}`);
    };

    const currentData = scheduleData ? scheduleData[selectedCategory] || [] : [];

    const renderScheduleItem = ({ item }: { item: ScheduleItem }) => (
        <Pressable
            style={({ pressed }) => [styles.scheduleCard, pressed && styles.pressed]}
            onPress={() => handleAnimePress(item.id)}
        >
            <Image
                source={{ uri: item.poster }}
                style={styles.poster}
                resizeMode="cover"
            />
            <View style={styles.scheduleContent}>
                <Text style={styles.animeTitle} numberOfLines={2}>
                    {item.title}
                </Text>
                {item.alternativeTitle && (
                    <Text style={styles.alternativeTitle} numberOfLines={1}>
                        {item.alternativeTitle}
                    </Text>
                )}
                
                <View style={styles.metaContainer}>
                    {item.latestEpisode !== null && item.latestEpisode !== undefined && (
                        <View style={styles.episodeContainer}>
                            <Text style={styles.episodeText}>Episode {item.latestEpisode}</Text>
                        </View>
                    )}
                    {item.status && (
                        <View style={styles.timeContainer}>
                            <Ionicons name="time-outline" size={14} color={colors.primary} />
                            <Text style={styles.timeText}>{item.status}</Text>
                        </View>
                    )}
                </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </Pressable>
    );

    if (!baseUrl || !isValidConnection) {
        return <SetupRequired reason={!baseUrl ? 'missing_config' : 'connection_failed'} currentUrl={baseUrl} />;
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Schedule</Text>
                <Text style={styles.headerSubtitle}>
                    Currently Airing & Upcoming
                </Text>
            </View>

            {/* Category Selector */}
            <View style={styles.categoryContainer}>
                {CATEGORIES.map((cat) => (
                    <Pressable
                        key={cat.id}
                        style={[
                            styles.categoryTab,
                            selectedCategory === cat.id && styles.categoryTabActive,
                        ]}
                        onPress={() => setSelectedCategory(cat.id)}
                    >
                        <Text style={[
                            styles.categoryText,
                            selectedCategory === cat.id && styles.categoryTextActive,
                        ]}>
                            {cat.label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Schedule List */}
            {loading ? (
                <LoadingSpinner fullScreen />
            ) : currentData.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={64} color={colors.textTertiary} />
                    <Text style={styles.emptyText}>No anime found for this category</Text>
                </View>
            ) : (
                <FlatList
                    data={currentData}
                    renderItem={renderScheduleItem}
                    keyExtractor={(item, index) => item.id || `fallback-${index}`}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: insets.bottom + 100 },
                    ]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    headerTitle: {
        color: colors.text,
        fontSize: typography.fontSize.xxxl,
        fontWeight: '800',
    },
    headerSubtitle: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.md,
        marginTop: spacing.xs,
    },
    categoryContainer: {
        flexDirection: 'row',
        marginHorizontal: spacing.lg,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.lg,
        padding: 4,
        marginVertical: spacing.md,
    },
    categoryTab: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        borderRadius: borderRadius.md,
    },
    categoryTabActive: {
        backgroundColor: colors.primary,
    },
    categoryText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
    },
    categoryTextActive: {
        color: '#FFFFFF',
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xs,
    },
    scheduleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    pressed: {
        opacity: 0.8,
    },
    poster: {
        width: 60,
        height: 80,
        borderRadius: borderRadius.sm,
        marginRight: spacing.md,
        backgroundColor: colors.backgroundTertiary,
    },
    scheduleContent: {
        flex: 1,
        justifyContent: 'center',
    },
    animeTitle: {
        color: colors.text,
        fontSize: typography.fontSize.md,
        fontWeight: '600',
        lineHeight: 20,
    },
    alternativeTitle: {
        color: colors.textTertiary,
        fontSize: typography.fontSize.sm,
        marginTop: 2,
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
        flexWrap: 'wrap',
    },
    episodeContainer: {
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        marginRight: spacing.sm,
    },
    episodeText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.xs,
        fontWeight: '500',
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeText: {
        color: colors.primary,
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        marginLeft: 4,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxxl,
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.md,
        marginTop: spacing.lg,
        textAlign: 'center',
    },
});
