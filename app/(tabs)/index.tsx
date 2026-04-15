import React, { useCallback, useEffect, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { apiClient } from '../../api/client';
import { AnimeSection, TopTenSection } from '../../components/AnimeSection';
import { LoadingSpinner, SpotlightSkeleton } from '../../components/LoadingSpinner';
import { SetupRequired } from '../../components/SetupRequired';
import { SpotlightCarousel } from '../../components/SpotlightCarousel';
import { useUser } from '../../context/UserContext';
import { colors } from '../../theme';
import type { AnimeBasic, HomeData } from '../../types';

interface ScheduleData {
    released: AnimeBasic[];
    upcoming: AnimeBasic[];
    finished: AnimeBasic[];
}

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const { baseUrl, isValidConnection} = useUser();
    const [homeData, setHomeData] = useState<HomeData | null>(null);
    const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchHomeData = useCallback(async () => {
        try {
            setError(null);
            const [homeResult, scheduleResult] = await Promise.all([
                apiClient.getHome(),
                apiClient.getSchedule().catch(() => null),
            ]);
            setHomeData(homeResult);
            if (scheduleResult && (scheduleResult as any).released) {
                setScheduleData(scheduleResult as any);
            }
        } catch (err) {
            console.error('Failed to fetch home data:', err);
            setError('Failed to load content. Please check your connection.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (baseUrl) {
            fetchHomeData();
        }
    }, [fetchHomeData, baseUrl]);


    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchHomeData();
    }, [fetchHomeData]);

    if (!baseUrl || !isValidConnection) {
        return <SetupRequired reason={!baseUrl ? 'missing_config' : 'connection_failed'} currentUrl={baseUrl} />;
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <SpotlightSkeleton />
                <AnimeSection title="Trending Now" items={[]} loading={true} />
                <AnimeSection title="Episode Released" items={[]} loading={true} />
            </View>
        );
    }

    if (error || !homeData) {
        return (
            <View style={styles.errorContainer}>
                <LoadingSpinner fullScreen />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 100 },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >
                {/* Spotlight Carousel */}
                {homeData.spotlight && homeData.spotlight.length > 0 && (
                    <SpotlightCarousel items={homeData.spotlight} />
                )}

                {/* Trending */}
                <AnimeSection
                    title="Trending Now"
                    icon="flame"
                    items={homeData.trending}
                    showRank={true}
                    seeAllRoute="/results?query=trending"
                />

                {/* Episode Released (from schedule) */}
                {scheduleData?.released && scheduleData.released.length > 0 && (
                    <AnimeSection
                        title="Episode Released"
                        icon="play-circle"
                        items={scheduleData.released}
                    />
                )}

                {/* Upcoming (from schedule) */}
                {scheduleData?.upcoming && scheduleData.upcoming.length > 0 && (
                    <AnimeSection
                        title="Upcoming"
                        icon="time-outline"
                        items={scheduleData.upcoming}
                    />
                )}

                {/* Finished Airing (from schedule) */}
                {scheduleData?.finished && scheduleData.finished.length > 0 && (
                    <AnimeSection
                        title="Finished Airing"
                        icon="checkmark-circle"
                        items={scheduleData.finished}
                    />
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    errorContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
});
