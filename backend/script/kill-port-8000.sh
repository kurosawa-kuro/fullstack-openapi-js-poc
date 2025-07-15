#!/bin/bash

# Script to safely terminate processes running on port 8000
# Usage: ./kill-8000.sh [options]

set -euo pipefail

# Configuration
readonly PORT="${1:-8000}"
readonly SCRIPT_NAME="$(basename "$0")"
readonly LOG_PREFIX="[$SCRIPT_NAME]"

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}${LOG_PREFIX}${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}${LOG_PREFIX}${NC} $1"
}

log_error() {
    echo -e "${RED}${LOG_PREFIX}${NC} $1" >&2
}

# Help function
show_help() {
    cat << EOF
Usage: $SCRIPT_NAME [PORT]

Safely terminate processes running on the specified port.

Arguments:
    PORT    Port number to check (default: 8000)

Options:
    -h, --help    Show this help message

Examples:
    $SCRIPT_NAME           # Kill processes on port 8000
    $SCRIPT_NAME 8080      # Kill processes on port 8080

EOF
}

# Check if help is requested
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    show_help
    exit 0
fi

# Validate port number
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    log_error "Invalid port number: $PORT"
    log_error "Port must be a number between 1 and 65535"
    exit 1
fi

# Main function to kill processes on port
kill_processes_on_port() {
    local port="$1"
    
    log_info "Checking for processes on port $port..."
    
    # Get PIDs of processes using the port
    local pids
    if ! pids=$(lsof -ti:$port 2>/dev/null); then
        log_info "No processes found running on port $port"
        return 0
    fi
    
    if [[ -z "$pids" ]]; then
        log_info "No processes found running on port $port"
        return 0
    fi
    
    # Count processes
    local pid_count
    pid_count=$(echo "$pids" | wc -l)
    
    log_warn "Found $pid_count process(es) running on port $port"
    
    # Show process details before killing
    echo
    log_info "Process details:"
    echo "$pids" | while read -r pid; do
        if ps -p "$pid" > /dev/null 2>&1; then
            printf "  PID: %-8s " "$pid"
            ps -p "$pid" -o comm= 2>/dev/null || echo "Unknown process"
        fi
    done
    echo
    
    # Try graceful termination first (SIGTERM)
    log_info "Attempting graceful termination (SIGTERM)..."
    echo "$pids" | xargs kill -TERM 2>/dev/null || true
    
    # Wait a bit for graceful shutdown
    sleep 2
    
    # Check if any processes are still running
    local remaining_pids
    remaining_pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [[ -n "$remaining_pids" ]]; then
        log_warn "Some processes still running, using force kill (SIGKILL)..."
        echo "$remaining_pids" | xargs kill -KILL 2>/dev/null || true
        sleep 1
        
        # Final check
        if remaining_pids=$(lsof -ti:$port 2>/dev/null); then
            log_error "Failed to terminate some processes:"
            echo "$remaining_pids" | while read -r pid; do
                log_error "  PID $pid still running"
            done
            exit 1
        fi
    fi
    
    log_info "Successfully terminated all processes on port $port"
}

# Check if lsof is available
if ! command -v lsof &> /dev/null; then
    log_error "lsof command not found. Please install lsof package."
    exit 1
fi

# Main execution
main() {
    log_info "Starting port cleanup for port $PORT"
    kill_processes_on_port "$PORT"
    log_info "Port cleanup completed successfully"
}

# Run main function
main