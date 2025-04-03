from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from app.models.user import User
from app import db, bcrypt
from app.forms.auth_forms import LoginForm, RegistrationForm, RequestResetForm, ResetPasswordForm

auth = Blueprint('auth', __name__)

@auth.route('/login', methods=['GET', 'POST'])
def login():
    """Handle user login"""
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))

    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and bcrypt.check_password_hash(user.password_hash, form.password.data):
            login_user(user, remember=form.remember.data)
            next_page = request.args.get('next')
            return redirect(next_page if next_page else url_for('main.index'))
        else:
            flash('Login unsuccessful. Please check username and password', 'danger')

    return render_template('auth/login.html', form=form)

@auth.route('/register', methods=['GET', 'POST'])
def register():
    """Handle user registration"""
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))

    form = RegistrationForm()
    if form.validate_on_submit():
        hashed_password = bcrypt.generate_password_hash(form.password.data).decode('utf-8')
        user = User(
            username=form.username.data,
            email=form.email.data,
            password_hash=hashed_password
        )
        db.session.add(user)
        db.session.commit()
        flash('Your account has been created! You can now log in.', 'success')
        return redirect(url_for('auth.login'))

    return render_template('auth/register.html', form=form)

@auth.route('/logout')
@login_required
def logout():
    """Handle user logout"""
    logout_user()
    return redirect(url_for('main.index'))


@auth.route('/reset_password', methods=['GET', 'POST'])
def reset_request():
    """Handle password reset request"""
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))

    form = RequestResetForm()
    if form.validate_on_submit():
        user = User.get_user_by_email(form.email.data)
        if user:
            token = user.generate_reset_token()
            # In a real application, you would send an email with the reset link
            # For now, we'll just flash the token (for development purposes only)
            flash(f'A password reset link has been sent to your email. For development: {url_for("auth.reset_token", token=token, _external=True)}', 'info')
        return redirect(url_for('auth.login'))

    return render_template('auth/reset_request.html', form=form)


@auth.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_token(token):
    """Handle password reset with token"""
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))

    # Find the user with this token
    user = User.query.filter_by(reset_token=token).first()

    if user is None or not user.verify_reset_token(token):
        flash('That is an invalid or expired token', 'warning')
        return redirect(url_for('auth.reset_request'))

    form = ResetPasswordForm()
    if form.validate_on_submit():
        hashed_password = bcrypt.generate_password_hash(form.password.data).decode('utf-8')
        user.password_hash = hashed_password
        user.clear_reset_token()
        db.session.commit()
        flash('Your password has been updated! You are now able to log in', 'success')
        return redirect(url_for('auth.login'))

    return render_template('auth/reset_token.html', form=form)
