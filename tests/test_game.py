"""
Tests for the game routes.
"""
import pytest
from app.models.game_session import GameSession
from app import db


def test_lobby_redirect_if_not_logged_in(client):
    """Test that the lobby page redirects if not logged in."""
    response = client.get('/game/lobby')
    assert response.status_code == 302  # Redirect to login

    # Follow the redirect
    response = client.get('/game/lobby', follow_redirects=True)
    assert response.status_code == 200
    assert b'Login' in response.data


def test_lobby_when_logged_in(client, auth):
    """Test the lobby page when logged in."""
    # Login
    auth.login()

    # Access the lobby page
    response = client.get('/game/lobby')
    assert response.status_code == 200
    assert b'Game Lobby' in response.data
    assert b'Available Games' in response.data
    assert b'Create New Game' in response.data


def test_calibration_redirect_if_not_logged_in(client):
    """Test that the calibration page redirects if not logged in."""
    response = client.get('/game/calibration')
    assert response.status_code == 302  # Redirect to login

    # Follow the redirect
    response = client.get('/game/calibration', follow_redirects=True)
    assert response.status_code == 200
    assert b'Login' in response.data


def test_calibration_when_logged_in(client, auth):
    """Test the calibration page when logged in."""
    # Login
    auth.login()

    # Access the calibration page
    response = client.get('/game/calibration')
    assert response.status_code == 200
    assert b'Motion Calibration' in response.data
    assert b'Start Calibration' in response.data


def test_avatars_redirect_if_not_logged_in(client):
    """Test that the avatars page redirects if not logged in."""
    response = client.get('/game/avatars')
    assert response.status_code == 302  # Redirect to login

    # Follow the redirect
    response = client.get('/game/avatars', follow_redirects=True)
    assert response.status_code == 200
    assert b'Login' in response.data


def test_avatars_when_logged_in(client, auth):
    """Test the avatars page when logged in."""
    # Login
    auth.login()

    # Access the avatars page
    response = client.get('/game/avatars')
    assert response.status_code == 200
    assert b'Avatar Selection' in response.data


def test_create_game_session(client, auth, app):
    """Test creating a game session."""
    # Login
    auth.login()

    # Create a game session
    response = client.post(
        '/game/create_session',
        json={
            'player2_id': None,
            'status': 'waiting'
        }
    )
    assert response.status_code == 200
    data = response.get_json()
    assert 'session_id' in data

    # Check that the session was created in the database
    with app.app_context():
        session = GameSession.query.filter_by(name='Test Game').first()
        assert session is not None
        assert session.game_type == 'boxing'
        assert session.max_players == 2
        assert not session.is_private


def test_join_game_session(client, auth, app):
    """Test joining a game session."""
    # Login
    auth.login()

    # Create a game session
    with app.app_context():
        user = db.session.execute(db.select(db.Model.metadata.tables['users']).where(
            db.Model.metadata.tables['users'].c.username == 'testuser'
        )).fetchone()

        session = GameSession(
            player1_id=user.id,
            status='waiting'
        )
        db.session.add(session)
        db.session.commit()
        session_id = session.id

    # Join the game session
    response = client.post(
        '/game/join_session',
        json={'session_id': session_id}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True

    # Check that the user was added to the session
    with app.app_context():
        session = GameSession.query.get(session_id)
        assert session is not None
        assert session.current_players == 1
