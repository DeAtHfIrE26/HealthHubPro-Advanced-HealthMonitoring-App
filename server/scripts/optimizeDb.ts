import { db } from '../db';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection pools for different shards
const shardPools: { [key: string]: Pool } = {
  shard1: new Pool({
    connectionString: process.env.DATABASE_URL_SHARD1 || process.env.DATABASE_URL,
  }),
  shard2: new Pool({
    connectionString: process.env.DATABASE_URL_SHARD2 || process.env.DATABASE_URL,
  }),
  shard3: new Pool({
    connectionString: process.env.DATABASE_URL_SHARD3 || process.env.DATABASE_URL,
  }),
};

// Create Drizzle instances for each shard
const shardDbs = Object.entries(shardPools).reduce((acc, [key, pool]) => {
  acc[key] = drizzle(pool);
  return acc;
}, {} as { [key: string]: ReturnType<typeof drizzle> });

async function createIndexes() {
  console.log('Creating indexes for performance optimization...');
  
  try {
    // Create indexes on the main database
    await db.execute(`
      -- User indexes
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
      
      -- Workout indexes
      CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts (user_id);
      CREATE INDEX IF NOT EXISTS idx_workouts_created_at ON workouts (created_at);
      CREATE INDEX IF NOT EXISTS idx_workouts_workout_type ON workouts (workout_type);
      
      -- Meal indexes
      CREATE INDEX IF NOT EXISTS idx_meals_user_id ON meals (user_id);
      CREATE INDEX IF NOT EXISTS idx_meals_created_at ON meals (created_at);
      CREATE INDEX IF NOT EXISTS idx_meals_meal_type ON meals (meal_type);
      
      -- Goal indexes
      CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals (user_id);
      CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals (target_date);
      
      -- Activity indexes
      CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities (user_id);
      CREATE INDEX IF NOT EXISTS idx_activities_date ON activities (date);
      
      -- Recommendation indexes
      CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations (user_id);
      CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations (created_at);
    `);
    
    console.log('Indexes created successfully on the main database.');
    
    // Create the same indexes on each shard
    for (const [shardName, shardDb] of Object.entries(shardDbs)) {
      console.log(`Creating indexes on ${shardName}...`);
      
      await shardDb.execute(`
        -- User indexes
        CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
        
        -- Workout indexes
        CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts (user_id);
        CREATE INDEX IF NOT EXISTS idx_workouts_created_at ON workouts (created_at);
        CREATE INDEX IF NOT EXISTS idx_workouts_workout_type ON workouts (workout_type);
        
        -- Meal indexes
        CREATE INDEX IF NOT EXISTS idx_meals_user_id ON meals (user_id);
        CREATE INDEX IF NOT EXISTS idx_meals_created_at ON meals (created_at);
        CREATE INDEX IF NOT EXISTS idx_meals_meal_type ON meals (meal_type);
        
        -- Goal indexes
        CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals (user_id);
        CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals (target_date);
        
        -- Activity indexes
        CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities (user_id);
        CREATE INDEX IF NOT EXISTS idx_activities_date ON activities (date);
        
        -- Recommendation indexes
        CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations (user_id);
        CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations (created_at);
      `);
      
      console.log(`Indexes created successfully on ${shardName}.`);
    }
  } catch (error) {
    console.error('Error creating indexes:', error);
    throw error;
  }
}

async function setupSharding() {
  console.log('Setting up database sharding...');
  
  try {
    // Create shard mapping table in the main database
    await db.execute(`
      CREATE TABLE IF NOT EXISTS shard_mapping (
        user_id INTEGER PRIMARY KEY,
        shard_id VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_shard_mapping_shard_id ON shard_mapping (shard_id);
    `);
    
    console.log('Shard mapping table created successfully.');
    
    // Create the same schema on each shard
    for (const [shardName, shardDb] of Object.entries(shardDbs)) {
      console.log(`Setting up schema on ${shardName}...`);
      
      // Run migrations on the shard
      await migrate(shardDb, { migrationsFolder: './drizzle' });
      
      console.log(`Schema setup completed on ${shardName}.`);
    }
  } catch (error) {
    console.error('Error setting up sharding:', error);
    throw error;
  }
}

async function setupCaching() {
  console.log('Setting up query caching...');
  
  try {
    // Create a function to manage cache invalidation
    await db.execute(`
      CREATE OR REPLACE FUNCTION invalidate_cache() RETURNS TRIGGER AS $$
      BEGIN
        -- This would typically call out to your cache service (Redis, etc.)
        -- For demonstration purposes, we're just logging
        RAISE NOTICE 'Cache invalidation triggered for table %', TG_TABLE_NAME;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Create triggers for cache invalidation on data changes
      DROP TRIGGER IF EXISTS invalidate_users_cache ON users;
      CREATE TRIGGER invalidate_users_cache
        AFTER INSERT OR UPDATE OR DELETE ON users
        FOR EACH ROW EXECUTE FUNCTION invalidate_cache();
        
      DROP TRIGGER IF EXISTS invalidate_workouts_cache ON workouts;
      CREATE TRIGGER invalidate_workouts_cache
        AFTER INSERT OR UPDATE OR DELETE ON workouts
        FOR EACH ROW EXECUTE FUNCTION invalidate_cache();
        
      DROP TRIGGER IF EXISTS invalidate_meals_cache ON meals;
      CREATE TRIGGER invalidate_meals_cache
        AFTER INSERT OR UPDATE OR DELETE ON meals
        FOR EACH ROW EXECUTE FUNCTION invalidate_cache();
    `);
    
    console.log('Query caching setup completed.');
  } catch (error) {
    console.error('Error setting up caching:', error);
    throw error;
  }
}

async function optimizeQueries() {
  console.log('Optimizing common queries...');
  
  try {
    // Create materialized views for common dashboard queries
    await db.execute(`
      -- Materialized view for user workout summaries
      CREATE MATERIALIZED VIEW IF NOT EXISTS user_workout_summary AS
      SELECT 
        user_id,
        COUNT(*) as total_workouts,
        SUM(duration) as total_duration,
        SUM(calories_burned) as total_calories_burned,
        MAX(created_at) as last_workout_date
      FROM workouts
      GROUP BY user_id;
      
      -- Create index on the materialized view
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_workout_summary_user_id 
      ON user_workout_summary (user_id);
      
      -- Materialized view for user meal summaries
      CREATE MATERIALIZED VIEW IF NOT EXISTS user_meal_summary AS
      SELECT 
        user_id,
        COUNT(*) as total_meals,
        SUM(calories) as total_calories,
        SUM(protein) as total_protein,
        SUM(carbs) as total_carbs,
        SUM(fat) as total_fat,
        MAX(created_at) as last_meal_date
      FROM meals
      GROUP BY user_id;
      
      -- Create index on the materialized view
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_meal_summary_user_id 
      ON user_meal_summary (user_id);
      
      -- Create a function to refresh materialized views
      CREATE OR REPLACE FUNCTION refresh_materialized_views() RETURNS VOID AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY user_workout_summary;
        REFRESH MATERIALIZED VIEW CONCURRENTLY user_meal_summary;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create a scheduled job to refresh materialized views
    await db.execute(`
      -- Create extension for job scheduling if it doesn't exist
      CREATE EXTENSION IF NOT EXISTS pg_cron;
      
      -- Schedule job to refresh materialized views every hour
      SELECT cron.schedule('0 * * * *', 'SELECT refresh_materialized_views()');
    `);
    
    console.log('Query optimization completed.');
  } catch (error) {
    console.error('Error optimizing queries:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('Starting database optimization...');
    
    // Create indexes for better query performance
    await createIndexes();
    
    // Set up database sharding for horizontal scaling
    await setupSharding();
    
    // Set up query caching
    await setupCaching();
    
    // Optimize common queries with materialized views
    await optimizeQueries();
    
    console.log('Database optimization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database optimization failed:', error);
    process.exit(1);
  }
}

// Run the optimization
main(); 