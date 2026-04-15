import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../api/client';
import { AnimeCardGrid, AnimeCardHorizontal } from '../../components/AnimeCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { colors, spacing, typography } from '../../theme';
import type { AnimeBasic } from '../../types';
import { useUser } from '../../context/UserContext';

export default function GenreScreen() {
    const { genre } = useLocalSearchParams<{ genre: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    const client = apiClient;

    const [results, setResults] = useState<AnimeBasic[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);

    const fetchResults = useCallback(async (pageNum: number = 1) => {
        if (!genre) return;

        try {
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            const response = await client.getGenre(genre, pageNum);

            if (response) {
                if (pageNum === 1) {
                    setResults(response.response || []);
                } else {
                    setResults((prev) => [...prev, ...(response.response || [])]);
                }
                setHasNextPage(response.pageInfo?.hasNextPage || false);
                setPage(pageNum);
            }
        } catch (err) {
            console.error('Failed to fetch genre results:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [genre, client]);

    useEffect(() => {
        fetchResults(1);
    }, [fetchResults]);

    const handleLoadMore = () => {
        if (!loadingMore && hasNextPage) {
            fetchResults(page + 1);
        }
    };

    const handleBack = () => {
        router.back();
    };

    const formatGenreName = (name: string) => {
        return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
    };

    const renderItem = ({ item }: { item: AnimeBasic }) => (
        <AnimeCardGrid anime={item} columns={3} />
    );

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    };

    if (loading) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </Pressable>
                <View>
                    <Text style={styles.headerTitle}>
                        {genre ? formatGenreName(genre) : 'Genre'}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {results.length} anime found
                    </Text>
                </View>
            </View>

            {/* Results Grid */}
            {results.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="film-outline" size={64} color={colors.textTertiary} />
                    <Text style={styles.emptyText}>No anime found in this genre</Text>
                </View>
            ) : (
                <FlatList
                    data={results}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    numColumns={3}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: insets.bottom + 20 },
                    ]}
                    columnWrapperStyle={styles.gridRow}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                    showsVerticalScrollIndicator={false}
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
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
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
    },
    headerSubtitle: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        marginTop: 2,
    },
    listContent: {
        paddingHorizontal: spacing.lg,
    },
    gridRow: {
        justifyContent: 'flex-start',
    },
    footer: {
        padding: spacing.lg,
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.md,
        marginTop: spacing.lg,
    },
});
