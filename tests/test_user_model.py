"""
Tests for the User model.
"""
import pytest
from datetime import datetime, timedelta
from app.models.user import User
from app import db, bcrypt


def test_new_user(app):
    """Test creating a new user."""
    # Create a new user
    import uuid
    unique_id = str(uuid.uuid4())[:8]
    user = User(
        username=f'testuser_{unique_id}',
        email=f'test_{unique_id}@example.com',
        password_hash=bcrypt.generate_password_hash('password').decode('utf-8')
    )

    # Check that the user attributes are set correctly
    assert user.username.startswith('testuser_')
    assert user.email.endswith('@example.com')
    assert user.password_hash is not None
    assert user.password_hash != 'password'  # Password should be hashed
    # Note: created_at and last_seen are set in __init__ in a real app
    # but in tests they might be None until the user is added to the session

    # Add the user to the database to initialize default values
    with app.app_context():
        db.session.add(user)
        db.session.commit()

        # Now check the default values
        assert user.wins == 0
        assert user.losses == 0
        assert user.draws == 0
        assert user.reset_token is None
        assert user.reset_token_expiration is None


def test_password_hashing():
    """Test password hashing and verification."""
    user = User(username='testuser3', email='test3@example.com')

    # Set the password
    user.password_hash = bcrypt.generate_password_hash('password').decode('utf-8')

    # Check that the password is hashed
    assert user.password_hash != 'password'

    # Check that the password can be verified
    assert bcrypt.check_password_hash(user.password_hash, 'password')
    assert not bcrypt.check_password_hash(user.password_hash, 'wrongpassword')


def test_reset_token(app):
    """Test password reset token generation and verification."""
    with app.app_context():
        hashed_password = bcrypt.generate_password_hash('password').decode('utf-8')
        user = User(username='testuser4', email='test4@example.com', password_hash=hashed_password)
        db.session.add(user)
        db.session.commit()

        # Generate a reset token
        token = user.generate_reset_token()

        # Check that the token is set
        assert user.reset_token is not None
        assert user.reset_token_expiration is not None
        assert user.reset_token == token

        # Check that the token can be verified
        assert user.verify_reset_token(token)

        # Check that an invalid token is rejected
        assert not user.verify_reset_token('invalid-token')

        # Check that an expired token is rejected
        user.reset_token_expiration = datetime.now() - timedelta(hours=2)
        db.session.commit()
        assert not user.verify_reset_token(token)

        # Clear the token
        user.clear_reset_token()
        assert user.reset_token is None
        assert user.reset_token_expiration is None

        # Clean up
        db.session.delete(user)
        db.session.commit()


def test_update_last_seen(app):
    """Test updating the last_seen timestamp."""
    with app.app_context():
        # Get the test user
        user = User.query.filter_by(username='testuser').first()

        # Store the original last_seen timestamp
        original_last_seen = user.last_seen

        # Wait a moment to ensure the timestamp changes
        import time
        time.sleep(0.1)

        # Update the last_seen timestamp
        user.update_last_seen()

        # Check that the timestamp was updated
        assert user.last_seen > original_last_seen


def test_get_user_by_email(app):
    """Test getting a user by email."""
    with app.app_context():
        # Get the test user by email
        user = User.get_user_by_email('test@example.com')

        # Check that the user was found
        assert user is not None
        assert user.username == 'testuser'

        # Check that a non-existent email returns None
        assert User.get_user_by_email('nonexistent@example.com') is None
