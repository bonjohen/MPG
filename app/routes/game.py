from flask import Blueprint, render_template, request
from flask_login import login_required, current_user
from flask_socketio import emit, join_room, leave_room
from app import socketio, db
from app.models.game_session import GameSession

game = Blueprint('game', __name__)

@game.route('/lobby')
@login_required
def lobby():
    """Render the game lobby page"""
    return render_template('game/lobby.html')

@game.route('/match/<session_id>')
@login_required
def match(session_id):
    """Render the game match page"""
    game_session = GameSession.query.get_or_404(session_id)
    return render_template('game/match.html', session=game_session)

@game.route('/avatars')
@login_required
def avatars():
    """Render the avatar selection page"""
    return render_template('game/avatars.html')

# Socket.IO event handlers
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    if current_user.is_authenticated:
        emit('user_connected', {'user_id': current_user.id, 'username': current_user.username})

        # Update last seen timestamp
        current_user.update_last_seen()

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    if current_user.is_authenticated:
        emit('user_disconnected', {'user_id': current_user.id, 'username': current_user.username}, broadcast=True)

@socketio.on('join_lobby')
def handle_join_lobby():
    """Handle user joining the lobby"""
    join_room('lobby')
    emit('lobby_message', {'msg': f'{current_user.username} has joined the lobby'}, room='lobby')

@socketio.on('leave_lobby')
def handle_leave_lobby():
    """Handle user leaving the lobby"""
    leave_room('lobby')
    emit('lobby_message', {'msg': f'{current_user.username} has left the lobby'}, room='lobby')

@socketio.on('join_game')
def handle_join_game(data):
    """Handle user joining a game session"""
    session_id = data.get('session_id')
    if session_id:
        join_room(session_id)
        emit('game_message', {'msg': f'{current_user.username} has joined the game'}, room=session_id)

@socketio.on('leave_game')
def handle_leave_game(data):
    """Handle user leaving a game session"""
    session_id = data.get('session_id')
    if session_id:
        leave_room(session_id)
        emit('game_message', {'msg': f'{current_user.username} has left the game'}, room=session_id)

@socketio.on('game_action')
def handle_game_action(data):
    """Handle game actions (punches, blocks, etc.)"""
    session_id = data.get('session_id')
    action_type = data.get('action_type')
    action_data = data.get('action_data', {})

    if session_id and action_type:
        # Broadcast the action to all players in the session
        emit('game_action', {
            'user_id': current_user.id,
            'username': current_user.username,
            'action_type': action_type,
            'action_data': action_data
        }, room=session_id)

# WebRTC signaling
@socketio.on('call-user')
def handle_call_user(data):
    """Handle call user request"""
    if current_user.is_authenticated:
        to = data.get('to')
        offer = data.get('offer')

        if to and offer:
            emit('call-made', {
                'offer': offer,
                'socket': request.sid
            }, room=to)

@socketio.on('make-answer')
def handle_make_answer(data):
    """Handle make answer request"""
    if current_user.is_authenticated:
        to = data.get('to')
        answer = data.get('answer')

        if to and answer:
            emit('answer-made', {
                'answer': answer,
                'socket': request.sid
            }, room=to)

@socketio.on('ice-candidate')
def handle_ice_candidate(data):
    """Handle ICE candidate"""
    if current_user.is_authenticated:
        to = data.get('to')
        candidate = data.get('candidate')

        if to and candidate:
            emit('ice-candidate', {
                'candidate': candidate,
                'socket': request.sid
            }, room=to)

@socketio.on('game_chat')
def handle_game_chat(data):
    """Handle game chat message"""
    if current_user.is_authenticated:
        session_id = data.get('session_id')
        message = data.get('message')

        if session_id and message:
            emit('game_message', {
                'msg': f'{current_user.username}: {message}'
            }, room=session_id)
