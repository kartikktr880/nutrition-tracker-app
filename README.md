# Nutrition Tracker

A comprehensive web application for tracking nutrition, meal planning, and health goals.

## Features

### Core Features

- **Nutrition Tracking**: Log daily food intake with detailed nutritional information
- **Meal Planning**: Create and manage meal plans with target macros and dietary restrictions
- **Authentication System**: Secure user authentication with local storage persistence
- **Data Persistence**: Robust storage service for saving user data
- **Responsive Design**: Mobile-friendly interface that works across devices

### Components

#### Authentication

- **User Registration & Login**: Create accounts and authenticate securely
- **Profile Management**: Update user preferences and settings
- **Session Management**: Maintain user sessions with token-based authentication

#### Nutrition Tracking

- **Food Entry Logging**: Record daily food consumption with nutritional data
- **Macro Tracking**: Monitor protein, carbs, and fat intake
- **Daily Summaries**: View daily nutritional totals and progress

#### Meal Planning

- **Meal Plan Creation**: Step-by-step wizard for creating personalized meal plans
- **Macro Targeting**: Set specific macro goals for meal plans
- **Dietary Restrictions**: Specify food allergies and preferences
- **Meal Management**: Add and organize meals within plans
- **Recipe Search**: Find and add recipes to meal plans

#### Utilities

- **Logger**: Advanced logging system with different log levels and persistence
- **Date Formatting**: Consistent date handling across the application
- **Storage Service**: Reliable data persistence with error handling and retry mechanisms
- **Analytics**: Track user interactions and application usage

## Technical Implementation

### Architecture

The application is built using a component-based architecture with React and TypeScript. Key architectural features include:

- **Custom Hooks**: Encapsulate and reuse complex logic
- **Service Layer**: Abstract core functionality like storage and authentication
- **Type Safety**: Comprehensive TypeScript types for all data structures
- **Error Handling**: Robust error management with user-friendly feedback

### Key Files and Components

- **App.tsx**: Main application component with routing and authentication state
- **components/NutritionTracker.tsx**: Core nutrition tracking functionality
- **components/MealPlanner.tsx**: Main meal planning interface
- **components/meal-planning/**: Specialized meal planning components
  - **MealPlanCreator.tsx**: Wizard for creating new meal plans
  - **MealPlanViewer.tsx**: Detailed view of existing meal plans
  - **MealAdder.tsx**: Interface for adding meals to plans
- **services/auth.ts**: Authentication service with token management
- **services/storage.ts**: Data persistence service
- **utils/logger.ts**: Logging utility with multiple log levels
- **utils/dateUtils.ts**: Date formatting and manipulation utilities
- **hooks/useAuth.ts**: Authentication hook for components

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/nutrition-tracker.git
cd nutrition-tracker
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Start the development server
```bash
npm start
# or
yarn start
```

4. Open your browser to `http://localhost:3000`

## Future Enhancements

- **Data Visualization**: Charts and graphs for nutrition trends
- **Social Features**: Share meal plans and progress with friends
- **AI Recommendations**: Smart meal suggestions based on preferences and goals
- **Barcode Scanner**: Scan food packages for quick nutritional information
- **Export/Import**: Export data to CSV or PDF formats 