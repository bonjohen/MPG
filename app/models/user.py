from datetime import datetime, timezone, timedelta
import secrets
from flask_login import UserMixin
from app import db, login_manager

@login_manager.user_loader
def load_user(user_id):
    """Load user by ID for Flask-Login"""
    return User.query.get(int(user_id))

class User(db.Model, UserMixin):
    """User model for authentication and profile information"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    last_seen = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Password reset fields
    reset_token = db.Column(db.String(100), nullable=True)
    reset_token_expiration = db.Column(db.DateTime, nullable=True)

    # Profile information
    avatar_id = db.Column(db.Integer, db.ForeignKey('avatars.id', name='fk_user_avatar_id'), nullable=True)
    wins = db.Column(db.Integer, default=0)
    losses = db.Column(db.Integer, default=0)
    draws = db.Column(db.Integer, default=0)

    # Relationships
    player1_sessions = db.relationship('GameSession', foreign_keys='GameSession.player1_id', backref='player1', lazy=True)
    player2_sessions = db.relationship('GameSession', foreign_keys='GameSession.player2_id', backref='player2', lazy=True)

    def __repr__(self):
        return f'<User {self.username}>'

    @property
    def total_matches(self):
        """Get the total number of matches played"""
        return self.wins + self.losses + self.draws

    @property
    def win_rate(self):
        """Get the win rate as a percentage"""
        if self.total_matches == 0:
            return 0
        return round((self.wins / self.total_matches) * 100, 2)

    def update_last_seen(self):
        """Update the last seen timestamp"""
        self.last_seen = datetime.now(timezone.utc)
        db.session.commit()

    def generate_reset_token(self):
        """Generate a password reset token that expires in 1 hour"""
        self.reset_token = secrets.token_urlsafe(32)
        self.reset_token_expiration = datetime.now(timezone.utc) + timedelta(hours=1)
        db.session.commit()
        return self.reset_token

    def verify_reset_token(self, token):
        """Verify that the reset token is valid and not expired"""
        if token != self.reset_token:
            return False
        if self.reset_token_expiration < datetime.now(timezone.utc):
            return False
        return True

    def clear_reset_token(self):
        """Clear the reset token after it has been used"""
        self.reset_token = None
        self.reset_token_expiration = None
        db.session.commit()

    @staticmethod
    def get_user_by_email(email):
        """Get a user by their email address"""
        return User.query.filter_by(email=email).first()
