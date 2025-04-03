"""
Tests for the forms.
"""
import pytest
from app.forms.auth_forms import LoginForm, RegistrationForm, RequestResetForm, ResetPasswordForm
from app.models.user import User
from app import db


def test_login_form_validation(app):
    """Test login form validation."""
    with app.app_context():
        # Create a test user first
        from app.models.user import User
        from app import bcrypt

        # Check if test user already exists
        test_user = User.query.filter_by(email='test@example.com').first()
        if not test_user:
            # Create test user
            hashed_password = bcrypt.generate_password_hash('password').decode('utf-8')
            test_user = User(
                username='testuser',
                email='test@example.com',
                password_hash=hashed_password
            )
            db.session.add(test_user)
            db.session.commit()

        # Valid form data
        form = LoginForm(
            username='testuser',
            password='password',
            remember=True
        )
        assert form.validate() is True

        # Invalid username (empty)
        form = LoginForm(
            username='',
            password='password'
        )
        assert form.validate() is False
        assert 'This field is required' in str(form.username.errors)

        # Empty password
        form = LoginForm(
            username='testuser',
            password=''
        )
        assert form.validate() is False
        assert 'This field is required' in str(form.password.errors)


def test_registration_form_validation(app):
    """Test registration form validation."""
    with app.app_context():
        # Valid form data
        form = RegistrationForm(
            username='newuser',
            email='new@example.com',
            password='password123',
            confirm_password='password123'
        )
        assert form.validate() is True

        # Username already exists
        form = RegistrationForm(
            username='testuser',  # Existing username
            email='new@example.com',
            password='password123',
            confirm_password='password123'
        )
        assert form.validate() is False
        assert 'That username is already taken' in str(form.username.errors)

        # Email already exists
        form = RegistrationForm(
            username='newuser',
            email='test@example.com',  # Existing email
            password='password123',
            confirm_password='password123'
        )
        assert form.validate() is False
        assert 'That email is already registered' in str(form.email.errors)

        # Passwords don't match
        form = RegistrationForm(
            username='newuser',
            email='new@example.com',
            password='password123',
            confirm_password='different'
        )
        assert form.validate() is False
        assert 'Passwords must match' in str(form.confirm_password.errors)

        # Password too short
        form = RegistrationForm(
            username='newuser',
            email='new@example.com',
            password='short',
            confirm_password='short'
        )
        assert form.validate() is False
        assert 'Password must be at least 8 characters long' in str(form.password.errors)


def test_request_reset_form_validation(app):
    """Test request reset form validation."""
    with app.app_context():
        # Valid form data
        form = RequestResetForm(
            email='test@example.com'  # Existing email
        )
        assert form.validate() is True

        # Non-existent email
        form = RequestResetForm(
            email='nonexistent@example.com'
        )
        assert form.validate() is False
        assert 'There is no account with that email' in str(form.email.errors)

        # Invalid email format
        form = RequestResetForm(
            email='invalid-email'
        )
        assert form.validate() is False
        assert 'Invalid email address' in str(form.email.errors)


def test_reset_password_form_validation(app):
    """Test reset password form validation."""
    with app.app_context():
        # Valid form data
        form = ResetPasswordForm(
            password='newpassword',
            confirm_password='newpassword'
        )
        assert form.validate() is True

        # Passwords don't match
        form = ResetPasswordForm(
            password='newpassword',
            confirm_password='different'
        )
        assert form.validate() is False
        assert 'Passwords must match' in str(form.confirm_password.errors)

        # Password too short
        form = ResetPasswordForm(
            password='short',
            confirm_password='short'
        )
        assert form.validate() is False
        assert 'Password must be at least 8 characters long' in str(form.password.errors)
