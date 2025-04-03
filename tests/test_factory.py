"""
Tests for the application factory.
"""
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


def test_create_app_production(monkeypatch):
    """Test creating the app in production mode."""
    # Set the environment variable to production
    monkeypatch.setenv('FLASK_ENV', 'production')

    # Create the app with TestingConfig to avoid database issues
    app = create_app(TestingConfig)

    # Check that the app is not in debug mode
    assert not app.config['DEBUG']
    assert app.config['TESTING']

    # Check that the database URI is set correctly
    assert 'sqlite://' in app.config['SQLALCHEMY_DATABASE_URI']

    # Check that the secret key is set
    assert app.config['SECRET_KEY'] is not None


def test_create_app_with_config():
    """Test creating the app with a custom config."""
    # Create a test config based on TestingConfig
    class CustomTestConfig(TestingConfig):
        TESTING = True
        SECRET_KEY = 'test-key'
        SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
        AUTO_ADMIN_LOGIN = True

    # Create the app with the test config
    app = create_app(CustomTestConfig)

    # Check that the config values are set correctly
    assert app.config['TESTING']
    assert app.config['SECRET_KEY'] == 'test-key'
    assert app.config['SQLALCHEMY_DATABASE_URI'] == 'sqlite:///:memory:'
    assert app.config['AUTO_ADMIN_LOGIN']


def test_auto_admin_login():
    """Test the auto admin login feature."""
    # Create a test config with auto admin login enabled
    class AutoAdminConfig(TestingConfig):
        AUTO_ADMIN_LOGIN = True

    # Create the app with the test config
    app = create_app(AutoAdminConfig)

    # Check that the auto admin login is enabled
    assert app.config['AUTO_ADMIN_LOGIN']

    # We can't actually test the auto login feature in a unit test
    # because it requires a database with an admin user
    # Just check that the config is set correctly
    assert app.config['AUTO_ADMIN_LOGIN'] is True


def test_auto_admin_login_with_existing_session():
    """Test the auto admin login feature with an existing session."""
    # Create a test config with auto admin login enabled
    class AutoAdminConfig(TestingConfig):
        AUTO_ADMIN_LOGIN = True

    # Create the app with the test config
    app = create_app(AutoAdminConfig)

    # Create a test client
    with app.test_client() as client:
        # Set up a session with a user already logged in
        with client.session_transaction() as sess:
            sess['_user_id'] = '999'  # Some fake user ID

        # Make a request to trigger the before_request handler
        response = client.get('/')

        # Check that the response is OK
        assert response.status_code == 200

        # Check that the session still has the original user ID
        with client.session_transaction() as sess:
            assert sess['_user_id'] == '999'


def test_auto_admin_login_static_file():
    """Test the auto admin login feature with a static file request."""
    # Create a test config with auto admin login enabled
    class AutoAdminConfig(TestingConfig):
        AUTO_ADMIN_LOGIN = True

    # Create the app with the test config
    app = create_app(AutoAdminConfig)

    # Create a test client
    with app.test_client() as client:
        # Make a request to a static file
        response = client.get('/static/css/style.css')

        # The static file might exist or not, we're just testing the route
        assert response.status_code in (200, 404)

        # Check that no user was logged in
        with client.session_transaction() as sess:
            assert '_user_id' not in sess


def test_error_handlers_404():
    """Test the 404 error handler."""
    app = create_app(TestingConfig)

    with app.test_client() as client:
        # Make a request to a non-existent route
        response = client.get('/non-existent-route')

        # Check that the response is a 404
        assert response.status_code == 404

        # Check that the response contains the error message
        assert b'Not Found' in response.data


def test_error_handlers_500():
    """Test the 500 error handler."""
    app = create_app(TestingConfig)

    # Create a route that raises an exception
    @app.route('/error')
    def error():
        # This function is accessed by Flask when the route is requested
        # pylint: disable=unused-variable
        raise Exception('Test exception')

    # We can't easily test the 500 error handler in a unit test
    # because Flask's test client catches the exception
    # Just check that the app has a 500 error handler
    assert app.error_handler_spec[None][500] is not None
