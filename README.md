# Miles & Steps Tracker

A modern web application for tracking daily walking/running activities, built with Astro and TypeScript. Track your miles, steps, calories, and weight in a clean, intuitive interface.

## Features

- **Daily Activity Tracking**
  - Record miles walked/run
  - Automatic steps calculation based on miles
  - Track calories burned
  - Monitor weight changes

- **Activity Summary**
  - Weekly, monthly, and yearly views
  - Total miles, steps, and calories
  - Latest weight tracking
  - Interactive charts with average line toggle

- **Activity Management**
  - Add new activities
  - Edit existing activities
  - Sort activities by date
  - Responsive design for mobile and desktop

- **Settings**
  - Customizable steps per mile calculation
  - Persistent data storage using localStorage

## Tech Stack

- [Astro](https://astro.build/) - Static Site Generator
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Chart.js](https://www.chartjs.org/) - Interactive charts
- [date-fns](https://date-fns.org/) - Date manipulation library

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

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
   - Click "Save Activity" to record

2. **Viewing Activities**
   - Activities are displayed in chronological order
   - Each activity shows miles, steps, calories, and weight
   - Use the edit button to modify any activity

3. **Viewing Summary**
   - Toggle between weekly, monthly, and yearly views
   - View total miles, steps, calories, and latest weight
   - Toggle the average line on the chart for better visualization

4. **Settings**
   - Click the settings icon to adjust steps per mile
   - Changes are automatically saved

## Data Storage

All data is stored locally in your browser using localStorage. No server-side storage is required.
