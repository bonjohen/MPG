"""
Test configuration and fixtures for pytest.
"""
import os
import tempfile
import pytest
from app import create_app, db
from app.models.user import User
from app.models.avatar import Avatar
from app.models.game_session import GameSession
from config import TestingConfig


@pytest.fixture
def app():
    """Create and configure a Flask app for testing."""
    # Create a temporary file to isolate the database for each test
    db_fd, db_path = tempfile.mkstemp()

    # Create the app with the test configuration
    app = create_app(TestingConfig)
    app.config.update({
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path}',
        'TESTING': True,
        'WTF_CSRF_ENABLED': False,
        'AUTO_LOGIN_ENABLED': False,  # Disable auto-login for tests
    })

    # Create the database and the database tables
    with app.app_context():
        db.create_all()

        # Create test data
        _create_test_data()

    yield app

    # Close and remove the temporary database
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """A test CLI runner for the app."""
    return app.test_cli_runner()


@pytest.fixture
def auth(client):
    """Authentication helper for tests."""
    return AuthActions(client)


class AuthActions:
    """Helper class for authentication actions in tests."""

    def __init__(self, client):
        self._client = client

    def login(self, email='test@example.com', password='password'):
        """Log in as the test user."""
        return self._client.post(
            '/auth/login',
            data={'email': email, 'password': password}
        )

    def logout(self):
        """Log out the current user."""
        return self._client.get('/auth/logout')


def _create_test_data():
    """Create test data for the database."""
    from app import bcrypt

    # Check if test user already exists
    test_user = User.query.filter_by(username='testuser').first()
    if not test_user:
        # Create test user
        hashed_password = bcrypt.generate_password_hash('password').decode('utf-8')
        test_user = User(
            username='testuser',
            email='test@example.com',
            password_hash=hashed_password
        )
        db.session.add(test_user)

    # Check if admin user already exists
    admin_user = User.query.filter_by(username='admin').first()
    if not admin_user:
        # Create test admin user
        hashed_password = bcrypt.generate_password_hash('password').decode('utf-8')
        admin_user = User(
            username='admin',
            email='admin@example.com',
            password_hash=hashed_password
        )
        db.session.add(admin_user)

    # Create test avatars
    avatars = [
        Avatar(name='Default', image_path='default.png'),
        Avatar(name='Boxer', image_path='boxer.png'),
        Avatar(name='Wizard', image_path='wizard.png'),
        Avatar(name='Ninja', image_path='ninja.png')
    ]
    for avatar in avatars:
        db.session.add(avatar)

    # Skip creating a game session for now to avoid issues
    # We'll create game sessions in the specific tests that need them

    db.session.commit()
