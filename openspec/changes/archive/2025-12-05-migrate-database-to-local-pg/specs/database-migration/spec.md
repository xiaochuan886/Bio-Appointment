# Database Migration Specification

## ADDED Requirements

### Requirement: Local PostgreSQL Database Deployment
The system SHALL deploy a local PostgreSQL database using Docker Compose with port 5437.

#### Scenario: Development Environment Setup
**GIVEN** a developer sets up the development environment
**WHEN** they run `docker-compose up -d`
**THEN** PostgreSQL service starts on port 5437 and is accessible to the application

#### Scenario: Database Connection
**GIVEN** the PostgreSQL container is running
**WHEN** the application attempts to connect
**THEN** the connection is established successfully using the configured credentials

#### Scenario: Data Persistence
**GIVEN** the PostgreSQL container is running and contains data
**WHEN** the container is stopped and restarted
**THEN** all data persists and is available after restart

### Requirement: Database Migration from Supabase
The system SHALL migrate all existing data from Supabase to the local PostgreSQL database.

#### Scenario: Data Export
**GIVEN** access to the Supabase database
**WHEN** the migration script is executed
**THEN** all table data is exported to structured files with complete data integrity

#### Scenario: Schema Migration
**GIVEN** the exported Supabase schema
**WHEN** the schema migration script runs
**THEN** all tables, indexes, and constraints are created in the local PostgreSQL database

#### Scenario: Data Import Validation
**GIVEN** the exported data files and local database schema
**WHEN** the data import script executes
**THEN** all data is imported successfully and a validation report confirms 100% data integrity

#### Scenario: Foreign Key Relationship Preservation
**GIVEN** related records in different tables
**WHEN** data migration is performed
**THEN** all foreign key relationships are preserved and remain valid in the new database

### Requirement: Authentication Service Replacement
The system SHALL replace Supabase authentication with a local JWT-based authentication service.

#### Scenario: User Authentication
**GIVEN** a registered user with valid credentials
**WHEN** they attempt to log in
**THEN** the system validates credentials and issues a JWT token for session management

#### Scenario: Token Validation
**GIVEN** a JWT token from the authentication service
**WHEN** the token is presented to protected endpoints
**THEN** the token is validated and the request is processed if the token is valid and not expired

#### Scenario: Password Security
**GIVEN** a user creating or updating their password
**WHEN** the password is processed
**THEN** it is hashed using bcrypt with appropriate salt rounds and never stored in plain text

#### Scenario: Role-based Access Control
**GIVEN** users with different roles (super_admin, sales, head_nurse, nurse, doctor)
**WHEN** they attempt to access protected resources
**THEN** access is granted or denied based on their assigned roles matching the existing permission system

### Requirement: Real-time Data Synchronization
The system SHALL implement real-time data synchronization to replace Supabase realtime features.

#### Scenario: WebSocket Connection
**GIVEN** a client application
**WHEN** it connects to the WebSocket server
**THEN** a persistent connection is established and the client can subscribe to data change events

#### Scenario: Database Change Notification
**GIVEN** data modifications in the PostgreSQL database
**WHEN** the changes occur
**THEN** connected clients receive real-time notifications about the relevant data changes

#### Scenario: Subscription Management
**GIVEN** multiple clients with different data interests
**WHEN** they subscribe to specific data channels
**THEN** each client receives only the data changes they are subscribed to

#### Scenario: Connection Recovery
**GIVEN** a client with an active WebSocket connection
**WHEN** the connection is interrupted
**THEN** the client automatically reconnects and resubscribes to previous channels

### Requirement: Database Connection Management
The system SHALL implement efficient database connection management.

#### Scenario: Connection Pooling
**GIVEN** multiple concurrent database requests
**WHEN** the application handles these requests
**THEN** a connection pool efficiently manages database connections with optimal pool size

#### Scenario: Connection Error Handling
**GIVEN** a database connection failure
**WHEN** the error occurs
**THEN** the system handles the error gracefully, attempts reconnection, and provides appropriate user feedback

#### Scenario: Query Performance
**GIVEN** database queries for appointment and schedule data
**WHEN** these queries are executed
**THEN** they complete within acceptable performance limits (< 500ms for typical queries)

### Requirement: Data Backup and Recovery
The system SHALL provide automated database backup and recovery capabilities.

#### Scenario: Automated Backup
**GIVEN** the PostgreSQL database is running
**WHEN** the scheduled backup time is reached
**THEN** an automated backup is created and stored securely

#### Scenario: Data Recovery
**GIVEN** a database backup file
**WHEN** a recovery is needed
**THEN** the system can restore the database to the state captured in the backup

#### Scenario: Backup Validation
**GIVEN** recent database backups
**WHEN** backup integrity is checked
**THEN** all backups are verified to be complete and uncorrupted

## MODIFIED Requirements

### Requirement: Environment Configuration
The system SHALL support local PostgreSQL database configuration instead of Supabase cloud configuration.

#### Scenario: Database Connection Configuration
**GIVEN** environment configuration files with PostgreSQL parameters
**WHEN** the application starts up
**THEN** it reads PostgreSQL connection parameters (host=localhost, port=5437, database, user, password) from environment variables and establishes a connection

#### Scenario: Connection String Generation
**GIVEN** database connection parameters from environment variables
**WHEN** the application initializes the database client
**THEN** a valid PostgreSQL connection string is generated in the format `postgresql://user:password@localhost:5437/database` and used for all database connections

### Requirement: Development Workflow
The development workflow SHALL include local database management instead of Supabase cloud dependencies.

#### Scenario: Local Development Setup
**GIVEN** a new development environment with Docker installed
**WHEN** a developer runs `docker-compose up -d` and `npm run dev`
**THEN** the local PostgreSQL database starts on port 5437 and the application connects to it without requiring external Supabase credentials

#### Scenario: Database Schema Management
**GIVEN** database schema changes in the migration files
**WHEN** developers need to update the database structure
**THEN** they can apply schema migrations using local migration tools without depending on Supabase migration system

## REMOVED Requirements

### Requirement: Supabase Client Dependency
**REMOVED**: The system SHALL NOT depend on Supabase JavaScript client for database operations.

### Requirement: Supabase Authentication
**REMOVED**: The system SHALL NOT use Supabase authentication services for user management.

### Requirement: Supabase Realtime
**REMOVED**: The system SHALL NOT use Supabase realtime features for data synchronization.

## Implementation Notes

### Database Schema Considerations
- Maintain compatibility with existing application data models
- Preserve all constraints and relationships during migration
- Consider timezone handling for appointment scheduling
- Maintain data type integrity (UUIDs, timestamps, enums)

### Security Considerations
- Implement proper database user permissions
- Use connection string encryption in production
- Regular database user password rotation
- Network security for database access

### Performance Considerations
- Optimize database indexes for common query patterns
- Implement query result caching where appropriate
- Monitor database performance metrics
- Plan for horizontal scaling if needed

### Operational Considerations
- Implement database monitoring and alerting
- Create database maintenance procedures
- Plan for database upgrades and patching
- Document disaster recovery procedures