// Mock implementation for OpenAI service
// In a production environment, you would use the actual OpenAI API

import { storage } from './storage';

// Mock recommendation templates
const recommendationTemplates = {
  workout: [
    "Based on your recent activity, try incorporating more strength training into your routine. Aim for 3 sessions per week.",
    "Your cardio performance is improving! Consider adding interval training to further boost your endurance.",
    "You've been consistent with your workouts. Try adding yoga or stretching to improve flexibility and recovery.",
    "Your activity level has decreased recently. Start with short, daily walks to get back on track.",
    "Great progress on your strength goals! Consider adding more compound exercises like squats and deadlifts."
  ],
  nutrition: [
    "Try increasing your protein intake to support muscle recovery after your workouts.",
    "Consider adding more leafy greens to your diet for improved recovery and energy levels.",
    "Based on your activity level, you might benefit from increasing your healthy carbohydrate intake before workouts.",
    "Your water intake is below target. Aim to drink at least 8 glasses of water daily for optimal performance.",
    "Consider timing your meals around your workouts for improved energy and recovery."
  ],
  sleep: [
    "Your sleep patterns show inconsistency. Try establishing a regular sleep schedule, even on weekends.",
    "Consider reducing screen time 1 hour before bed to improve sleep quality.",
    "Your sleep duration is below recommended levels. Aim for 7-8 hours of sleep for optimal recovery.",
    "Try incorporating a relaxation routine before bed to improve sleep quality.",
    "Your sleep quality appears to be improving! Keep maintaining your consistent sleep schedule."
  ]
};

// Generate a random recommendation based on type
const generateRecommendation = (type: string): string => {
  const templates = recommendationTemplates[type as keyof typeof recommendationTemplates] || recommendationTemplates.workout;
  return templates[Math.floor(Math.random() * templates.length)];
};

// Generate all recommendations for a user
export const generateAllRecommendations = async (userId: number): Promise<void> => {
  try {
    console.log(`[MOCK] Generating all recommendations for user ${userId}`);
    
    // Generate one of each type
    await createRecommendation(userId, 'workout');
    await createRecommendation(userId, 'nutrition');
    await createRecommendation(userId, 'sleep');
  } catch (error) {
    console.error('Error generating all recommendations:', error);
  }
};

// Create a recommendation
export const createRecommendation = async (userId: number, type: string): Promise<any> => {
  try {
    console.log(`[MOCK] Creating ${type} recommendation for user ${userId}`);
    
    // Generate recommendation content
    const content = generateRecommendation(type);
    
    // Store in database
    return await storage.createRecommendation({
      userId,
      type,
      content
    });
  } catch (error) {
    console.error(`Error creating ${type} recommendation:`, error);
    throw error;
  }
};

// Generate custom insight
export const generateCustomInsight = async (userId: number, prompt: string): Promise<string> => {
  try {
    console.log(`[MOCK] Generating custom insight for user ${userId} with prompt: ${prompt}`);
    
    // Mock insights based on keywords in the prompt
    if (prompt.toLowerCase().includes('weight loss')) {
      return "For effective weight loss, focus on creating a calorie deficit through a combination of diet and exercise. Aim for 150-300 minutes of moderate-intensity cardio per week, combined with strength training 2-3 times weekly.";
    } else if (prompt.toLowerCase().includes('muscle') || prompt.toLowerCase().includes('strength')) {
      return "To build muscle effectively, ensure you're consuming adequate protein (1.6-2.2g per kg of bodyweight) and following a progressive overload approach in your strength training.";
    } else if (prompt.toLowerCase().includes('sleep')) {
      return "Improving sleep quality can significantly impact your fitness results. Aim for 7-9 hours of quality sleep, maintain a consistent sleep schedule, and create a relaxing bedtime routine.";
    } else if (prompt.toLowerCase().includes('nutrition') || prompt.toLowerCase().includes('diet')) {
      return "Focus on whole foods with a balance of proteins, complex carbohydrates, and healthy fats. Stay hydrated and time your meals around your workouts for optimal performance and recovery.";
    } else {
      return "Based on general fitness principles, consistency is key to achieving your goals. Aim for a balanced approach that includes both cardio and strength training, proper nutrition, adequate recovery, and stress management.";
    }
  } catch (error) {
    console.error('Error generating custom insight:', error);
    return "Unable to generate insight at this time. Please try again later.";
  }
};

export const aiService = {
  generateAllRecommendations,
  createRecommendation,
  generateCustomInsight
};
