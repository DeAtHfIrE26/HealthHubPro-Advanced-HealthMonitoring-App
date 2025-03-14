import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

async function createDatabase() {
  // Connect to PostgreSQL without specifying a database
  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    logging: console.log,
  });

  try {
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL server.');

    // Create the database if it doesn't exist
    const dbName = process.env.DB_NAME || 'healthhubpro';
    await sequelize.query(`CREATE DATABASE "${dbName}" WITH OWNER = ${process.env.DB_USER || 'postgres'};`);
    console.log(`Database "${dbName}" created successfully.`);
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log(`Database "${process.env.DB_NAME || 'healthhubpro'}" already exists.`);
    } else {
      console.error('Error creating database:', error);
    }
  } finally {
    await sequelize.close();
  }
}

createDatabase(); 