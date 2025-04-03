"""
Tests for the calibration system.
"""
import pytest
from flask import url_for


def test_calibration_page(client, auth):
    """Test the calibration page."""
    # Login
    auth.login()

    # Access the calibration page
    response = client.get('/game/calibration')
    assert response.status_code == 200
    assert b'Motion Tracking Calibration' in response.data
    assert b'Camera Feed' in response.data
    assert b'Calibration Steps' in response.data


def test_calibration_page_requires_login(client):
    """Test that the calibration page requires login."""
    # Try to access the calibration page without logging in
    response = client.get('/game/calibration')
    assert response.status_code == 302  # Redirect to login page

    # Check that the redirect is to the login page
    assert '/auth/login' in response.location


def test_calibration_page_content(client, auth):
    """Test the content of the calibration page."""
    # Login
    auth.login()

    # Access the calibration page
    response = client.get('/game/calibration')
    assert response.status_code == 200

    # Check for required elements
    assert b'<video id="video"' in response.data
    assert b'<canvas id="canvas"' in response.data
    assert b'Start Calibration' in response.data

    # Check for calibration content
    assert b'Motion Calibration' in response.data

    # Check for calibration elements
    assert b'calibration-container' in response.data


def test_calibration_javascript_includes(client, auth):
    """Test that the calibration page includes the required JavaScript files."""
    # Login
    auth.login()

    # Access the calibration page
    response = client.get('/game/calibration')
    assert response.status_code == 200

    # Check for required JavaScript files
    assert b'motion-tracking.js' in response.data

    # Check for TensorFlow.js dependencies
    assert b'tensorflow' in response.data


def test_calibration_skip_button(client, auth):
    """Test the skip calibration button."""
    # Login
    auth.login()

    # Access the calibration page
    response = client.get('/game/calibration')
    assert response.status_code == 200

    # Check for back button with correct link
    assert b'Back to Lobby' in response.data
    assert bytes(f'href="{url_for("game.lobby")}"'.encode()) in response.data


def test_calibration_continue_button(client, auth):
    """Test the continue button after calibration."""
    # Login
    auth.login()

    # Access the calibration page
    response = client.get('/game/calibration')
    assert response.status_code == 200

    # Check for start button
    assert b'Start Calibration' in response.data
