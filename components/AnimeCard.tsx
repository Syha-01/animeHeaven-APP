import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { borderRadius, colors, shadows, spacing } from '../theme';
import type { AnimeBasic } from '../types';
import { EpisodeBadges, RankBadge } from './Badge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AnimeCardProps {
    anime: AnimeBasic;
    showRank?: boolean;
    size?: 'sm' | 'md' | 'lg';
    style?: object;
}

const CARD_SIZES = {
    sm: { width: 110, height: 160 },
    md: { width: 140, height: 200 },
    lg: { width: 160, height: 230 },
};

export function AnimeCard({ anime, showRank = false, size = 'md', style }: AnimeCardProps) {
    const router = useRouter();
    const { width, height } = CARD_SIZES[size];

    const handlePress = () => {
        router.push(`/anime/${anime.id}`);
    };

    return (
        <Pressable
            style={({ pressed }) => [
                styles.container,
                { width },
                pressed && styles.pressed,
                style,
            ]}
            onPress={handlePress}
        >
            <View style={[styles.imageContainer, { width, height }]}>
                {showRank && anime.rank && <RankBadge rank={anime.rank} />}

                <Image
                    source={{ uri: anime.poster }}
                    style={styles.image}
                    resizeMode="cover"
                />

                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.gradient}
                />

                {anime.type && (
                    <View style={styles.typeContainer}>
                        <Text style={styles.typeText}>{anime.type}</Text>
                    </View>
                )}

                {anime.episodes && (
                    <View style={styles.badgeContainer}>
                        <EpisodeBadges
                            sub={anime.episodes.sub}
                            dub={anime.episodes.dub}
                            eps={anime.episodes.eps}
                            size="sm"
                        />
                    </View>
                )}
            </View>

            <Text style={styles.title} numberOfLines={2}>
                {anime.title}
            </Text>
        </Pressable>
    );
}

// Horizontal anime card for search results
interface AnimeCardHorizontalProps {
    anime: AnimeBasic;
    style?: object;
}

export function AnimeCardHorizontal({ anime, style }: AnimeCardHorizontalProps) {
    const router = useRouter();

    const handlePress = () => {
        router.push(`/anime/${anime.id}`);
    };

    return (
        <Pressable
            style={({ pressed }) => [
                styles.horizontalContainer,
                pressed && styles.pressed,
                style,
            ]}
            onPress={handlePress}
        >
            <Image
                source={{ uri: anime.poster }}
                style={styles.horizontalImage}
                resizeMode="cover"
            />

            <View style={styles.horizontalContent}>
                <Text style={styles.horizontalTitle} numberOfLines={2}>
                    {anime.title}
                </Text>

                {anime.alternativeTitle && (
                    <Text style={styles.alternativeTitle} numberOfLines={1}>
                        {anime.alternativeTitle}
                    </Text>
                )}

                <View style={styles.horizontalMeta}>
                    {anime.type && <Text style={styles.metaText}>{anime.type}</Text>}
                    {anime.duration && <Text style={styles.metaText}> • {anime.duration}</Text>}
                </View>

                {anime.episodes && (
                    <View style={styles.horizontalBadges}>
                        <EpisodeBadges
                            sub={anime.episodes.sub}
                            dub={anime.episodes.dub}
                            eps={anime.episodes.eps}
                        />
                    </View>
                )}
            </View>
        </Pressable>
    );
}

// Grid card for browse pages
interface AnimeCardGridProps {
    anime: AnimeBasic;
    columns?: number;
}

export function AnimeCardGrid({ anime, columns = 3 }: AnimeCardGridProps) {
    const router = useRouter();
    const cardWidth = (SCREEN_WIDTH - spacing.lg * 2 - spacing.md * (columns - 1)) / columns;
    const cardHeight = cardWidth * 1.4;

    const handlePress = () => {
        router.push(`/anime/${anime.id}`);
    };

    return (
        <Pressable
            style={({ pressed }) => [
                styles.gridContainer,
                { width: cardWidth, marginBottom: spacing.md },
                pressed && styles.pressed,
            ]}
            onPress={handlePress}
        >
            <View style={[styles.gridImageContainer, { width: cardWidth, height: cardHeight }]}>
                <Image
                    source={{ uri: anime.poster }}
                    style={styles.image}
                    resizeMode="cover"
                />

                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.9)']}
                    style={styles.gradient}
                />

                {anime.episodes && (
                    <View style={styles.gridBadgeContainer}>
                        <EpisodeBadges
                            sub={anime.episodes.sub}
                            dub={anime.episodes.dub}
                            eps={anime.episodes.eps}
                            size="sm"
                        />
                    </View>
                )}
            </View>

            <Text style={styles.gridTitle} numberOfLines={2}>
                {anime.title}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        marginRight: spacing.md,
    },
    pressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    imageContainer: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: colors.backgroundTertiary,
        ...shadows.md,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
    },
    typeContainer: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: colors.overlay,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    typeText: {
        color: colors.textSecondary,
        fontSize: 10,
        fontWeight: '600',
    },
    badgeContainer: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
    },
    title: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '600',
        marginTop: spacing.sm,
        lineHeight: 18,
    },
    // Horizontal card styles
    horizontalContainer: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    horizontalImage: {
        width: 100,
        height: 140,
        backgroundColor: colors.backgroundTertiary,
    },
    horizontalContent: {
        flex: 1,
        padding: spacing.md,
        justifyContent: 'center',
    },
    horizontalTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 20,
    },
    alternativeTitle: {
        color: colors.textTertiary,
        fontSize: 12,
        marginTop: 4,
    },
    horizontalMeta: {
        flexDirection: 'row',
        marginTop: spacing.sm,
    },
    metaText: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    horizontalBadges: {
        marginTop: spacing.sm,
    },
    // Grid card styles
    gridContainer: {
        marginRight: spacing.md,
    },
    gridImageContainer: {
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        backgroundColor: colors.backgroundTertiary,
    },
    gridBadgeContainer: {
        position: 'absolute',
        bottom: 6,
        left: 6,
        right: 6,
    },
    gridTitle: {
        color: colors.text,
        fontSize: 12,
        fontWeight: '500',
        marginTop: spacing.xs,
        lineHeight: 16,
    },
});

export default AnimeCard;
