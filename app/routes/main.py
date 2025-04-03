from flask import Blueprint, render_template
from flask_login import login_required, current_user

main = Blueprint('main', __name__)

@main.route('/')
def index():
    """Render the home page"""
    return render_template('index.html')

@main.route('/about')
def about():
    """Render the about page"""
    return render_template('about.html')

@main.route('/profile')
@login_required
def profile():
    """Render the user profile page"""
    return render_template('main/profile.html', user=current_user)
