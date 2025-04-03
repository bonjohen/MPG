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
        '/game/api/create_session',
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
        from app.models.user import User
        user = User.query.filter_by(username='testuser').first()
        session = GameSession.query.filter_by(player1_id=user.id).first()
        assert session is not None
        assert session.status == 'waiting'
        assert session.player2_id is None


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
        '/game/api/join_session',
        json={'session_id': session_id}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True

    # Check that the user was added to the session
    with app.app_context():
        session = GameSession.query.get(session_id)
        assert session is not None
        assert session.player2_id is not None
        assert session.status == 'playing'


def test_update_avatar(client, auth, app):
    """Test updating user's avatar."""
    # Login
    auth.login()

    # Create test avatars
    with app.app_context():
        from app.models.avatar import Avatar

        # Check if avatars already exist
        if not Avatar.query.first():
            avatars = [
                Avatar(name='Default', image_path='default.png'),
                Avatar(name='Boxer', image_path='boxer.png'),
                Avatar(name='Wizard', image_path='wizard.png'),
                Avatar(name='Ninja', image_path='ninja.png')
            ]
            db.session.add_all(avatars)
            db.session.commit()

        # Get the first avatar
        avatar = Avatar.query.first()
        avatar_id = avatar.id

    # Update the user's avatar
    response = client.post(
        '/game/api/update_avatar',
        json={'avatar_id': avatar_id}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True

    # Check that the user's avatar was updated
    with app.app_context():
        from app.models.user import User
        user = User.query.filter_by(username='testuser').first()
        assert user is not None
        assert user.avatar_id == avatar_id


def test_socket_events(client, auth, app):
    """Test socket.io event handlers."""
    # This is a basic test to improve coverage
    # In a real application, you would use a socket.io client to test these events

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

    # Test WebRTC signaling endpoints
    # These are normally called by socket.io, but we can test them directly
    # to improve coverage

    # Test call-user endpoint
    with app.test_client() as test_client:
        with test_client.session_transaction() as sess:
            sess['_user_id'] = 1  # Set the user ID in the session

        response = test_client.post(
            '/game/api/call-user',
            json={
                'to': 'user123',
                'offer': {'type': 'offer', 'sdp': 'test-sdp'}
            }
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True

    # Test make-answer endpoint
    with app.test_client() as test_client:
        with test_client.session_transaction() as sess:
            sess['_user_id'] = 1  # Set the user ID in the session

        response = test_client.post(
            '/game/api/make-answer',
            json={
                'to': 'user123',
                'answer': {'type': 'answer', 'sdp': 'test-sdp'}
            }
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True

    # Test ice-candidate endpoint
    with app.test_client() as test_client:
        with test_client.session_transaction() as sess:
            sess['_user_id'] = 1  # Set the user ID in the session

        response = test_client.post(
            '/game/api/ice-candidate',
            json={
                'to': 'user123',
                'candidate': {'candidate': 'test-candidate', 'sdpMid': 'test-mid', 'sdpMLineIndex': 0}
            }
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
