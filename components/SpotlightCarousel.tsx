import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { APP_CONFIG } from '../config';
import { borderRadius, colors, spacing, typography } from '../theme';
import type { SpotlightAnime } from '../types';
import { Badge, EpisodeBadges } from './Badge';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPOTLIGHT_HEIGHT = SCREEN_HEIGHT * 0.55;

interface SpotlightCarouselProps {
    items: SpotlightAnime[];
}

export function SpotlightCarousel({ items }: SpotlightCarouselProps) {
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    // Auto-scroll effect
    useEffect(() => {
        if (items.length <= 1) return;

        autoScrollTimer.current = setInterval(() => {
            const nextIndex = (activeIndex + 1) % items.length;
            flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
            setActiveIndex(nextIndex);
        }, APP_CONFIG.spotlightAutoScrollInterval);

        return () => {
            if (autoScrollTimer.current) {
                clearInterval(autoScrollTimer.current);
            }
        };
    }, [activeIndex, items.length]);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / SCREEN_WIDTH);
        if (index !== activeIndex && index >= 0 && index < items.length) {
            setActiveIndex(index);
        }
    };

    const handlePress = (id: string) => {
        router.push(`/anime/${id}`);
    };

    const handleWatchPress = (id: string) => {
        router.push(`/anime/${id}`);
    };

    const renderItem = ({ item }: { item: SpotlightAnime }) => (
        <Pressable
            style={styles.slide}
            onPress={() => handlePress(item.id)}
        >
            <Image
                source={{ uri: item.poster }}
                style={styles.backgroundImage}
                resizeMode="cover"
                blurRadius={2}
            />

            {/* Dark gradient overlay */}
            <LinearGradient
                colors={['transparent', 'rgba(15,15,26,0.6)', 'rgba(15,15,26,0.95)', colors.background]}
                locations={[0, 0.4, 0.7, 1]}
                style={styles.gradient}
            />

            {/* Content */}
            <View style={styles.content}>
                {/* Rank badge */}
                {item.rank && (
                    <View style={styles.rankContainer}>
                        <Text style={styles.rankLabel}>#{item.rank}</Text>
                        <Text style={styles.spotlightLabel}>Spotlight</Text>
                    </View>
                )}

                {/* Title */}
                <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                </Text>

                {/* Meta info */}
                <View style={styles.metaRow}>
                    {item.quality && <Badge variant="quality" value={item.quality} size="md" />}
                    {item.type && <Badge variant="type" value={item.type} size="md" />}
                    {item.duration && (
                        <Text style={styles.duration}>{item.duration}</Text>
                    )}
                </View>

                {/* Episodes */}
                {item.episodes && (
                    <View style={styles.episodesRow}>
                        <EpisodeBadges
                            sub={item.episodes.sub}
                            dub={item.episodes.dub}
                            size="md"
                        />
                    </View>
                )}

                {/* Synopsis */}
                <Text style={styles.synopsis} numberOfLines={3}>
                    {item.synopsis}
                </Text>

                {/* Buttons */}
                <View style={styles.buttonRow}>
                    <Pressable
                        style={styles.watchButton}
                        onPress={() => handleWatchPress(item.id)}
                    >
                        <Ionicons name="play" size={20} color={colors.text} />
                        <Text style={styles.watchButtonText}>Watch Now</Text>
                    </Pressable>

                    <Pressable style={styles.infoButton}>
                        <Ionicons name="information-circle-outline" size={24} color={colors.text} />
                    </Pressable>
                </View>
            </View>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                getItemLayout={(_, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                })}
            />

            {/* Pagination dots */}
            <View style={styles.pagination}>
                {items.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            index === activeIndex && styles.dotActive,
                        ]}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: SPOTLIGHT_HEIGHT,
    },
    slide: {
        width: SCREEN_WIDTH,
        height: SPOTLIGHT_HEIGHT,
    },
    backgroundImage: {
        ...StyleSheet.absoluteFillObject,
        width: SCREEN_WIDTH,
        height: SPOTLIGHT_HEIGHT,
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.lg,
        paddingBottom: spacing.xxxl + 20, // Extra space for pagination dots
    },
    rankContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    rankLabel: {
        color: colors.primary,
        fontSize: typography.fontSize.lg,
        fontWeight: '800',
        marginRight: spacing.sm,
    },
    spotlightLabel: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    title: {
        color: colors.text,
        fontSize: typography.fontSize.xxxl,
        fontWeight: '800',
        lineHeight: 34,
        marginBottom: spacing.md,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    duration: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        marginLeft: spacing.sm,
    },
    episodesRow: {
        marginBottom: spacing.md,
    },
    synopsis: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.md,
        lineHeight: 20,
        marginBottom: spacing.lg,
    },
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    watchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
        marginRight: spacing.md,
    },
    watchButtonText: {
        color: colors.text,
        fontSize: typography.fontSize.md,
        fontWeight: '700',
        marginLeft: spacing.sm,
    },
    infoButton: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.full,
        backgroundColor: colors.overlay,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    pagination: {
        position: 'absolute',
        bottom: spacing.md, // Moved up to avoid overlap
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.textTertiary,
        marginHorizontal: 4,
    },
    dotActive: {
        width: 24,
        backgroundColor: colors.primary,
    },
});

export default SpotlightCarousel;
