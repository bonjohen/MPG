"""
Tests for utility functions.
"""
import pytest
from datetime import datetime, timedelta
from app.utils.date_utils import format_datetime, time_since


def test_format_datetime():
    """Test the format_datetime function."""
    # Create a datetime object
    dt = datetime(2023, 1, 1, 12, 0, 0)

    # Test default format
    assert format_datetime(dt) == 'January 01, 2023 12:00 PM'

    # Test custom format
    assert format_datetime(dt, '%Y-%m-%d') == '2023-01-01'
    assert format_datetime(dt, '%H:%M:%S') == '12:00:00'

    # Test with None
    assert format_datetime(None) == ''
    assert format_datetime(None, '%Y-%m-%d') == ''


def test_time_since():
    """Test the time_since function."""
    now = datetime.now()

    # Test with seconds
    seconds_ago = now - timedelta(seconds=30)
    assert 'seconds ago' in time_since(seconds_ago)

    # Test with minutes
    minutes_ago = now - timedelta(minutes=5)
    assert 'minutes ago' in time_since(minutes_ago)

    # Test with hours
    hours_ago = now - timedelta(hours=2)
    assert 'hours ago' in time_since(hours_ago)

    # Test with days
    days_ago = now - timedelta(days=3)
    assert 'days ago' in time_since(days_ago)

    # Test with weeks
    weeks_ago = now - timedelta(days=14)
    assert 'weeks ago' in time_since(weeks_ago)

    # Test with months
    months_ago = now - timedelta(days=60)
    assert 'months ago' in time_since(months_ago)

    # Test with years
    years_ago = now - timedelta(days=365)
    assert 'year ago' in time_since(years_ago)

    # Test with None
    assert time_since(None) == ''
