from flask import Flask, session
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user
from flask_bcrypt import Bcrypt
from config import config

# Initialize extensions
db = SQLAlchemy()
socketio = SocketIO()
login_manager = LoginManager()
bcrypt = Bcrypt()

def create_app(config_name='development'):
    """
    Application factory function to create and configure the Flask app
    """
    app = Flask(__name__)

    # Handle both string config names and direct config objects
    if isinstance(config_name, str):
        app.config.from_object(config[config_name])
    else:
        app.config.from_object(config_name)

    # Initialize extensions with app
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    bcrypt.init_app(app)

    # Import models to ensure they are registered with SQLAlchemy
    from app.models import user, avatar, game_session

    # Register blueprints
    from app.routes.main import main as main_blueprint
    app.register_blueprint(main_blueprint)

    from app.routes.auth import auth as auth_blueprint
    app.register_blueprint(auth_blueprint, url_prefix='/auth')

    from app.routes.game import game as game_blueprint
    app.register_blueprint(game_blueprint, url_prefix='/game')

    # Create database tables if they don't exist
    with app.app_context():
        db.create_all()

        # Create and log in admin user if auto-login is enabled
        if app.config.get('AUTO_LOGIN_ENABLED', False):
            create_and_login_admin(app)

    return app

def create_and_login_admin(app):
    """
    Create an admin user if it doesn't exist and automatically log them in
    """
    from app.models.user import User
    from flask import request, g

    with app.app_context():
        # Check if admin user exists
        admin_username = app.config.get('AUTO_LOGIN_USERNAME', 'admin')
        admin_email = app.config.get('AUTO_LOGIN_EMAIL', 'admin@example.com')
        admin_password = app.config.get('AUTO_LOGIN_PASSWORD', 'admin')

        admin = User.query.filter_by(username=admin_username).first()

        # Create admin user if it doesn't exist
        if not admin:
            hashed_password = bcrypt.generate_password_hash(admin_password).decode('utf-8')
            admin = User(username=admin_username, email=admin_email, password_hash=hashed_password)
            db.session.add(admin)
            db.session.commit()
            print(f"Created admin user: {admin_username}")

        # Set up automatic login for the admin user
        @app.before_request
        def auto_login_admin():
            # Skip if user is already logged in or if it's a static file request
            if g.get('_auto_login_processed') or '/static/' in request.path:
                return

            # Mark as processed to avoid infinite recursion
            g._auto_login_processed = True

            # Auto-login the admin user
            if 'user_id' not in session:
                admin = User.query.filter_by(username=admin_username).first()
                if admin:
                    login_user(admin)
                    app.logger.info(f"Auto-logged in as {admin_username}")
