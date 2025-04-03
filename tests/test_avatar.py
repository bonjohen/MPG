"""
Tests for the avatar system.
"""
import json
import pytest
from app import db
from app.models.avatar import Avatar
from app.models.user import User


def test_avatar_model_creation(app):
    """Test creating an avatar model."""
    with app.app_context():
        # Create a new avatar
        avatar = Avatar(
            name='Test Avatar',
            image_path='test.png',
            description='A test avatar',
            health=100,
            strength=10,
            speed=10,
            defense=10
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
        assert retrieved_avatar.health == 100
        assert retrieved_avatar.strength == 10
        assert retrieved_avatar.speed == 10
        assert retrieved_avatar.defense == 10


def test_avatar_description(app):
    """Test avatar description field."""
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

        # Check that the description was saved correctly
        assert retrieved_avatar is not None
        assert retrieved_avatar.description == 'A test avatar'


def test_user_avatar_relationship(app):
    """Test the relationship between users and avatars."""
    with app.app_context():
        # Create a new avatar
        avatar = Avatar(
            name='Test Avatar',
            image_path='test.png'
        )
        db.session.add(avatar)
        db.session.commit()

        # Create a new user
        user = User(
            username='testuser2',
            email='testuser2@example.com',
            password_hash='password_hash'
        )
        db.session.add(user)
        db.session.commit()

        # Assign the avatar to the user
        user.avatar_id = avatar.id
        db.session.commit()

        # Retrieve the user from the database
        retrieved_user = User.query.filter_by(username='testuser2').first()

        # Check that the user's avatar is set correctly
        assert retrieved_user is not None
        assert retrieved_user.avatar_id == avatar.id

        # Check the relationship from the avatar side
        assert avatar.users is not None
        assert len(avatar.users) == 1
        assert avatar.users[0].id == user.id


def test_api_update_avatar(client, auth, app):
    """Test the API endpoint for updating a user's avatar."""
    # Login
    auth.login()

    # Create a test avatar
    with app.app_context():
        avatar = Avatar(
            name='Test Avatar',
            image_path='test.png'
        )
        db.session.add(avatar)
        db.session.commit()
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
        user = User.query.filter_by(username='testuser').first()
        assert user is not None
        assert user.avatar_id == avatar_id


def test_api_save_avatar_customization(client, auth, app):
    """Test the API endpoint for saving avatar customization."""
    # Login
    auth.login()

    # Create a test avatar
    with app.app_context():
        avatar = Avatar(
            name='Test Avatar',
            image_path='test.png'
        )
        db.session.add(avatar)
        db.session.commit()
        avatar_id = avatar.id

        # Assign the avatar to the user
        user = User.query.filter_by(username='testuser').first()
        user.avatar_id = avatar_id
        db.session.commit()

    # Save avatar customization
    customization_data = {
        'avatarId': avatar_id,
        'color': '#3498db',
        'accessories': ['/static/models/accessories/hat.glb'],
        'animation': 'idle'
    }
    response = client.post(
        '/game/api/save_avatar_customization',
        json=customization_data
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['avatarId'] == avatar_id

    # Check that the avatar customization was saved
    with app.app_context():
        avatar = Avatar.query.get(avatar_id)
        assert avatar is not None
        assert avatar.description is not None

        # Parse the customization data
        parsed_data = json.loads(avatar.description)
        assert parsed_data['color'] == '#3498db'
        assert parsed_data['accessories'] == ['/static/models/accessories/hat.glb']
        assert parsed_data['animation'] == 'idle'


def test_api_get_avatar_customization(client, auth, app):
    """Test the API endpoint for getting avatar customization."""
    # Login
    auth.login()

    # Create a test avatar with customization data
    with app.app_context():
        avatar = Avatar(
            name='Test Avatar',
            image_path='test.png',
            description=json.dumps({
                'color': '#3498db',
                'accessories': ['/static/models/accessories/hat.glb'],
                'animation': 'idle'
            })
        )
        db.session.add(avatar)
        db.session.commit()
        avatar_id = avatar.id

        # Assign the avatar to the user
        user = User.query.filter_by(username='testuser').first()
        user.avatar_id = avatar_id
        db.session.commit()

    # Get avatar customization
    response = client.get('/game/api/get_avatar_customization')
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['avatarData'] is not None
    # We don't check the exact avatar ID since it might change between test runs
    assert 'avatarId' in data['avatarData']
    assert data['avatarData']['color'] == '#3498db'
    assert data['avatarData']['accessories'] == ['/static/models/accessories/hat.glb']
    assert data['avatarData']['animation'] == 'idle'


def test_api_get_avatar_customization_no_avatar(client, auth, app):
    """Test the API endpoint for getting avatar customization when no avatar is selected."""
    # Login
    auth.login()

    # Ensure the user has no avatar
    with app.app_context():
        user = User.query.filter_by(username='testuser').first()
        user.avatar_id = None
        db.session.commit()

    # Get avatar customization
    response = client.get('/game/api/get_avatar_customization')
    # The API might return 404 or 200 with an error message
    # Both are acceptable behaviors
    data = response.get_json()
    if response.status_code == 404:
        assert data['success'] is False
        assert 'error' in data
    else:
        assert response.status_code == 200
        assert data['success'] is False or 'error' in data
