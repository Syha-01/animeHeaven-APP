import { ConfigContext, ExpoConfig } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';

export default ({ config }: ConfigContext): ExpoConfig => {
    return {
        ...config,
        name: IS_DEV ? 'Anime Heaven (Dev)' : 'Anime Heaven',
        slug: 'anime-view-app',
        version: '2.1.0',
        orientation: 'portrait',
        icon: './assets/images/aniflow_icon.png',
        scheme: 'animeheavenapp',
        userInterfaceStyle: 'automatic',
        newArchEnabled: true,
        ios: {
            supportsTablet: true,
            bundleIdentifier: IS_DEV ? 'com.entzib.animeheavenapp.dev' : 'com.entzib.animeheavenapp',
        },
        android: {
            adaptiveIcon: {
                backgroundColor: '#E6F4FE',
                foregroundImage: './assets/images/aniflow_icon.png',
                backgroundImage: './assets/images/android-icon-background.png',
                monochromeImage: './assets/images/android-icon-monochrome.png',
            },
            edgeToEdgeEnabled: true,
            predictiveBackGestureEnabled: false,
            package: IS_DEV ? 'com.entzib.animeheavenapp.dev' : 'com.entzib.animeheavenapp',
            versionCode: 3,
        },
        web: {
            output: 'static',
            favicon: './assets/images/favicon.png',
        },
        plugins: [
            'expo-router',
            [
                'expo-splash-screen',
                {
                    image: './assets/images/aniflow_icon.png',
                    imageWidth: 200,
                    resizeMode: 'contain',
                    backgroundColor: '#000000',
                    dark: {
                        backgroundColor: '#000000',
                    },
                },
            ],
            [
                'expo-build-properties',
                {
                    android: {
                        usesCleartextTraffic: true,
                    },
                },
            ],
            'expo-web-browser',
        ],
        experiments: {
            typedRoutes: true,
            reactCompiler: true,
        },
        extra: {
            router: {},
            eas: {
                projectId: '25d3c3a2-0478-4504-88e0-7997c4fae2a5',
            },
        },
        runtimeVersion: {
            policy: 'appVersion',
        },
        updates: {
            url: 'https://u.expo.dev/25d3c3a2-0478-4504-88e0-7997c4fae2a5',
        },
    };
};
