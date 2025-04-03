import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration class"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-for-development-only'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Default upload folder for media files
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app/static/uploads')

    # Maximum allowed file size (16MB)
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024

    # Auto-login configuration
    AUTO_LOGIN_ENABLED = os.environ.get('AUTO_LOGIN_ENABLED', 'True').lower() in ('true', '1', 't')
    AUTO_LOGIN_USERNAME = os.environ.get('AUTO_LOGIN_USERNAME', 'admin')
    AUTO_LOGIN_PASSWORD = os.environ.get('AUTO_LOGIN_PASSWORD', 'admin')
    AUTO_LOGIN_EMAIL = os.environ.get('AUTO_LOGIN_EMAIL', 'admin@example.com')

    @staticmethod
    def init_app(app):
        """Initialize application with this configuration"""
        # Create upload folder if it doesn't exist
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or 'sqlite:///dev.db'

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL') or 'sqlite:///test.db'
    WTF_CSRF_ENABLED = False  # Disable CSRF protection in tests

class ProductionConfig(Config):
    """Production configuration"""
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///prod.db'

    # Disable automatic admin login by default in production
    AUTO_LOGIN_ENABLED = os.environ.get('AUTO_LOGIN_ENABLED', 'False').lower() in ('true', '1', 't')

    @classmethod
    def init_app(cls, app):
        """Initialize production application"""
        Config.init_app(app)

        # Log to stderr
        import logging
        from logging import StreamHandler
        file_handler = StreamHandler()
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
