#!/bin/bash

# Automated Asset Review Queue Manager
# This script is triggered by cron to detect unreviewed campaigns
# and queue them for Claude Desktop to process

# Configuration - Dynamic Path Detection
# Detect project root by finding the directory containing this script and going up one level
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Allow override via environment variable for custom deployments
if [ -n "$CONTENT_ENGINE_ROOT" ]; then
    PROJECT_ROOT="$CONTENT_ENGINE_ROOT"
fi

OUTPUT_DIR="$PROJECT_ROOT/output"
TEMP_DIR="$PROJECT_ROOT/temp"
QUEUE_FILE="$TEMP_DIR/review_queue.txt"
LOG_FILE="$TEMP_DIR/review_log.txt"

# Function to log messages with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" >> "$LOG_FILE"
}

# Function to send desktop notification
send_notification() {
    local message="$1"
    local title="Content Engine Review"
    
    # macOS notification
    if command -v osascript >/dev/null 2>&1; then
        osascript -e "display notification \"$message\" with title \"$title\""
    fi
    
    # Linux notification (if available)
    if command -v notify-send >/dev/null 2>&1; then
        notify-send "$title" "$message"
    fi
}

# Main execution
main() {
    # Validate project structure
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        echo "ERROR: Not a valid Content Engine project root: $PROJECT_ROOT"
        echo "Expected to find package.json in project root"
        exit 1
    fi
    
    # Ensure temp directory exists
    if [ ! -d "$TEMP_DIR" ]; then
        mkdir -p "$TEMP_DIR"
    fi
    
    log_message "Starting automated review check"
    log_message "Project root: $PROJECT_ROOT"
    
    # Ensure output directory exists
    if [ ! -d "$OUTPUT_DIR" ]; then
        log_message "ERROR: Output directory not found: $OUTPUT_DIR"
        exit 1
    fi
    
    # Find campaigns with unreviewed status
    UNREVIEWED_CAMPAIGNS=$(find "$OUTPUT_DIR" -name "review_status.json" -exec grep -l '"claudeReviewed": false' {} \; 2>/dev/null)
    
    if [ -z "$UNREVIEWED_CAMPAIGNS" ]; then
        log_message "No campaigns pending review"
        exit 0
    fi
    
    # Count unreviewed campaigns
    CAMPAIGN_COUNT=$(echo "$UNREVIEWED_CAMPAIGNS" | wc -l | tr -d ' ')
    log_message "Found $CAMPAIGN_COUNT campaign(s) pending review"
    
    # Get the first unreviewed campaign directory
    FIRST_CAMPAIGN_FILE=$(echo "$UNREVIEWED_CAMPAIGNS" | head -1)
    CAMPAIGN_DIR=$(dirname "$FIRST_CAMPAIGN_FILE")
    CAMPAIGN_ID=$(basename "$CAMPAIGN_DIR")
    
    # Add to queue if not already there
    if ! grep -q "$CAMPAIGN_DIR" "$QUEUE_FILE" 2>/dev/null; then
        echo "$CAMPAIGN_DIR" >> "$QUEUE_FILE"
        log_message "Queued campaign for review: $CAMPAIGN_ID"
        log_message "Campaign path: $CAMPAIGN_DIR"
        
        # Send desktop notification
        if [ "$CAMPAIGN_COUNT" -eq 1 ]; then
            send_notification "1 campaign ready for review: $CAMPAIGN_ID"
        else
            send_notification "$CAMPAIGN_COUNT campaigns ready for review (processing: $CAMPAIGN_ID)"
        fi
        
        # Log queue status
        QUEUE_SIZE=$(wc -l < "$QUEUE_FILE" 2>/dev/null || echo "0")
        log_message "Review queue size: $QUEUE_SIZE"
        
    else
        log_message "Campaign already in queue: $CAMPAIGN_ID"
    fi
}

# Error handling
set -e
trap 'log_message "ERROR: Script failed at line $LINENO"' ERR

# Execute main function
main "$@"