from app import db

class Avatar(db.Model):
    """Avatar model for character skins"""
    __tablename__ = 'avatars'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False)
    description = db.Column(db.Text, nullable=True)
    image_path = db.Column(db.String(256), nullable=False)

    # Avatar attributes
    health = db.Column(db.Integer, default=100)
    strength = db.Column(db.Integer, default=10)
    speed = db.Column(db.Integer, default=10)
    defense = db.Column(db.Integer, default=10)

    # Avatar assets
    idle_animation = db.Column(db.String(256), nullable=True)
    punch_animation = db.Column(db.String(256), nullable=True)
    block_animation = db.Column(db.String(256), nullable=True)
    hit_animation = db.Column(db.String(256), nullable=True)
    victory_animation = db.Column(db.String(256), nullable=True)
    defeat_animation = db.Column(db.String(256), nullable=True)

    # Relationships
    users = db.relationship('User', backref='avatar', lazy=True, foreign_keys='User.avatar_id')

    def __repr__(self):
        return f'<Avatar {self.name}>'
