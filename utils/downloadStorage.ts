import { Platform } from 'react-native';

let LegacyFileSystem: any = null;

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
}

const ROOT_FOLDER = 'AnimeHeaven';

/**
 * Sanitizes a name for use as a folder or file name.
 */
export function sanitizeName(name: string): string {
    return name
        .replace(/[/\\:*?"<>|]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .trim();
}

/**
 * Gets the base download directory path.
 */
function getBaseDir(): string | null {
    if (!LegacyFileSystem?.documentDirectory) return null;
    return `${LegacyFileSystem.documentDirectory}${ROOT_FOLDER}/`;
}

/**
 * Gets the directory path for a specific anime.
 */
export function getAnimeDir(animeName: string): string | null {
    const base = getBaseDir();
    if (!base) return null;
    return `${base}${sanitizeName(animeName)}/`;
}

/**
 * Gets the full file path for a downloaded episode.
 */
export function getEpisodeFilePath(animeName: string, episodeNumber: number): string | null {
    const animeDir = getAnimeDir(animeName);
    if (!animeDir) return null;
    return `${animeDir}Episode_${episodeNumber}.mp4`;
}

/**
 * Ensures the AnimeHeaven root directory and anime subdirectory exist.
 */
export async function ensureAnimeDir(animeName: string): Promise<string | null> {
    if (!LegacyFileSystem) return null;

    const base = getBaseDir();
    const animeDir = getAnimeDir(animeName);
    if (!base || !animeDir) return null;

    try {
        // Ensure root folder exists
        const baseInfo = await LegacyFileSystem.getInfoAsync(base);
        if (!baseInfo.exists) {
            await LegacyFileSystem.makeDirectoryAsync(base, { intermediates: true });
        }

        // Ensure anime folder exists
        const animeInfo = await LegacyFileSystem.getInfoAsync(animeDir);
        if (!animeInfo.exists) {
            await LegacyFileSystem.makeDirectoryAsync(animeDir, { intermediates: true });
        }

        return animeDir;
    } catch (error) {
        console.error('Failed to create anime directory:', error);
        return null;
    }
}

export interface DownloadedEpisode {
    episodeNumber: number;
    fileName: string;
    fileUri: string;
    fileSize: number; // bytes
}

export interface DownloadedAnime {
    animeName: string;
    folderName: string;
    folderUri: string;
    episodes: DownloadedEpisode[];
    totalSize: number; // bytes
}

/**
 * Scans the AnimeHeaven directory and returns all downloaded anime and their episodes.
 */
export async function getDownloadedAnime(): Promise<DownloadedAnime[]> {
    if (!LegacyFileSystem) return [];

    const base = getBaseDir();
    if (!base) return [];

    try {
        const baseInfo = await LegacyFileSystem.getInfoAsync(base);
        if (!baseInfo.exists) return [];

        const animeFolders = await LegacyFileSystem.readDirectoryAsync(base);
        const results: DownloadedAnime[] = [];

        for (const folderName of animeFolders) {
            const folderUri = `${base}${folderName}/`;
            const folderInfo = await LegacyFileSystem.getInfoAsync(folderUri);

            if (!folderInfo.isDirectory) continue;

            const files = await LegacyFileSystem.readDirectoryAsync(folderUri);
            const episodes: DownloadedEpisode[] = [];
            let totalSize = 0;

            for (const fileName of files) {
                if (!fileName.endsWith('.mp4')) continue;

                const fileUri = `${folderUri}${fileName}`;
                const fileInfo = await LegacyFileSystem.getInfoAsync(fileUri, { size: true });

                // Extract episode number from filename: Episode_1.mp4 → 1
                const match = fileName.match(/Episode_(\d+)/);
                const episodeNumber = match ? parseInt(match[1], 10) : 0;

                episodes.push({
                    episodeNumber,
                    fileName,
                    fileUri,
                    fileSize: fileInfo.size || 0,
                });

                totalSize += fileInfo.size || 0;
            }

            if (episodes.length > 0) {
                // Sort episodes by number
                episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);

                results.push({
                    animeName: folderName.replace(/_/g, ' '),
                    folderName,
                    folderUri,
                    episodes,
                    totalSize,
                });
            }
        }

        // Sort by anime name
        results.sort((a, b) => a.animeName.localeCompare(b.animeName));
        return results;
    } catch (error) {
        console.error('Failed to scan downloads:', error);
        return [];
    }
}

/**
 * Deletes a downloaded episode file.
 */
export async function deleteEpisode(fileUri: string): Promise<boolean> {
    if (!LegacyFileSystem) return false;
    try {
        await LegacyFileSystem.deleteAsync(fileUri, { idempotent: true });
        return true;
    } catch (error) {
        console.error('Failed to delete episode:', error);
        return false;
    }
}

/**
 * Deletes all downloaded episodes for an anime (removes the folder).
 */
export async function deleteAnimeFolder(folderUri: string): Promise<boolean> {
    if (!LegacyFileSystem) return false;
    try {
        await LegacyFileSystem.deleteAsync(folderUri, { idempotent: true });
        return true;
    } catch (error) {
        console.error('Failed to delete anime folder:', error);
        return false;
    }
}

/**
 * Formats file size for display.
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
