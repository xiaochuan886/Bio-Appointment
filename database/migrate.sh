#!/bin/bash

# Bio-Appointment Database Migration Script
# This script helps with database migrations and setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5437}
POSTGRES_DB=${POSTGRES_DB:-bio_appointment}
POSTGRES_USER=${POSTGRES_USER:-app_user}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-secure_password_123}

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if PostgreSQL is running
check_postgres() {
    print_status "Checking PostgreSQL connection..."

    if docker ps | grep -q bio-appointment-postgres; then
        print_status "PostgreSQL container is running"
    else
        print_error "PostgreSQL container is not running"
        print_status "Starting PostgreSQL container..."
        docker-compose up -d postgres
        sleep 5
    fi

    # Test database connection
    if docker exec bio-appointment-postgres pg_isready -U $POSTGRES_USER -d $POSTGRES_DB; then
        print_status "PostgreSQL connection successful"
    else
        print_error "Cannot connect to PostgreSQL"
        exit 1
    fi
}

# Function to create database
create_database() {
    print_status "Creating database $POSTGRES_DB..."

    docker exec bio-appointment-postgres psql -U postgres -c "CREATE DATABASE $POSTGRES_DB;" 2>/dev/null || true
    docker exec bio-appointment-postgres psql -U postgres -c "CREATE USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD';" 2>/dev/null || true
    docker exec bio-appointment-postgres psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;" 2>/dev/null || true

    print_status "Database and user created/updated successfully"
}

# Function to run initialization scripts
run_init_scripts() {
    print_status "Running database initialization scripts..."

    for script in database/init/*.sql; do
        if [ -f "$script" ]; then
            print_status "Executing $(basename $script)..."
            docker exec -i bio-appointment-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < "$script"
        fi
    done

    print_status "All initialization scripts executed successfully"
}

# Function to backup database
backup_database() {
    local backup_file="backups/bio_appointment_$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p backups

    print_status "Creating database backup: $backup_file"
    docker exec bio-appointment-postgres pg_dump -U $POSTGRES_USER -d $POSTGRES_DB > "$backup_file"

    if [ $? -eq 0 ]; then
        print_status "Database backup created successfully: $backup_file"
        print_status "Backup size: $(du -h "$backup_file" | cut -f1)"
    else
        print_error "Database backup failed"
        exit 1
    fi
}

# Function to restore database
restore_database() {
    local backup_file=$1

    if [ -z "$backup_file" ]; then
        print_error "Please provide backup file path"
        exit 1
    fi

    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi

    print_warning "This will replace the current database with backup from $backup_file"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Restoring database from $backup_file"
        docker exec -i bio-appointment-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < "$backup_file"
        print_status "Database restored successfully"
    else
        print_status "Database restoration cancelled"
    fi
}

# Function to reset database
reset_database() {
    print_warning "This will delete all data in the database"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Resetting database..."
        docker exec bio-appointment-postgres psql -U postgres -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"
        docker exec bio-appointment-postgres psql -U postgres -c "CREATE DATABASE $POSTGRES_DB;"
        run_init_scripts
        print_status "Database reset successfully"
    else
        print_status "Database reset cancelled"
    fi
}

# Function to show database status
show_status() {
    print_status "Database Status:"
    echo "Host: $POSTGRES_HOST:$POSTGRES_PORT"
    echo "Database: $POSTGRES_DB"
    echo "User: $POSTGRES_USER"
    echo ""

    if docker ps | grep -q bio-appointment-postgres; then
        print_status "PostgreSQL container is running"

        # Get database size
        local db_size=$(docker exec bio-appointment-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT pg_size_pretty(pg_database_size('$POSTGRES_DB'));" | xargs)
        print_status "Database size: $db_size"

        # Get table counts
        local table_count=$(docker exec bio-appointment-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
        print_status "Number of tables: $table_count"

        # Get user count
        local user_count=$(docker exec bio-appointment-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT count(*) FROM profiles;" | xargs)
        print_status "Number of users: $user_count"
    else
        print_error "PostgreSQL container is not running"
    fi
}

# Function to display help
show_help() {
    echo "Bio-Appointment Database Migration Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  init       Initialize database and run all scripts"
    echo "  backup     Create database backup"
    echo "  restore    Restore database from backup file"
    echo "  reset      Reset database (delete all data and reinitialize)"
    echo "  status     Show database status"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 init"
    echo "  $0 backup"
    echo "  $0 restore backups/bio_appointment_20231201_120000.sql"
    echo "  $0 status"
    echo ""
    echo "Environment Variables:"
    echo "  POSTGRES_HOST     PostgreSQL host (default: localhost)"
    echo "  POSTGRES_PORT     PostgreSQL port (default: 5437)"
    echo "  POSTGRES_DB       PostgreSQL database name (default: bio_appointment)"
    echo "  POSTGRES_USER     PostgreSQL user (default: app_user)"
    echo "  POSTGRES_PASSWORD PostgreSQL password"
}

# Main script logic
case "${1:-}" in
    "init")
        check_postgres
        create_database
        run_init_scripts
        print_status "Database initialization completed successfully"
        ;;
    "backup")
        check_postgres
        backup_database
        ;;
    "restore")
        check_postgres
        restore_database "$2"
        ;;
    "reset")
        check_postgres
        reset_database
        ;;
    "status")
        show_status
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    "")
        print_error "No command provided"
        show_help
        exit 1
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac