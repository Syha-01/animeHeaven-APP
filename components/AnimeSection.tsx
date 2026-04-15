import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { colors, spacing, typography } from '../theme';
import type { AnimeBasic } from '../types';
import { AnimeCard } from './AnimeCard';
import { AnimeCardSkeleton } from './LoadingSpinner';

interface AnimeSectionProps {
    title: string;
    items: AnimeBasic[];
    showRank?: boolean;
    seeAllRoute?: string;
    loading?: boolean;
    cardSize?: 'sm' | 'md' | 'lg';
    icon?: keyof typeof Ionicons.glyphMap;
}

export function AnimeSection({
    title,
    items,
    showRank = false,
    seeAllRoute,
    loading = false,
    cardSize = 'md',
    icon,
}: AnimeSectionProps) {
    const router = useRouter();

    const handleSeeAll = () => {
        if (seeAllRoute) {
            router.push(seeAllRoute as any);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {icon && <Ionicons name={icon} size={20} color={colors.primary} />}
                        <Text style={styles.title}>{title}</Text>
                    </View>
                </View>
                <FlatList
                    horizontal
                    data={[1, 2, 3, 4, 5]}
                    renderItem={() => <AnimeCardSkeleton />}
                    keyExtractor={(item) => item.toString()}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                />
            </View>
        );
    }

    if (!items || items.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {icon && <Ionicons name={icon} size={20} color={colors.primary} />}
                    <Text style={styles.title}>{title}</Text>
                </View>
                {seeAllRoute && (
                    <Pressable style={styles.seeAllButton} onPress={handleSeeAll}>
                        <Text style={styles.seeAllText}>See All</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </Pressable>
                )}
            </View>

            <FlatList
                horizontal
                data={items}
                renderItem={({ item, index }) => (
                    <AnimeCard
                        anime={showRank ? { ...item, rank: index + 1 } : item}
                        showRank={showRank}
                        size={cardSize}
                    />
                )}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

// Top 10 Section with tabs
interface TopTenSectionProps {
    today: AnimeBasic[];
    week: AnimeBasic[];
    month: AnimeBasic[];
    loading?: boolean;
}

export function TopTenSection({ today, week, month, loading = false }: TopTenSectionProps) {
    const [activeTab, setActiveTab] = React.useState<'today' | 'week' | 'month'>('today');

    const tabs = [
        { key: 'today' as const, label: 'Today' },
        { key: 'week' as const, label: 'Week' },
        { key: 'month' as const, label: 'Month' },
    ];

    const data = { today, week, month };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="flame" size={20} color={colors.primary} />
                    <Text style={styles.title}>Top 10</Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                {tabs.map((tab) => (
                    <Pressable
                        key={tab.key}
                        style={[
                            styles.tab,
                            activeTab === tab.key && styles.tabActive,
                        ]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Text style={[
                            styles.tabText,
                            activeTab === tab.key && styles.tabTextActive,
                        ]}>
                            {tab.label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {loading ? (
                <FlatList
                    horizontal
                    data={[1, 2, 3, 4, 5]}
                    renderItem={() => <AnimeCardSkeleton />}
                    keyExtractor={(item) => item.toString()}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                />
            ) : (
                <FlatList
                    horizontal
                    data={data[activeTab]}
                    renderItem={({ item, index }) => (
                        <AnimeCard
                            anime={{ ...item, rank: index + 1 }}
                            showRank={true}
                            size="lg"
                        />
                    )}
                    keyExtractor={(item, index) => `${activeTab}-${item.id}-${index}`}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: spacing.xl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    title: {
        color: colors.text,
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
    },
    seeAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    seeAllText: {
        color: colors.primary,
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        marginRight: 2,
    },
    listContent: {
        paddingHorizontal: spacing.lg,
    },
    // Tabs
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    tab: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        backgroundColor: colors.backgroundTertiary,
        marginRight: spacing.sm,
    },
    tabActive: {
        backgroundColor: colors.primary,
    },
    tabText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
    },
    tabTextActive: {
        color: colors.text,
    },
});

export default AnimeSection;
