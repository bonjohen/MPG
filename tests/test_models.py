"""
Tests for the models.
"""
import pytest
from datetime import datetime
from app.models.avatar import Avatar
from app.models.game_session import GameSession
from app import db


def test_avatar_model(app):
    """Test the Avatar model."""
    with app.app_context():
        # Create a new avatar
        avatar = Avatar(
            name='Test Avatar',
            image_path='test.png',
            description='A test avatar'
        )
        db.session.add(avatar)
        db.session.commit()

        # Retrieve the avatar from the database
        retrieved_avatar = Avatar.query.filter_by(name='Test Avatar').first()

        # Check that the avatar attributes are set correctly
        assert retrieved_avatar is not None
        assert retrieved_avatar.name == 'Test Avatar'
        assert retrieved_avatar.image_path == 'test.png'
        assert retrieved_avatar.description == 'A test avatar'


def test_game_session_model(app):
    """Test the GameSession model."""
    with app.app_context():
        # Get the test user
        user = db.session.execute(db.select(db.Model.metadata.tables['users']).where(
            db.Model.metadata.tables['users'].c.username == 'testuser'
        )).fetchone()

        # Create a new game session
        session = GameSession(
            player1_id=user.id,
            status='waiting'
        )
        db.session.add(session)
        db.session.commit()

        # Retrieve the session from the database
        retrieved_session = GameSession.query.filter_by(player1_id=user.id).first()

        # Check that the session attributes are set correctly
        assert retrieved_session is not None
        assert retrieved_session.player1_id == user.id
        assert retrieved_session.status == 'waiting'
        assert retrieved_session.created_at is not None


def test_game_session_to_dict(app):
    """Test the to_dict method of the GameSession model."""
    with app.app_context():
        # Get the test user
        user = db.session.execute(db.select(db.Model.metadata.tables['users']).where(
            db.Model.metadata.tables['users'].c.username == 'testuser'
        )).fetchone()

        # Create a new game session
        session = GameSession(
            player1_id=user.id,
            status='waiting'
        )
        db.session.add(session)
        db.session.commit()

        # Convert the session to a dictionary
        session_dict = session.to_dict()

        # Check that the dictionary contains the expected keys and values
        assert session_dict['id'] == session.id
        assert session_dict['player1_id'] == user.id
        assert session_dict['status'] == 'waiting'
        assert 'created_at' in session_dict


def test_game_session_join_leave(app):
    """Test joining and leaving a game session."""
    with app.app_context():
        # Get the test user
        user = db.session.execute(db.select(db.Model.metadata.tables['users']).where(
            db.Model.metadata.tables['users'].c.username == 'testuser'
        )).fetchone()

        # Create a new game session
        session = GameSession(
            player1_id=user.id,
            status='waiting'
        )
        db.session.add(session)
        db.session.commit()

        # Add player 2
        session.player2_id = user.id
        db.session.commit()

        # Check that player 2 was added
        assert session.player2_id == user.id

        # Remove player 2
        session.player2_id = None
        db.session.commit()

        # Check that player 2 was removed
        assert session.player2_id is None


def test_game_session_to_dict(app):
    """Test converting a game session to a dictionary."""
    with app.app_context():
        # Get the test user
        user = db.session.execute(db.select(db.Model.metadata.tables['users']).where(
            db.Model.metadata.tables['users'].c.username == 'testuser'
        )).fetchone()

        # Create a new game session
        session = GameSession(
            player1_id=user.id,
            status='waiting'
        )
        db.session.add(session)
        db.session.commit()

        # Convert the session to a dictionary
        session_dict = session.to_dict()

        # Check that the dictionary contains the expected keys and values
        assert session_dict['id'] == session.id
        assert session_dict['player1_id'] == user.id
        assert session_dict['status'] == 'waiting'
        assert 'created_at' in session_dict

        # Test with more fields populated
        session.player2_id = user.id
        session.status = 'playing'
        session.started_at = datetime.now()
        session.player1_score = 10
        session.player2_score = 5
        db.session.commit()

        # Convert the updated session to a dictionary
        updated_dict = session.to_dict()

        # Check the updated values
        assert updated_dict['player2_id'] == user.id
        assert updated_dict['status'] == 'playing'
        assert updated_dict['player1_score'] == 10
        assert updated_dict['player2_score'] == 5
        assert 'started_at' in updated_dict

        # Test with a completed game
        session.status = 'completed'
        session.ended_at = datetime.now()
        session.winner_id = user.id
        db.session.commit()

        # Convert the completed session to a dictionary
        completed_dict = session.to_dict()

        # Check the completed game values
        assert completed_dict['status'] == 'completed'
        assert completed_dict['winner_id'] == user.id
        assert 'ended_at' in completed_dict
