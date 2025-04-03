from flask import Flask
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
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
    app.config.from_object(config[config_name])

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

    return app
