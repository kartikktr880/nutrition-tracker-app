# Nutrition Tracker API Documentation

This document describes the REST API endpoints for the Nutrition Tracker project. It covers both legacy (Next.js pages/api) and new (app/api) endpoints.

---

## Authentication
- Most endpoints require user authentication (session or token).
- Unauthenticated requests will receive a 401 Unauthorized error.

---

## Table of Contents
- [Analytics](#analytics)
- [Meal Plan](#meal-plan)
- [Grocery List](#grocery-list)
- [Nutritional Goals](#nutritional-goals)
- [Data Portability](#data-portability)
- [Monitoring](#monitoring)
- [Recommendations](#recommendations)
- [Exercise API](#exercise-api)
- [Search API](#search-api)

---

## Analytics

### 1. `/api/analytics/data` (GET)
- **Description:** Get nutrition analytics for the current user (last 30 days by default).
- **Auth:** Required
- **Query Params:** None (uses session)
- **Response:**
```json
{
  "nutrition": {
    "calories": [1200, 1500, ...],
    "protein": [80, 90, ...],
    "carbs": [200, 180, ...],
    "fat": [50, 60, ...],
    "dates": ["2024-06-01", ...]
  },
  "goals": {
    "current": 1450,
    "target": 2000,
    "progress": 72.5
  },
  "trends": {
    "weekly": {"Week 1": 1400, ...},
    "monthly": {"Week 1": 1400, ...}
  }
}
```
- **Errors:** 401 Unauthorized, 500 Internal Server Error

### 2. `/api/analytics/export` (GET)
- **Description:** Export all nutrition data (CSV or JSON)
- **Auth:** Required
- **Query Params:** `format=json|csv` (default: json)
- **Response:** File download (CSV or JSON)
- **Errors:** 401 Unauthorized, 400 Invalid format, 500 Internal Server Error

### 3. `/api/analytics/report` (POST)
- **Description:** Generate a nutrition report (PDF or CSV) for a date range
- **Auth:** Required
- **Body:**
```json
{
  "startDate": "2024-06-01",
  "endDate": "2024-06-30",
  "format": "pdf" // or "csv"
}
```
- **Response:** File download (PDF or CSV)
- **Errors:** 401 Unauthorized, 400 Missing params, 500 Internal Server Error

---

## Meal Plan

### `/api/meal-plan` (GET, POST, PUT)
- **GET:** Fetch meal plan for a user and date range
  - **Query:** `startDate`, `endDate`
  - **Response:** Meal plan object
- **POST:** Create a new meal plan (AI-generated)
  - **Body:** `{ startDate, endDate }`
  - **Response:** Created meal plan
- **PUT:** Update an existing meal plan
  - **Body:** `{ mealPlanId, updates }`
  - **Response:** Updated meal plan
- **Errors:** 401 Unauthorized, 400/404 Not found, 500 Internal Server Error

---

## Grocery List

### `/api/grocery-list` (GET, POST, PUT)
- **GET:** Get the latest grocery list (last 7 days)
- **POST:** Generate and save a grocery list for a meal plan
  - **Body:** `{ mealPlanId }`
- **PUT:** Update an existing grocery list
  - **Body:** `{ groceryList }`
- **Response:** Grocery list object
- **Errors:** 401 Unauthorized, 404 Not found, 500 Internal Server Error

---

## Nutritional Goals

### `/api/nutritional-goals` (GET, PUT)
- **GET:** Get current user's nutritional goals
- **PUT:** Set or update nutritional goals
  - **Body:** `{ calories, protein, carbohydrates, fats, ... }`
- **Response:** Goals object
- **Errors:** 401 Unauthorized, 404 Not found, 500 Internal Server Error

---

## Data Portability

### `/api/data-portability` (GET, POST)
- **GET:** Export user data (JSON or CSV)
  - **Query:** `format=json|csv`
- **POST:** Import user data
  - **Body:** `{ data, format }`
- **Response:** Success message or file
- **Errors:** 401 Unauthorized, 400/405 Invalid, 500 Internal Server Error

---

## Monitoring

### `/api/monitoring` (GET)
- **GET:** Get system monitoring data
- **Response:** Monitoring stats
- **Errors:** 405 Method not allowed, 500 Internal Server Error

---

## Recommendations

### `/api/recommendations/meals` (GET)
- **GET:** Get meal recommendations
  - **Query:** `mealType=breakfast|lunch|dinner|snack`, `count=number`
- **Response:** List of recommended meals
- **Errors:** 401 Unauthorized, 400 Invalid meal type, 500 Internal Server Error

---

## Exercise API (app/api/exercise/*)

### `/api/exercise/data` (GET, POST, PUT, DELETE)
- **GET:** Fetch exercise data (sessions, progress, goals)
  - **Query:** `type=sessions|progress|goals`, `startDate`, `endDate`
- **POST:** Create new exercise data
  - **Body:** `{ type, ...payload }`
- **PUT:** Update exercise data
  - **Body:** `{ type, id, ...payload }`
- **DELETE:** Delete exercise data
  - **Query:** `type`, `id`
- **Response:** Data object or success message
- **Errors:** 401 Unauthorized, 400 Invalid type/ID, 500 Internal Server Error

### `/api/exercise/session` (GET, POST, PUT, DELETE, PATCH)
- **GET:** Get exercise sessions (with optional date range)
- **POST:** Create a new exercise session
- **PUT:** Update an exercise session
- **DELETE:** Delete an exercise session
- **PATCH:** Manage recovery queue (actions: process, status, clear)
- **Response:** Session object or status
- **Errors:** 401 Unauthorized, 400/404 Not found, 429 Rate limit, 500 Internal Server Error

### `/api/exercise/form/templates` (GET, POST)
- **GET:** Get exercise form templates (optionally by exerciseId)
- **POST:** Create a new form template
- **Response:** Template object
- **Errors:** 401 Unauthorized, 400/404 Not found, 500 Internal Server Error

### `/api/exercise/form/checks` (GET, POST, PUT)
- **GET:** Get form checks (optionally by exerciseId/date)
- **POST:** Create a new form check
- **PUT:** Update a form check
- **Response:** Check object
- **Errors:** 401 Unauthorized, 400/404 Not found, 500 Internal Server Error

### `/api/exercise/workouts` (GET, PUT, DELETE)
- **GET:** Get workouts (by exerciseId)
- **PUT:** Update a workout
- **DELETE:** Delete a workout
- **Response:** Workout object or success
- **Errors:** 401 Unauthorized, 400/404 Not found, 500 Internal Server Error

---

## Search API

### `/api/search` (POST)
- **POST:** Search for foods, meals, or other resources
  - **Body:** `{ query, filters, ... }`
- **Response:** Search results
- **Errors:** 400 Invalid request, 500 Internal Server Error

---

## Error Handling
- All endpoints return JSON error objects with an `error` field and appropriate HTTP status code.
- Common errors: 400 Bad Request, 401 Unauthorized, 404 Not Found, 405 Method Not Allowed, 429 Rate Limit, 500 Internal Server Error.

---

## Example Request (fetching analytics data)
```bash
curl -X GET 'https://yourdomain.com/api/analytics/data' \
  -H 'Authorization: Bearer <token>'
```

---

For more details, see the source code in the `pages/api` and `app/api` directories. 