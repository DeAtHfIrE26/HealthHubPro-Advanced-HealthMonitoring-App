describe('Workout Tracking', () => {
  beforeEach(() => {
    // Visit the login page and log in
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    
    // Navigate to the workout page
    cy.visit('/workouts');
  });

  it('should allow users to create a new workout', () => {
    // Click on the "Add Workout" button
    cy.contains('Add Workout').click();
    
    // Fill in the workout form
    cy.get('input[name="workoutName"]').type('Morning Run');
    cy.get('select[name="workoutType"]').select('Cardio');
    cy.get('input[name="duration"]').type('30');
    cy.get('input[name="caloriesBurned"]').type('250');
    cy.get('textarea[name="notes"]').type('Felt good, maintained steady pace');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Verify the workout was added to the list
    cy.contains('Morning Run').should('be.visible');
    cy.contains('Cardio').should('be.visible');
    cy.contains('30 min').should('be.visible');
    cy.contains('250 kcal').should('be.visible');
  });

  it('should allow users to edit an existing workout', () => {
    // Find and click the edit button for the first workout
    cy.get('[data-testid="edit-workout-button"]').first().click();
    
    // Update the workout details
    cy.get('input[name="workoutName"]').clear().type('Updated Workout');
    cy.get('input[name="duration"]').clear().type('45');
    
    // Save the changes
    cy.get('button[type="submit"]').click();
    
    // Verify the workout was updated
    cy.contains('Updated Workout').should('be.visible');
    cy.contains('45 min').should('be.visible');
  });

  it('should allow users to delete a workout', () => {
    // Get the name of the first workout for verification
    cy.get('[data-testid="workout-name"]').first().invoke('text').as('workoutName');
    
    // Find and click the delete button for the first workout
    cy.get('[data-testid="delete-workout-button"]').first().click();
    
    // Confirm deletion in the modal
    cy.get('[data-testid="confirm-delete-button"]').click();
    
    // Verify the workout was removed
    cy.get('@workoutName').then((workoutName) => {
      cy.contains(workoutName as string).should('not.exist');
    });
  });

  it('should update activity charts in real-time after adding a workout', () => {
    // Navigate to dashboard
    cy.visit('/dashboard');
    
    // Get initial chart data
    cy.get('[data-testid="activity-chart"]').should('be.visible');
    
    // Navigate to workouts and add a new workout
    cy.visit('/workouts');
    cy.contains('Add Workout').click();
    cy.get('input[name="workoutName"]').type('High Intensity Interval Training');
    cy.get('select[name="workoutType"]').select('HIIT');
    cy.get('input[name="duration"]').type('20');
    cy.get('input[name="caloriesBurned"]').type('300');
    cy.get('button[type="submit"]').click();
    
    // Navigate back to dashboard
    cy.visit('/dashboard');
    
    // Verify chart has been updated with new data
    cy.get('[data-testid="activity-chart"]').should('be.visible');
    cy.contains('High Intensity Interval Training').should('be.visible');
  });
}); 