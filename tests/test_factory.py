"""
Tests for the application factory.
"""
import pytest
from app import create_app, db
from config import TestingConfig


def test_config():
    """Test that the app is created with the correct configuration."""
    # Test with testing config
    app = create_app(TestingConfig)
    assert app.config['TESTING'] is True
    assert app.config['WTF_CSRF_ENABLED'] is False
    assert 'sqlite://' in app.config['SQLALCHEMY_DATABASE_URI']

    # Test with development config
    app = create_app('development')
    assert app.config['DEBUG'] is True
    assert 'sqlite:///dev.db' in app.config['SQLALCHEMY_DATABASE_URI']

    # Test with production config
    app = create_app('production')
    assert app.config['DEBUG'] is False
    assert 'sqlite:///prod.db' in app.config['SQLALCHEMY_DATABASE_URI']

    # Test with default config
    app = create_app()
    assert app.config['DEBUG'] is True
    assert 'sqlite:///dev.db' in app.config['SQLALCHEMY_DATABASE_URI']


def test_db_initialization():
    """Test that the database is initialized correctly."""
    app = create_app(TestingConfig)
    with app.app_context():
        # Check that the database tables exist
        tables = db.inspect(db.engine).get_table_names()
        assert 'users' in tables
        assert 'avatars' in tables
        assert 'game_sessions' in tables


def test_blueprints_registered():
    """Test that the blueprints are registered correctly."""
    app = create_app(TestingConfig)

    # Check that the blueprints are registered
    assert 'main' in app.blueprints
    assert 'auth' in app.blueprints
    assert 'game' in app.blueprints

    # Check that the blueprints have the correct names
    assert app.blueprints['auth'].name == 'auth'
    assert app.blueprints['game'].name == 'game'


def test_error_handlers():
    """Test that the error handlers are registered correctly."""
    app = create_app(TestingConfig)

    # Check that the error handlers are registered
    assert app.error_handler_spec[None][404] is not None
    assert app.error_handler_spec[None][500] is not None
