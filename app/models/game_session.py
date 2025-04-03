from datetime import datetime, timezone
from app import db

class GameSession(db.Model):
    """Game session model for tracking matches"""
    __tablename__ = 'game_sessions'

    id = db.Column(db.Integer, primary_key=True)
    player1_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    player2_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # Session status
    STATUS_WAITING = 'waiting'
    STATUS_ACTIVE = 'active'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'

    status = db.Column(db.String(20), default=STATUS_WAITING)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    started_at = db.Column(db.DateTime, nullable=True)
    ended_at = db.Column(db.DateTime, nullable=True)

    # Game results
    winner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    player1_score = db.Column(db.Integer, default=0)
    player2_score = db.Column(db.Integer, default=0)

    # Relationships
    winner = db.relationship('User', foreign_keys=[winner_id], backref='won_sessions', lazy=True)
    rounds = db.relationship('GameRound', backref='session', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<GameSession {self.id}>'

    @property
    def is_full(self):
        """Check if the session has two players"""
        return self.player2_id is not None

    @property
    def duration(self):
        """Get the duration of the session in seconds"""
        if not self.started_at:
            return 0

        end_time = self.ended_at or datetime.now(timezone.utc)
        return (end_time - self.started_at).total_seconds()

    def start_session(self):
        """Start the game session"""
        if self.is_full and self.status == self.STATUS_WAITING:
            self.status = self.STATUS_ACTIVE
            self.started_at = datetime.now(timezone.utc)
            db.session.commit()
            return True
        return False

    def end_session(self, winner_id=None):
        """End the game session"""
        if self.status == self.STATUS_ACTIVE:
            self.status = self.STATUS_COMPLETED
            self.ended_at = datetime.now(timezone.utc)
            self.winner_id = winner_id

            # Update player stats
            if winner_id:
                if winner_id == self.player1_id:
                    self.player1.wins += 1
                    self.player2.losses += 1
                elif winner_id == self.player2_id:
                    self.player2.wins += 1
                    self.player1.losses += 1
            else:
                # Draw
                self.player1.draws += 1
                self.player2.draws += 1

            db.session.commit()
            return True
        return False

    def cancel_session(self):
        """Cancel the game session"""
        self.status = self.STATUS_CANCELLED
        self.ended_at = datetime.now(timezone.utc)
        db.session.commit()
        return True


class GameRound(db.Model):
    """Game round model for tracking individual rounds in a match"""
    __tablename__ = 'game_rounds'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('game_sessions.id'), nullable=False)
    round_number = db.Column(db.Integer, nullable=False)

    # Round status
    STATUS_WAITING = 'waiting'
    STATUS_ACTIVE = 'active'
    STATUS_COMPLETED = 'completed'

    status = db.Column(db.String(20), default=STATUS_WAITING)
    started_at = db.Column(db.DateTime, nullable=True, default=None)
    ended_at = db.Column(db.DateTime, nullable=True)

    # Round results
    winner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    player1_health = db.Column(db.Integer, default=100)
    player2_health = db.Column(db.Integer, default=100)

    # Relationships
    winner = db.relationship('User', backref='won_rounds', lazy=True)

    def __repr__(self):
        return f'<GameRound {self.session_id}-{self.round_number}>'

    @property
    def duration(self):
        """Get the duration of the round in seconds"""
        if not self.started_at:
            return 0

        end_time = self.ended_at or datetime.now(timezone.utc)
        return (end_time - self.started_at).total_seconds()

    def start_round(self):
        """Start the game round"""
        if self.status == self.STATUS_WAITING:
            self.status = self.STATUS_ACTIVE
            self.started_at = datetime.now(timezone.utc)
            db.session.commit()
            return True
        return False

    def end_round(self, winner_id=None):
        """End the game round"""
        if self.status == self.STATUS_ACTIVE:
            self.status = self.STATUS_COMPLETED
            self.ended_at = datetime.now(timezone.utc)
            self.winner_id = winner_id

            # Update session scores
            session = self.session
            if winner_id:
                if winner_id == session.player1_id:
                    session.player1_score += 1
                elif winner_id == session.player2_id:
                    session.player2_score += 1

            db.session.commit()
            return True
        return False
