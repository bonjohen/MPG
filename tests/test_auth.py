"""
Tests for the authentication routes.
"""
import pytest
from flask import session, g
from app.models.user import User


def test_register(client):
    """Test user registration."""
    # Access the registration page
    response = client.get('/auth/register')
    assert response.status_code == 200
    assert b'Register' in response.data

    # Register a new user
    response = client.post(
        '/auth/register',
        data={
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'password123',
            'confirm_password': 'password123'
        },
        follow_redirects=True
    )

    # Check that the registration was successful
    assert response.status_code == 200
    assert b'Your account has been created! You can now log in.' in response.data
    assert b'Login' in response.data


def test_register_validation(client):
    """Test user registration validation."""
    # Test with existing username
    response = client.post(
        '/auth/register',
        data={
            'username': 'testuser',  # Existing username
            'email': 'unique@example.com',
            'password': 'password123',
            'confirm_password': 'password123'
        },
        follow_redirects=True
    )
    assert b'That username is already taken' in response.data

    # Test with existing email
    response = client.post(
        '/auth/register',
        data={
            'username': 'uniqueuser',
            'email': 'test@example.com',  # Existing email
            'password': 'password123',
            'confirm_password': 'password123'
        },
        follow_redirects=True
    )
    assert b'That email is already registered' in response.data

    # Test with mismatched passwords
    response = client.post(
        '/auth/register',
        data={
            'username': 'uniqueuser',
            'email': 'unique@example.com',
            'password': 'password123',
            'confirm_password': 'different'
        },
        follow_redirects=True
    )
    assert b'Passwords must match' in response.data

    # Test with short password
    response = client.post(
        '/auth/register',
        data={
            'username': 'uniqueuser',
            'email': 'unique@example.com',
            'password': 'short',
            'confirm_password': 'short'
        },
        follow_redirects=True
    )
    assert b'Password must be at least 8 characters long' in response.data


def test_login(client, auth):
    """Test user login."""
    # Access the login page
    response = client.get('/auth/login')
    assert response.status_code == 200
    assert b'Login' in response.data

    # Login with correct credentials
    response = auth.login()
    assert response.status_code == 302  # Redirect after login

    # Follow the redirect
    response = client.get('/', follow_redirects=True)
    assert response.status_code == 200
    assert b'Logout' in response.data  # User is logged in

    # Check that the user is in the session
    with client:
        client.get('/')
        assert session.get('_user_id') is not None


def test_login_validation(client):
    """Test login validation."""
    # Test with non-existent username
    response = client.post(
        '/auth/login',
        data={
            'username': 'nonexistentuser',
            'password': 'password'
        },
        follow_redirects=True
    )
    assert b'Login unsuccessful. Please check username and password' in response.data

    # Test with incorrect password
    response = client.post(
        '/auth/login',
        data={
            'username': 'testuser',
            'password': 'wrongpassword'
        },
        follow_redirects=True
    )
    assert b'Login unsuccessful. Please check username and password' in response.data


def test_logout(client, auth):
    """Test user logout."""
    # Login
    auth.login()

    # Logout
    with client:
        response = auth.logout()
        assert response.status_code == 302  # Redirect after logout

        # Check that the user is no longer in the session
        assert '_user_id' not in session


def test_reset_password_request(client, app):
    """Test password reset request."""
    # Access the reset password request page
    response = client.get('/auth/reset_password')
    assert response.status_code == 200
    assert b'Reset Password' in response.data

    # Submit a reset request for an existing email
    response = client.post(
        '/auth/reset_password',
        data={'email': 'test@example.com'},
        follow_redirects=True
    )
    assert response.status_code == 200
    assert b'A password reset link has been sent to your email. For development:' in response.data

    # Check that a token was generated
    with app.app_context():
        user = User.query.filter_by(email='test@example.com').first()
        assert user.reset_token is not None
        assert user.reset_token_expiration is not None

    # Submit a reset request for a non-existent email
    response = client.post(
        '/auth/reset_password',
        data={'email': 'nonexistent@example.com'},
        follow_redirects=True
    )
    assert response.status_code == 200
    # Should redirect to login page
    assert b'Login' in response.data


def test_reset_password_token(client, app):
    """Test password reset with token."""
    # Generate a reset token
    with app.app_context():
        user = User.query.filter_by(email='test@example.com').first()
        token = user.generate_reset_token()

    # Access the reset password page with the token
    response = client.get(f'/auth/reset_password/{token}')
    assert response.status_code == 200
    assert b'Reset Password' in response.data

    # Reset the password
    response = client.post(
        f'/auth/reset_password/{token}',
        data={
            'password': 'newpassword',
            'confirm_password': 'newpassword'
        },
        follow_redirects=True
    )
    assert response.status_code == 200
    assert b'Your password has been updated' in response.data

    # Check that the token was cleared
    with app.app_context():
        user = User.query.filter_by(email='test@example.com').first()
        assert user.reset_token is None
        assert user.reset_token_expiration is None

    # Login with the new password
    response = client.post(
        '/auth/login',
        data={
            'username': 'testuser',
            'password': 'newpassword'
        },
        follow_redirects=True
    )
    assert response.status_code == 200
    assert b'Logout' in response.data  # User is logged in


def test_reset_password_invalid_token(client):
    """Test password reset with invalid token."""
    # Access the reset password page with an invalid token
    response = client.get('/auth/reset_password/invalid-token')
    assert response.status_code == 302  # Redirect

    # Follow the redirect
    response = client.get('/auth/reset_password/invalid-token', follow_redirects=True)
    assert response.status_code == 200
    assert b'That is an invalid or expired token' in response.data
