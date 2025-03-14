import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const workoutCreationErrors = new Counter('workout_creation_errors');
const mealCreationErrors = new Counter('meal_creation_errors');
const dashboardLoadErrors = new Counter('dashboard_load_errors');
const apiRequestRate = new Rate('api_request_rate');
const apiRequestDuration = new Trend('api_request_duration');

// Test data
const users = new SharedArray('users', function() {
  return Array.from({ length: 1000 }, (_, i) => ({
    id: i + 1,
    email: `user${i + 1}@example.com`,
    password: 'password123',
    token: `token-${i + 1}`
  }));
});

const workoutTypes = ['Cardio', 'Strength', 'HIIT', 'Yoga', 'Pilates', 'CrossFit', 'Swimming', 'Cycling'];
const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

// Test configuration
export const options = {
  scenarios: {
    // Simulate constant load of 1000 users
    constant_load: {
      executor: 'constant-vus',
      vus: 1000,
      duration: '5m',
    },
    // Simulate ramping up to 1 million users
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 1000,
      stages: [
        { duration: '2m', target: 10000 },
        { duration: '5m', target: 50000 },
        { duration: '10m', target: 100000 },
        { duration: '15m', target: 500000 },
        { duration: '20m', target: 1000000 },
        { duration: '5m', target: 0 },
      ],
    },
    // Simulate spike test
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 10000,
      maxVUs: 50000,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '1m', target: 5000 },
        { duration: '1m', target: 10000 },
        { duration: '1m', target: 5000 },
        { duration: '1m', target: 100 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    api_request_duration: ['p(95)<300'],
    api_request_rate: ['rate>0.9'],
  },
};

// Helper functions
function getRandomUser() {
  return users[randomIntBetween(0, users.length - 1)];
}

function getRandomWorkout() {
  const workoutType = workoutTypes[randomIntBetween(0, workoutTypes.length - 1)];
  return {
    workoutName: `${workoutType} Workout`,
    workoutType,
    duration: randomIntBetween(15, 120),
    caloriesBurned: randomIntBetween(100, 800),
    notes: `Test workout created during load testing`,
  };
}

function getRandomMeal() {
  const mealType = mealTypes[randomIntBetween(0, mealTypes.length - 1)];
  return {
    mealName: `${mealType} Meal`,
    mealType,
    calories: randomIntBetween(200, 1200),
    protein: randomIntBetween(10, 50),
    carbs: randomIntBetween(20, 150),
    fat: randomIntBetween(5, 40),
    description: `Test meal created during load testing`,
  };
}

// Main test function
export default function() {
  const user = getRandomUser();
  const baseUrl = 'https://app.healthhubpro.com';
  
  // Set up headers with authentication
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user.token}`,
  };
  
  // Simulate user flow
  const action = randomIntBetween(1, 5);
  
  switch (action) {
    case 1:
      // Load dashboard
      {
        const startTime = new Date();
        const response = http.get(`${baseUrl}/api/dashboard`, { headers });
        apiRequestDuration.add(new Date() - startTime);
        apiRequestRate.add(response.status === 200);
        
        const success = check(response, {
          'dashboard loaded successfully': (r) => r.status === 200,
          'dashboard contains user data': (r) => r.json().userId === user.id,
        });
        
        if (!success) {
          dashboardLoadErrors.add(1);
        }
      }
      break;
      
    case 2:
      // Create workout
      {
        const workout = getRandomWorkout();
        const startTime = new Date();
        const response = http.post(`${baseUrl}/api/workouts`, JSON.stringify(workout), { headers });
        apiRequestDuration.add(new Date() - startTime);
        apiRequestRate.add(response.status === 201);
        
        const success = check(response, {
          'workout created successfully': (r) => r.status === 201,
          'workout has ID': (r) => r.json().id !== undefined,
        });
        
        if (!success) {
          workoutCreationErrors.add(1);
        }
      }
      break;
      
    case 3:
      // Create meal
      {
        const meal = getRandomMeal();
        const startTime = new Date();
        const response = http.post(`${baseUrl}/api/meals`, JSON.stringify(meal), { headers });
        apiRequestDuration.add(new Date() - startTime);
        apiRequestRate.add(response.status === 201);
        
        const success = check(response, {
          'meal created successfully': (r) => r.status === 201,
          'meal has ID': (r) => r.json().id !== undefined,
        });
        
        if (!success) {
          mealCreationErrors.add(1);
        }
      }
      break;
      
    case 4:
      // Get workout history
      {
        const startTime = new Date();
        const response = http.get(`${baseUrl}/api/workouts?userId=${user.id}`, { headers });
        apiRequestDuration.add(new Date() - startTime);
        apiRequestRate.add(response.status === 200);
        
        check(response, {
          'workout history loaded successfully': (r) => r.status === 200,
          'workout history is an array': (r) => Array.isArray(r.json()),
        });
      }
      break;
      
    case 5:
      // Get nutrition history
      {
        const startTime = new Date();
        const response = http.get(`${baseUrl}/api/meals?userId=${user.id}`, { headers });
        apiRequestDuration.add(new Date() - startTime);
        apiRequestRate.add(response.status === 200);
        
        check(response, {
          'nutrition history loaded successfully': (r) => r.status === 200,
          'nutrition history is an array': (r) => Array.isArray(r.json()),
        });
      }
      break;
  }
  
  // Random sleep between actions to simulate real user behavior
  sleep(randomIntBetween(1, 5));
} 