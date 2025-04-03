"""
Date and time utility functions.
"""
from datetime import datetime


def format_datetime(dt, format_string='%B %d, %Y %I:%M %p'):
    """
    Format a datetime object as a string.
    
    Args:
        dt (datetime): The datetime object to format.
        format_string (str): The format string to use.
        
    Returns:
        str: The formatted datetime string, or an empty string if dt is None.
    """
    if dt is None:
        return ''
    
    return dt.strftime(format_string)


def time_since(dt):
    """
    Calculate the time elapsed since a datetime.
    
    Args:
        dt (datetime): The datetime to calculate the time since.
        
    Returns:
        str: A human-readable string representing the time elapsed,
             or an empty string if dt is None.
    """
    if dt is None:
        return ''
    
    now = datetime.now()
    diff = now - dt
    
    seconds = diff.total_seconds()
    
    if seconds < 60:
        return f"{int(seconds)} seconds ago"
    
    minutes = seconds // 60
    if minutes < 60:
        return f"{int(minutes)} minutes ago"
    
    hours = minutes // 60
    if hours < 24:
        return f"{int(hours)} hours ago"
    
    days = diff.days
    if days < 7:
        return f"{days} days ago"
    
    weeks = days // 7
    if weeks < 4:
        return f"{int(weeks)} weeks ago"
    
    months = days // 30
    if months < 12:
        return f"{int(months)} months ago"
    
    years = days // 365
    return f"{int(years)} year{'s' if years > 1 else ''} ago"
