# Miles & Steps Tracker

A modern web application for tracking daily walking/running activities, built with Astro and TypeScript. Track your miles, steps, calories, and weight in a clean, intuitive interface with cross-device synchronization.

## What We Track

- **Miles**: Track your daily walking/running distance
- **Steps**: Automatically calculated based on your miles and steps per mile setting
- **Calories**: Monitor calories burned during activities
- **Weight**: Track your weight changes over time

## Features

- **Daily Activity Tracking**
  - Record miles walked/run
  - Automatic steps calculation based on miles
  - Track calories burned
  - Monitor weight changes
  - Automatic consolidation of multiple activities per day

- **Cross-Device Sync**
  - Sync activities across multiple devices
  - Real-time updates between browsers
  - Sync settings across devices
  - Easy sync code sharing

- **Activity Summary**
  - Weekly, monthly, and yearly views
  - Total miles, steps, and calories
  - Latest weight tracking
  - Interactive charts with average line toggle

- **Activity Management**
  - Add new activities (automatically combines same-day activities)
  - Edit existing activities
  - Delete activities
  - Sort activities by date
  - Responsive design for mobile and desktop

- **Settings**
  - Customizable steps per mile calculation
  - Settings sync across devices
  - Persistent data storage using localStorage and Firebase
  - Easy device pairing with sync codes

## Tech Stack

- [Astro](https://astro.build/) - Static Site Generator
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Chart.js](https://www.chartjs.org/) - Interactive charts
- [date-fns](https://date-fns.org/) - Date manipulation library
- [Firebase](https://firebase.google.com/) - Real-time data synchronization

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase account (for sync functionality)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/miles-steps-tracker.git
   cd miles-steps-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser and navigate to `http://localhost:4321`

### Building for Production

```bash
npm run build
# or
yarn build
```

## Usage

1. **Adding an Activity**
   - Click the "Add Activity" button
   - Enter the date, miles, calories, and weight (optional)
   - Steps are automatically calculated based on your settings
   - If an activity exists for the same day, values will be combined
   - Click "Save Activity" to record

2. **Syncing Across Devices**
   - Click the Settings button
   - Find your sync code or enter a code from another device
   - Click "Sync" to synchronize data
   - Activities and settings will automatically sync in real-time

3. **Viewing Activities**
   - Activities are displayed in chronological order
   - Each activity shows miles, steps, calories, and weight
   - Use the edit button to modify any activity
   - Use the delete button to remove activities

4. **Viewing Summary**
   - Toggle between weekly, monthly, and yearly views
   - View total miles, steps, calories, and latest weight
   - Toggle the average line on the chart for better visualization

5. **Settings**
   - Click the settings icon to adjust steps per mile
   - Changes automatically sync across devices
   - Copy your sync code to pair with other devices

## Data Storage

Data is stored both locally and in the cloud:
- Local storage using browser's localStorage
- Cloud storage using Firebase Realtime Database
- Real-time synchronization between devices
- Automatic conflict resolution

## Privacy

- No user accounts required
- Data is only accessible with your sync code
- Sync codes are randomly generated
- You can generate a new sync code at any time
