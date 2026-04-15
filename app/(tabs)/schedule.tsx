import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
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
import type { ScheduleItem } from '../../types';

// Generate dates for the date picker
const generateDates = () => {
    const dates = [];
    const today = new Date();

    for (let i = -3; i <= 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push({
            date: date.getDate(),
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            fullDate: date,
            isToday: i === 0,
        });
    }
    return dates;
};

export default function ScheduleScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { baseUrl, isValidConnection} = useUser();
    const client = apiClient;
    const [dates] = useState(generateDates());
    const [selectedDate, setSelectedDate] = useState(dates.find(d => d.isToday)!);
    const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSchedule = useCallback(async (date: Date) => {
        try {
            setLoading(true);
            const dateStr = date.getDate().toString();
            const response = await client.getSchedule(dateStr);
            setScheduleData(response.response || []);
        } catch (err) {
            console.error('Failed to fetch schedule:', err);
            setScheduleData([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [client]);

    useEffect(() => {
        fetchSchedule(selectedDate.fullDate);
    }, [selectedDate, fetchSchedule]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchSchedule(selectedDate.fullDate);
    };

    const handleDatePress = (date: typeof dates[0]) => {
        setSelectedDate(date);
    };

    const handleAnimePress = (id: string) => {
        router.push(`/anime/${id}`);
    };

    const renderScheduleItem = ({ item }: { item: ScheduleItem }) => (
        <Pressable
            style={({ pressed }) => [styles.scheduleCard, pressed && styles.pressed]}
            onPress={() => handleAnimePress(item.id)}
        >
            <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={16} color={colors.primary} />
                <Text style={styles.timeText}>{item.time}</Text>
            </View>

            <View style={styles.scheduleContent}>
                <Text style={styles.animeTitle} numberOfLines={2}>
                    {item.title}
                </Text>
                {item.alternativeTitle && (
                    <Text style={styles.alternativeTitle} numberOfLines={1}>
                        {item.alternativeTitle}
                    </Text>
                )}
                <View style={styles.episodeContainer}>
                    <Text style={styles.episodeText}>Episode {item.episode}</Text>
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
                    {selectedDate.fullDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                    })}
                </Text>
            </View>

            {/* Date Picker */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.datePickerContent}
                style={styles.datePicker}
            >
                {dates.map((date, index) => (
                    <Pressable
                        key={index}
                        style={[
                            styles.dateCard,
                            selectedDate === date && styles.dateCardSelected,
                        ]}
                        onPress={() => handleDatePress(date)}
                    >
                        <Text style={[
                            styles.dateDay,
                            selectedDate === date && styles.dateTextSelected,
                        ]}>
                            {date.day}
                        </Text>
                        <Text style={[
                            styles.dateNumber,
                            selectedDate === date && styles.dateTextSelected,
                        ]}>
                            {date.date}
                        </Text>
                        {date.isToday && (
                            <View style={styles.todayIndicator} />
                        )}
                    </Pressable>
                ))}
            </ScrollView>

            {/* Schedule List */}
            {loading ? (
                <LoadingSpinner fullScreen />
            ) : scheduleData.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={64} color={colors.textTertiary} />
                    <Text style={styles.emptyText}>No anime scheduled for this day</Text>
                </View>
            ) : (
                <FlatList
                    data={scheduleData}
                    renderItem={renderScheduleItem}
                    keyExtractor={(item) => item.id}
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
    datePicker: {
        maxHeight: 100,
    },
    datePickerContent: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    dateCard: {
        width: 60,
        height: 70,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    dateCardSelected: {
        backgroundColor: colors.primary,
    },
    dateDay: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    dateNumber: {
        color: colors.text,
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        marginTop: 2,
    },
    dateTextSelected: {
        color: colors.text,
    },
    todayIndicator: {
        position: 'absolute',
        bottom: 8,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.accent,
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    scheduleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    pressed: {
        opacity: 0.8,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        marginRight: spacing.md,
    },
    timeText: {
        color: colors.primary,
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        marginLeft: spacing.xs,
    },
    scheduleContent: {
        flex: 1,
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
    episodeContainer: {
        marginTop: spacing.sm,
    },
    episodeText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
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
