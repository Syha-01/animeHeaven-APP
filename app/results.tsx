import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../api/client';
import { AnimeCardGrid, AnimeCardHorizontal } from '../components/AnimeCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useUser } from '../context/UserContext';
import { borderRadius, colors, spacing, typography } from '../theme';
import type { AnimeBasic, FilterParams, MetaData } from '../types';

export default function ResultsScreen() {
    const params = useLocalSearchParams<{
        keyword?: string;
        query?: string;
        letter?: string;
        filter?: string;
    }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    const client = apiClient;

    const [results, setResults] = useState<AnimeBasic[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showFilter, setShowFilter] = useState(params.filter === 'true');
    const [_meta, setMeta] = useState<MetaData | null>(null);

    // Filter state
    const [filters, setFilters] = useState<FilterParams>({
        type: 'all',
        status: 'all',
        rated: 'all',
        score: 'all',
        season: 'all',
        language: 'all',
        sort: 'default',
    });

    const getTitle = () => {
        if (params.keyword) return `Search: "${params.keyword}"`;
        if (params.query) {
            const formatted = params.query.replace(/-/g, ' ');
            return formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }
        if (params.letter) return `Browse: ${params.letter.toUpperCase()}`;
        return 'Browse Anime';
    };

    const fetchResults = useCallback(async (pageNum: number = 1, reset: boolean = false) => {
        try {
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            let response;

            if (params.keyword) {
                response = await client.search(params.keyword, pageNum);
            } else if (params.letter) {
                response = await client.getAZList(params.letter, pageNum);
            } else if (params.query) {
                response = await client.getQuery(params.query, pageNum);
            } else {
                // Filter mode
                response = await client.filter({ ...filters, page: pageNum });
            }

            if (response) {
                if (reset || pageNum === 1) {
                    setResults(response.response || []);
                } else {
                    setResults((prev) => [...prev, ...(response.response || [])]);
                }
                setHasNextPage(response.pageInfo?.hasNextPage || false);
                setPage(pageNum);
            }
        } catch (err) {
            console.error('Failed to fetch results:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [params.keyword, params.letter, params.query, filters, client]);

    useEffect(() => {
        fetchResults(1, true);
    }, [fetchResults]);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const metaData = await client.getMeta();
                setMeta(metaData);
            } catch (err) {
                console.error('Failed to fetch meta:', err);
            }
        };
        fetchMeta();
    }, [client]);

    const handleLoadMore = () => {
        if (!loadingMore && hasNextPage) {
            fetchResults(page + 1);
        }
    };

    const handleBack = () => {
        router.back();
    };

    const applyFilters = () => {
        setShowFilter(false);
        fetchResults(1, true);
    };

    const resetFilters = () => {
        setFilters({
            type: 'all',
            status: 'all',
            rated: 'all',
            score: 'all',
            season: 'all',
            language: 'all',
            sort: 'default',
        });
    };

    const renderItem = ({ item }: { item: AnimeBasic }) => {
        if (viewMode === 'list') {
            return <AnimeCardHorizontal anime={item} />;
        }
        return <AnimeCardGrid anime={item} columns={3} />;
    };

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
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {getTitle()}
                </Text>
                <View style={styles.headerActions}>
                    <Pressable
                        style={styles.actionButton}
                        onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    >
                        <Ionicons
                            name={viewMode === 'grid' ? 'list' : 'grid'}
                            size={22}
                            color={colors.text}
                        />
                    </Pressable>
                    <Pressable
                        style={styles.actionButton}
                        onPress={() => setShowFilter(true)}
                    >
                        <Ionicons name="options-outline" size={22} color={colors.text} />
                    </Pressable>
                </View>
            </View>

            {/* Results Count */}
            <View style={styles.resultInfo}>
                <Text style={styles.resultCount}>
                    {results.length} result{results.length !== 1 ? 's' : ''}
                </Text>
            </View>

            {/* Results List */}
            {results.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={64} color={colors.textTertiary} />
                    <Text style={styles.emptyText}>No results found</Text>
                </View>
            ) : (
                <FlatList
                    data={results}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    numColumns={viewMode === 'grid' ? 3 : 1}
                    key={viewMode}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: insets.bottom + 20 },
                    ]}
                    columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Filter Modal */}
            <Modal
                visible={showFilter}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFilter(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filters</Text>
                            <Pressable onPress={() => setShowFilter(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.filterScroll}>
                            {/* Type Filter */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterLabel}>Type</Text>
                                <View style={styles.filterOptions}>
                                    {['all', 'movie', 'tv', 'ova', 'special'].map((option) => (
                                        <Pressable
                                            key={option}
                                            style={[
                                                styles.filterOption,
                                                filters.type === option && styles.filterOptionActive,
                                            ]}
                                            onPress={() => setFilters({ ...filters, type: option })}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterOptionText,
                                                    filters.type === option && styles.filterOptionTextActive,
                                                ]}
                                            >
                                                {option.toUpperCase()}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            {/* Status Filter */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterLabel}>Status</Text>
                                <View style={styles.filterOptions}>
                                    {['all', 'finished_airing', 'currently_airing', 'not_yet_aired'].map((option) => (
                                        <Pressable
                                            key={option}
                                            style={[
                                                styles.filterOption,
                                                filters.status === option && styles.filterOptionActive,
                                            ]}
                                            onPress={() => setFilters({ ...filters, status: option })}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterOptionText,
                                                    filters.status === option && styles.filterOptionTextActive,
                                                ]}
                                            >
                                                {option.replace(/_/g, ' ').toUpperCase()}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            {/* Language Filter */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterLabel}>Language</Text>
                                <View style={styles.filterOptions}>
                                    {['all', 'sub', 'dub', 'sub_dub'].map((option) => (
                                        <Pressable
                                            key={option}
                                            style={[
                                                styles.filterOption,
                                                filters.language === option && styles.filterOptionActive,
                                            ]}
                                            onPress={() => setFilters({ ...filters, language: option })}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterOptionText,
                                                    filters.language === option && styles.filterOptionTextActive,
                                                ]}
                                            >
                                                {option.replace(/_/g, ' & ').toUpperCase()}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            {/* Sort Filter */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterLabel}>Sort By</Text>
                                <View style={styles.filterOptions}>
                                    {['default', 'recently_added', 'score', 'name_az'].map((option) => (
                                        <Pressable
                                            key={option}
                                            style={[
                                                styles.filterOption,
                                                filters.sort === option && styles.filterOptionActive,
                                            ]}
                                            onPress={() => setFilters({ ...filters, sort: option })}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterOptionText,
                                                    filters.sort === option && styles.filterOptionTextActive,
                                                ]}
                                            >
                                                {option.replace(/_/g, ' ').toUpperCase()}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.filterActions}>
                            <Pressable style={styles.resetButton} onPress={resetFilters}>
                                <Text style={styles.resetButtonText}>Reset</Text>
                            </Pressable>
                            <Pressable style={styles.applyButton} onPress={applyFilters}>
                                <Text style={styles.applyButtonText}>Apply Filters</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
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
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        color: colors.text,
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        marginLeft: spacing.sm,
    },
    headerActions: {
        flexDirection: 'row',
    },
    actionButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultInfo: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
    },
    resultCount: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
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
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.backgroundSecondary,
        borderTopLeftRadius: borderRadius.xxl,
        borderTopRightRadius: borderRadius.xxl,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        color: colors.text,
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
    },
    filterScroll: {
        padding: spacing.lg,
    },
    filterSection: {
        marginBottom: spacing.xl,
    },
    filterLabel: {
        color: colors.text,
        fontSize: typography.fontSize.md,
        fontWeight: '600',
        marginBottom: spacing.sm,
    },
    filterOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    filterOption: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.backgroundTertiary,
        borderRadius: borderRadius.full,
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterOptionActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterOptionText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
    },
    filterOptionTextActive: {
        color: colors.text,
    },
    filterActions: {
        flexDirection: 'row',
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    resetButton: {
        flex: 1,
        paddingVertical: spacing.md,
        backgroundColor: colors.backgroundTertiary,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    resetButtonText: {
        color: colors.textSecondary,
        fontWeight: '600',
    },
    applyButton: {
        flex: 2,
        paddingVertical: spacing.md,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    applyButtonText: {
        color: colors.text,
        fontWeight: '700',
    },
});
