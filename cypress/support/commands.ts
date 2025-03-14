// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// -- This is a parent command --
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
});

// -- This is a child command --
Cypress.Commands.add('dragAndDrop', { prevSubject: 'element' }, (subject, targetSelector) => {
  cy.wrap(subject).trigger('mousedown', { which: 1 });
  cy.get(targetSelector).trigger('mousemove').trigger('mouseup', { force: true });
});

// -- This is a dual command --
Cypress.Commands.add('dismissAlert', (text) => {
  cy.on('window:alert', (str) => {
    expect(str).to.equal(text);
    return true;
  });
});

// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// Declare the Cypress namespace for TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      dragAndDrop(targetSelector: string): Chainable<Element>;
      dismissAlert(text: string): Chainable<void>;
    }
  }
} 