describe('Diet Tracking', () => {
  beforeEach(() => {
    // Visit the login page and log in
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    
    // Navigate to the nutrition page
    cy.visit('/nutrition');
  });

  it('should allow users to log a meal', () => {
    // Click on the "Add Meal" button
    cy.contains('Add Meal').click();
    
    // Fill in the meal form
    cy.get('input[name="mealName"]').type('Breakfast');
    cy.get('select[name="mealType"]').select('Breakfast');
    cy.get('input[name="calories"]').type('450');
    cy.get('input[name="protein"]').type('25');
    cy.get('input[name="carbs"]').type('50');
    cy.get('input[name="fat"]').type('15');
    cy.get('textarea[name="description"]').type('Oatmeal with berries and protein powder');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Verify the meal was added to the list
    cy.contains('Breakfast').should('be.visible');
    cy.contains('450 kcal').should('be.visible');
    cy.contains('25g protein').should('be.visible');
  });

  it('should allow users to edit a logged meal', () => {
    // Find and click the edit button for the first meal
    cy.get('[data-testid="edit-meal-button"]').first().click();
    
    // Update the meal details
    cy.get('input[name="mealName"]').clear().type('Updated Meal');
    cy.get('input[name="calories"]').clear().type('550');
    
    // Save the changes
    cy.get('button[type="submit"]').click();
    
    // Verify the meal was updated
    cy.contains('Updated Meal').should('be.visible');
    cy.contains('550 kcal').should('be.visible');
  });

  it('should allow users to delete a meal', () => {
    // Get the name of the first meal for verification
    cy.get('[data-testid="meal-name"]').first().invoke('text').as('mealName');
    
    // Find and click the delete button for the first meal
    cy.get('[data-testid="delete-meal-button"]').first().click();
    
    // Confirm deletion in the modal
    cy.get('[data-testid="confirm-delete-button"]').click();
    
    // Verify the meal was removed
    cy.get('@mealName').then((mealName) => {
      cy.contains(mealName as string).should('not.exist');
    });
  });

  it('should update nutrition summary in real-time after adding a meal', () => {
    // Get initial nutrition summary data
    cy.get('[data-testid="nutrition-summary"]').should('be.visible');
    
    // Add a new meal
    cy.contains('Add Meal').click();
    cy.get('input[name="mealName"]').type('Lunch');
    cy.get('select[name="mealType"]').select('Lunch');
    cy.get('input[name="calories"]').type('650');
    cy.get('input[name="protein"]').type('35');
    cy.get('input[name="carbs"]').type('70');
    cy.get('input[name="fat"]').type('20');
    cy.get('button[type="submit"]').click();
    
    // Verify nutrition summary has been updated
    cy.get('[data-testid="nutrition-summary"]').should('be.visible');
    cy.get('[data-testid="total-calories"]').should('contain', '650');
  });

  it('should display nutrition insights based on logged meals', () => {
    // Navigate to insights page
    cy.visit('/insights');
    
    // Verify nutrition insights are displayed
    cy.get('[data-testid="nutrition-insights"]').should('be.visible');
    cy.contains('Nutrition Breakdown').should('be.visible');
    
    // Check if charts are rendered
    cy.get('[data-testid="macronutrient-chart"]').should('be.visible');
    cy.get('[data-testid="calorie-trend-chart"]').should('be.visible');
  });
}); 