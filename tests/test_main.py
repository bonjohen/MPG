"""
Tests for the main routes.
"""
import pytest


def test_index(client):
    """Test the index page."""
    response = client.get('/')
    assert response.status_code == 200
    assert b'Motion Powered Games' in response.data
    assert b'Enter a realm where your movements wield power' in response.data


def test_about(client):
    """Test the about page."""
    response = client.get('/about')
    assert response.status_code == 200
    assert b'About Us' in response.data
    assert b'Motion Powered Games aims to revolutionize online gaming' in response.data


def test_profile_redirect_if_not_logged_in(client):
    """Test that the profile page redirects if not logged in."""
    response = client.get('/profile')
    assert response.status_code == 302  # Redirect to login
    
    # Follow the redirect
    response = client.get('/profile', follow_redirects=True)
    assert response.status_code == 200
    assert b'Login' in response.data


def test_profile_when_logged_in(client, auth):
    """Test the profile page when logged in."""
    # Login
    auth.login()
    
    # Access the profile page
    response = client.get('/profile')
    assert response.status_code == 200
    assert b'Profile' in response.data
    assert b'testuser' in response.data
    assert b'test@example.com' in response.data
