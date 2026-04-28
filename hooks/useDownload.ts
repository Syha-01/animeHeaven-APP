import { useCallback, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { apiClient } from '../api/client';

// Conditionally import the legacy expo-file-system API (not available on web)
let LegacyFileSystem: any = null;
let Sharing: any = null;

if (Platform.OS !== 'web') {
    try {
        LegacyFileSystem = require('expo-file-system/legacy');
    } catch {
        try {
            LegacyFileSystem = require('expo-file-system');
        } catch {
            // Not available
        }
    }
    try {
        Sharing = require('expo-sharing');
    } catch {
        // Not available
    }
}

export type DownloadStatus = 'idle' | 'fetching' | 'downloading' | 'completed' | 'error';

export interface DownloadState {
    status: DownloadStatus;
    progress: number; // 0 to 1
    error: string | null;
}

/**
 * Sanitizes a filename by removing or replacing characters
 * that are invalid on common filesystems.
 */
function sanitizeFilename(name: string): string {
    return name
        .replace(/[/\\:*?"<>|]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .trim();
}

/**
 * Hook that manages downloading an episode.
 * - On native: uses expo-file-system with progress tracking
 * - On web: triggers a browser download via window.open
 */
export function useDownload() {
    const [downloads, setDownloads] = useState<Record<string, DownloadState>>({});
    const activeDownloads = useRef<Record<string, any>>({});

    const getDownloadState = useCallback((episodeId: string): DownloadState => {
        return downloads[episodeId] || { status: 'idle', progress: 0, error: null };
    }, [downloads]);

    const updateDownload = useCallback((episodeId: string, update: Partial<DownloadState>) => {
        setDownloads(prev => ({
            ...prev,
            [episodeId]: {
                ...prev[episodeId] || { status: 'idle', progress: 0, error: null },
                ...update,
            },
        }));
    }, []);

    const startDownload = useCallback(async (
        episodeId: string,
        animeName: string,
        episodeNumber: number,
    ) => {
        // Already downloading?
        const current = downloads[episodeId];
        if (current?.status === 'downloading' || current?.status === 'fetching') {
            return;
        }

        updateDownload(episodeId, { status: 'fetching', progress: 0, error: null });

        try {
            // 1. Get the download URL from the API
            const downloadUrl = await apiClient.getDownloadUrl(episodeId);

            if (!downloadUrl) {
                updateDownload(episodeId, {
                    status: 'error',
                    error: 'No download URL available for this episode',
                });
                if (Platform.OS !== 'web') {
                    Alert.alert('Download Unavailable', 'No download link was found for this episode.');
                }
                return;
            }

            // 2. Platform-specific download
            if (Platform.OS === 'web') {
                // Web: open the download URL in a new tab
                window.open(downloadUrl, '_blank');
                updateDownload(episodeId, { status: 'completed', progress: 1 });

                // Reset after a bit so the icon returns to normal
                setTimeout(() => {
                    updateDownload(episodeId, { status: 'idle', progress: 0, error: null });
                }, 3000);
                return;
            }

            // Native: download with expo-file-system legacy API
            if (!LegacyFileSystem || !LegacyFileSystem.documentDirectory) {
                updateDownload(episodeId, { status: 'error', error: 'File system not available' });
                return;
            }

            const fileName = sanitizeFilename(`${animeName}_Ep${episodeNumber}.mp4`);
            const fileUri = `${LegacyFileSystem.documentDirectory}${fileName}`;

            updateDownload(episodeId, { status: 'downloading', progress: 0, error: null });

            const downloadResumable = LegacyFileSystem.createDownloadResumable(
                downloadUrl,
                fileUri,
                {
                    headers: {
                        Referer: 'https://animeheaven.me/',
                    },
                },
                (downloadProgress: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => {
                    const progress = downloadProgress.totalBytesWritten /
                        downloadProgress.totalBytesExpectedToWrite;
                    updateDownload(episodeId, { progress: isNaN(progress) ? 0 : progress });
                },
            );

            activeDownloads.current[episodeId] = downloadResumable;

            const result = await downloadResumable.downloadAsync();

            if (result?.uri) {
                updateDownload(episodeId, { status: 'completed', progress: 1 });

                // Offer to share/open the file
                if (Sharing && await Sharing.isAvailableAsync()) {
                    Alert.alert(
                        'Download Complete',
                        `${animeName} - Episode ${episodeNumber} has been downloaded.`,
                        [
                            { text: 'OK', style: 'default' },
                            {
                                text: 'Share',
                                onPress: () => Sharing.shareAsync(result.uri),
                            },
                        ],
                    );
                } else {
                    Alert.alert('Download Complete', `Saved to: ${fileName}`);
                }

                // Reset after delay
                setTimeout(() => {
                    updateDownload(episodeId, { status: 'idle', progress: 0, error: null });
                }, 5000);
            } else {
                updateDownload(episodeId, { status: 'error', error: 'Download failed' });
            }
        } catch (error: any) {
            if (error?.code === 'ERR_FILESYSTEM_CANNOT_DOWNLOAD') {
                updateDownload(episodeId, { status: 'error', error: 'Download was cancelled' });
            } else {
                console.error('Download error:', error);
                updateDownload(episodeId, {
                    status: 'error',
                    error: error?.message || 'Download failed',
                });
                if (Platform.OS !== 'web') {
                    Alert.alert('Download Error', error?.message || 'Something went wrong.');
                }
            }
        } finally {
            delete activeDownloads.current[episodeId];
        }
    }, [downloads, updateDownload]);

    const cancelDownload = useCallback(async (episodeId: string) => {
        const resumable = activeDownloads.current[episodeId];
        if (resumable) {
            try {
                await resumable.pauseAsync();
            } catch {
                // Ignore
            }
            delete activeDownloads.current[episodeId];
        }
        updateDownload(episodeId, { status: 'idle', progress: 0, error: null });
    }, [updateDownload]);

    return {
        getDownloadState,
        startDownload,
        cancelDownload,
    };
}
