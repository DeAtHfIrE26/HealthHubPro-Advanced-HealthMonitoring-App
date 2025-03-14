import { Sequelize } from 'sequelize-typescript';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'healthhubpro',
  logging: process.env.NODE_ENV !== 'production',
});

// Test database connection
export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

// Initialize database (sync models)
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Import models to ensure they are registered
    await import('./models');
    
    // Sync all models with the database
    await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    console.log('Database synchronized successfully.');
  } catch (error) {
    console.error('Failed to sync database:', error);
    throw error;
  }
};

export default sequelize; 