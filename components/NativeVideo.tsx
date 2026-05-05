import React, { forwardRef, useImperativeHandle, useEffect } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';

export const NativeVideo = forwardRef((props: any, ref) => {
    const { source, shouldPlay, onPlaybackStatusUpdate, style, onLoadStart, onReadyForDisplay } = props;

    const player = useVideoPlayer(
        source?.uri ? { uri: source.uri, headers: source.headers } : null,
        (p) => {
            p.loop = false;
        }
    );

    useImperativeHandle(ref, () => ({
        setPositionAsync: async (positionMillis: number) => {
            player.currentTime = positionMillis / 1000;
        },
        setRateAsync: async (rate: number, shouldCorrectPitch: boolean) => {
            player.playbackRate = rate;
        }
    }));

    useEffect(() => {
        if (shouldPlay && player.status === 'readyToPlay') {
            player.play();
        } else if (!shouldPlay && player.playing) {
            player.pause();
        }
    }, [shouldPlay, player.status]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (onPlaybackStatusUpdate && player.status !== 'error') {
                onPlaybackStatusUpdate({
                    isLoaded: true,
                    isBuffering: player.status === 'loading',
                    isPlaying: player.playing,
                    positionMillis: player.currentTime * 1000,
                    durationMillis: player.duration * 1000,
                    didJustFinish: player.duration > 0 && player.currentTime >= player.duration - 0.5,
                });
            }
        }, 500);

        return () => clearInterval(interval);
    }, [player, onPlaybackStatusUpdate]);

    useEventListener(player, 'statusChange', (payload) => {
        if (payload.status === 'error') {
            if (onPlaybackStatusUpdate) {
                onPlaybackStatusUpdate({ isLoaded: false, error: payload.error?.message || 'Unknown error' });
            }
        } else if (payload.status === 'loading') {
            onLoadStart?.();
        } else if (payload.status === 'readyToPlay') {
            onReadyForDisplay?.();
        }
    });

    return <VideoView player={player} style={style} contentFit="contain" nativeControls={false} pointerEvents="none" />;
});
