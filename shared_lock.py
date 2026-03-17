#!/usr/bin/env python3
"""Shared locking utilities for parallel bot execution.

Provides:
- BrowserLock: Only one module can use the browser at a time
- safe_append/safe_read_lines/safe_write: Process-safe file operations
"""
import fcntl
import os
import time
from datetime import datetime

LOCK_DIR = os.path.expanduser("~/openclaw/linkedin-agent/.locks")
BROWSER_LOCK_FILE = os.path.join(LOCK_DIR, "browser.lock")

# Ensure lock directory exists
os.makedirs(LOCK_DIR, exist_ok=True)


class BrowserLock:
    """Context manager for exclusive browser access across processes.

    Usage:
        with BrowserLock("linkedin_bot"):
            run_cmd('docker exec openclaw clawdbot browser navigate ...')
            snapshot = get_snapshot()
            # ... all browser operations for this unit of work
    """

    def __init__(self, module_name="unknown", timeout=300):
        self.module_name = module_name
        self.timeout = timeout
        self._lock_file = None

    def __enter__(self):
        self._lock_file = open(BROWSER_LOCK_FILE, 'w')
        start = time.time()
        while True:
            try:
                fcntl.flock(self._lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                # Write who holds the lock for debugging
                self._lock_file.write(f"{self.module_name}|{datetime.now()}\n")
                self._lock_file.flush()
                return self
            except (IOError, OSError):
                elapsed = time.time() - start
                if elapsed >= self.timeout:
                    self._lock_file.close()
                    raise TimeoutError(
                        f"[{self.module_name}] Could not acquire browser lock after {self.timeout}s"
                    )
                time.sleep(1)

    def __exit__(self, *args):
        if self._lock_file:
            fcntl.flock(self._lock_file.fileno(), fcntl.LOCK_UN)
            self._lock_file.close()
            self._lock_file = None


def _get_file_lock_path(filepath):
    """Get lock file path for a given data file."""
    basename = os.path.basename(filepath)
    return os.path.join(LOCK_DIR, basename + ".lock")


def safe_append(filepath, line):
    """Process-safe file append."""
    lock_path = _get_file_lock_path(filepath)
    with open(lock_path, 'w') as lock_f:
        fcntl.flock(lock_f.fileno(), fcntl.LOCK_EX)
        try:
            with open(filepath, 'a') as f:
                f.write(line)
        finally:
            fcntl.flock(lock_f.fileno(), fcntl.LOCK_UN)


def safe_read_lines(filepath):
    """Process-safe file read. Returns list of lines."""
    if not os.path.exists(filepath):
        return []
    lock_path = _get_file_lock_path(filepath)
    with open(lock_path, 'w') as lock_f:
        fcntl.flock(lock_f.fileno(), fcntl.LOCK_SH)
        try:
            with open(filepath, 'r') as f:
                lines = f.readlines()
        finally:
            fcntl.flock(lock_f.fileno(), fcntl.LOCK_UN)
    return lines


def safe_read(filepath):
    """Process-safe full file read. Returns string."""
    if not os.path.exists(filepath):
        return ""
    lock_path = _get_file_lock_path(filepath)
    with open(lock_path, 'w') as lock_f:
        fcntl.flock(lock_f.fileno(), fcntl.LOCK_SH)
        try:
            with open(filepath, 'r') as f:
                content = f.read()
        finally:
            fcntl.flock(lock_f.fileno(), fcntl.LOCK_UN)
    return content


def safe_write(filepath, content):
    """Process-safe full file write (overwrite)."""
    lock_path = _get_file_lock_path(filepath)
    with open(lock_path, 'w') as lock_f:
        fcntl.flock(lock_f.fileno(), fcntl.LOCK_EX)
        try:
            with open(filepath, 'w') as f:
                f.write(content)
        finally:
            fcntl.flock(lock_f.fileno(), fcntl.LOCK_UN)
