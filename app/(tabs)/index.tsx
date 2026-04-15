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
import type { HomeData } from '../../types';

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const { baseUrl, isValidConnection} = useUser();
    const [homeData, setHomeData] = useState<HomeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchHomeData = useCallback(async () => {
        try {
            setError(null);
            const data = await apiClient.getHome();
            setHomeData(data);
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
                <AnimeSection title="Top Airing" items={[]} loading={true} />
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

                {/* Top Airing */}
                <AnimeSection
                    title="Top Airing"
                    icon="tv-outline"
                    items={homeData.topAiring}
                    seeAllRoute="/results?query=top-airing"
                />

                {/* Top 10 */}
                {homeData.topTen && (
                    <TopTenSection
                        today={homeData.topTen.today || []}
                        week={homeData.topTen.week || []}
                        month={homeData.topTen.month || []}
                    />
                )}

                {/* Most Popular */}
                <AnimeSection
                    title="Most Popular"
                    icon="star"
                    items={homeData.mostPopular}
                    seeAllRoute="/results?query=most-popular"
                />

                {/* Latest Episodes */}
                <AnimeSection
                    title="Latest Episodes"
                    icon="play-circle"
                    items={homeData.latestEpisode}
                    cardSize="sm"
                />

                {/* Most Favorite */}
                <AnimeSection
                    title="Most Favorite"
                    icon="heart"
                    items={homeData.mostFavorite}
                    seeAllRoute="/results?query=most-favorite"
                />

                {/* New Added */}
                <AnimeSection
                    title="New Additions"
                    icon="sparkles"
                    items={homeData.newAdded}
                    cardSize="sm"
                />

                {/* Latest Completed */}
                <AnimeSection
                    title="Recently Completed"
                    icon="checkmark-circle"
                    items={homeData.latestCompleted}
                    seeAllRoute="/results?query=completed"
                />

                {/* Top Upcoming */}
                <AnimeSection
                    title="Coming Soon"
                    icon="calendar"
                    items={homeData.topUpcoming}
                />
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
