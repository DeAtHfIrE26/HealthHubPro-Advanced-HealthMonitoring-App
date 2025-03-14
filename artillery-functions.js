// Helper functions for Artillery load testing

// Workout types and meal types
const workoutTypes = ['Cardio', 'Strength', 'HIIT', 'Yoga', 'Pilates', 'CrossFit', 'Swimming', 'Cycling'];
const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

// Generate a random user for testing
function generateRandomUser(userContext, events, done) {
  const userId = Math.floor(Math.random() * 10000) + 1;
  userContext.vars.userId = userId;
  userContext.vars.email = `user${userId}@example.com`;
  userContext.vars.password = 'password123';
  
  return done();
}

// Generate a random workout for testing
function generateRandomWorkout(userContext, events, done) {
  const workoutTypeIndex = Math.floor(Math.random() * workoutTypes.length);
  const workoutType = workoutTypes[workoutTypeIndex];
  
  userContext.vars.workoutName = `${workoutType} Workout`;
  userContext.vars.workoutType = workoutType;
  userContext.vars.duration = Math.floor(Math.random() * 105) + 15; // 15-120 minutes
  userContext.vars.caloriesBurned = Math.floor(Math.random() * 700) + 100; // 100-800 calories
  userContext.vars.notes = 'Test workout created during load testing';
  
  return done();
}

// Generate a random meal for testing
function generateRandomMeal(userContext, events, done) {
  const mealTypeIndex = Math.floor(Math.random() * mealTypes.length);
  const mealType = mealTypes[mealTypeIndex];
  
  userContext.vars.mealName = `${mealType} Meal`;
  userContext.vars.mealType = mealType;
  userContext.vars.calories = Math.floor(Math.random() * 1000) + 200; // 200-1200 calories
  userContext.vars.protein = Math.floor(Math.random() * 40) + 10; // 10-50g protein
  userContext.vars.carbs = Math.floor(Math.random() * 130) + 20; // 20-150g carbs
  userContext.vars.fat = Math.floor(Math.random() * 35) + 5; // 5-40g fat
  userContext.vars.description = 'Test meal created during load testing';
  
  return done();
}

module.exports = {
  generateRandomUser,
  generateRandomWorkout,
  generateRandomMeal
}; 