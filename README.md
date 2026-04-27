# AnimeHeaven App (AniView)

A modern, premium anime discovery and streaming experience built with React Native and Expo. This application provides a seamless way to browse, search, and watch your favorite anime with a beautiful, responsive interface.

## Features

- **Dynamic Home Experience**: Features a spotlight carousel for featured content, trending sections, top airing lists, and latest episode updates.
- **Deep Content Discovery**: Access detailed information for thousands of anime, including synopses, ratings, studio info, and related recommendations.
- **Character & Cast Insights**: Explore detailed profiles for characters and voice actors (seiyuu), including their roles across different series.
- **Premium Streaming**: High-quality video playback with support for multiple servers, subtitle/dub selections, and HLS streaming.
- **Advanced Filtering**: Powerful search system allowing users to filter by genre, status, season, score, and more.
- **Release Schedule**: Stay updated with a comprehensive release schedule for upcoming and recently aired episodes.
- **Personal Watchlist**: Manage your anime library with a "Saved" section, tracking your progress with statuses like "Watching," "Watch Later," and "Completed."
- **Optimized Performance**: Built with performance in mind using Expo Image for efficient image loading and Reanimated for smooth transitions.

## Tech Stack

- **Core**: React Native, Expo
- **Navigation**: Expo Router (Native Stack & Bottom Tabs)
- **State Management**: React Context API & Custom Hooks
- **Video Playback**: Expo Video
- **Networking**: Axios-like Fetch implementation with TypeScript
- **Styling**: Theme-based Design System (TypeScript)
- **Animations**: React Native Reanimated & Haptics

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- npm or yarn
- Expo Go app (optional, for physical device testing)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```bash
   cd animeheaven
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

- **Start Expo Dev Server**:
  ```bash
  npm start
  ```
- **Android**:
  ```bash
  npm run android
  ```
- **iOS**:
  ```bash
  npm run ios
  ```
- **Web**:
  ```bash
  npm run web
  ```

## Project Structure

- `app/`: Expo Router directory containing all screens and layout configurations.
- `api/`: Centralized API client and endpoint management.
- `components/`: Atomic and molecular UI components used across the app.
- `context/`: Global state providers (e.g., Watchlist, Theme).
- `hooks/`: Custom React hooks for business logic and data fetching.
- `theme/`: Design tokens, colors, and global style configurations.
- `types/`: Comprehensive TypeScript definitions for API responses and app state.
- `assets/`: Static assets including images, fonts, and icons.

## Backend API Requirement

This application requires a compatible backend API to function. You must build or host your own instance of the **AnimeHeaven API** and provide its URL in the application configuration.

### Configuration

Update `config.ts` with your API's base URL:

```typescript
const getBaseUrl = () => {
    return 'https://your-api-url.com'; // Replace with your backend URL
};
```

### API Response Specification

The application expects all API responses to follow a consistent JSON format to ensure proper data parsing and UI rendering.

#### Standard Response Wrapper
All successful responses should be wrapped in a status object:
```json
{
  "status": true,
  "data": { ... } // Actual resource data
}
```

#### Paginated Data Structure
For list-based endpoints (Search, Genres, etc.), the `data` field must include pagination metadata:
```json
{
  "status": true,
  "data": {
    "pageInfo": {
      "currentPage": 1,
      "hasNextPage": true,
      "totalPages": 15
    },
    "response": [ ... ] // Array of items
  }
}
```

## Disclaimer

This application is developed strictly for educational and research purposes.

- **No Content Hosting**: This application does not host, store, or upload any video files, media, or copyrighted material.
- **External Sources**: All data, images, and media content are retrieved from external, publicly available APIs and third-party services. The application functions solely as a user interface to display information from these sources.
- **Non-Affiliation**: The developers of this application are not affiliated with, authorized, or endorsed by any of the content providers or external services mentioned or used.
- **Compliance**: Users are responsible for ensuring their use of the application complies with local laws and the terms of service of any third-party content providers. The developers assume no liability for misuse of this software.

## DMCA

This application does not store any files on its server. All contents are provided by non-affiliated third parties. If you believe your copyrighted material is being linked to via this application, please contact the respective third-party hosting services directly for removal. As this application only indexes and links to content, we have no control over the source files.

---
