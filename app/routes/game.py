import json
from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required, current_user
from flask_socketio import emit, join_room, leave_room
from app import socketio, db
from app.models.game_session import GameSession
from app.models.avatar import Avatar

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

@game.route('/calibration')
@login_required
def calibration():
    """Render the motion calibration page"""
    return render_template('game/calibration.html')

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


# API endpoints
@game.route('/api/create_session', methods=['POST'])
@login_required
def api_create_session():
    """API endpoint to create a new game session"""
    data = request.get_json()

    # Create a new game session
    session = GameSession(
        player1_id=current_user.id,
        status='waiting'
    )

    db.session.add(session)
    db.session.commit()

    return jsonify({'success': True, 'session_id': session.id})


@game.route('/api/join_session', methods=['POST'])
@login_required
def api_join_session():
    """API endpoint to join a game session"""
    data = request.get_json()
    session_id = data.get('session_id')

    if not session_id:
        return jsonify({'success': False, 'error': 'Session ID is required'}), 400

    # Find the session
    session = GameSession.query.get(session_id)

    if not session:
        return jsonify({'success': False, 'error': 'Session not found'}), 404

    if session.status != 'waiting':
        return jsonify({'success': False, 'error': 'Session is not available'}), 400

    # Join the session
    session.player2_id = current_user.id
    session.status = 'playing'
    db.session.commit()

    return jsonify({'success': True})


@game.route('/api/update_avatar', methods=['POST'])
@login_required
def api_update_avatar():
    """API endpoint to update user's avatar"""
    data = request.get_json()
    avatar_id = data.get('avatar_id')

    if not avatar_id:
        return jsonify({'success': False, 'error': 'Avatar ID is required'}), 400

    # Find the avatar
    avatar = Avatar.query.get(avatar_id)

    if not avatar:
        return jsonify({'success': False, 'error': 'Avatar not found'}), 404

    # Update the user's avatar
    current_user.avatar_id = avatar.id
    db.session.commit()

    return jsonify({'success': True})


@game.route('/api/save_avatar_customization', methods=['POST'])
@login_required
def api_save_avatar_customization():
    """API endpoint to save avatar customization"""
    data = request.get_json()
    avatar_id = data.get('avatarId')
    color = data.get('color')
    accessories = data.get('accessories', [])
    animation = data.get('animation')

    if not avatar_id:
        return jsonify({'success': False, 'error': 'Avatar ID is required'}), 400

    # Find the avatar
    avatar = Avatar.query.get(avatar_id)

    if not avatar:
        return jsonify({'success': False, 'error': 'Avatar not found'}), 404

    # Update the avatar with customization data
    # In a real application, you would store this in a separate table
    # For now, we'll just update the avatar's description field with the JSON data
    customization_data = {
        'color': color,
        'accessories': accessories,
        'animation': animation
    }

    avatar.description = json.dumps(customization_data)
    db.session.commit()

    return jsonify({'success': True, 'avatarId': avatar.id})


@game.route('/api/get_avatar_customization', methods=['GET'])
@login_required
def api_get_avatar_customization():
    """API endpoint to get avatar customization"""
    if not current_user.avatar_id:
        return jsonify({'success': False, 'error': 'No avatar selected'}), 404

    # Find the avatar
    avatar = Avatar.query.get(current_user.avatar_id)

    if not avatar:
        return jsonify({'success': False, 'error': 'Avatar not found'}), 404

    # Get the customization data
    customization_data = {}
    if avatar.description:
        try:
            customization_data = json.loads(avatar.description)
        except json.JSONDecodeError:
            pass

    # Add the avatar ID
    customization_data['avatarId'] = avatar.id

    return jsonify({'success': True, 'avatarData': customization_data})


@game.route('/api/call-user', methods=['POST'])
@login_required
def api_call_user():
    """API endpoint for WebRTC call user"""
    data = request.get_json()
    to = data.get('to')
    offer = data.get('offer')

    if not to or not offer:
        return jsonify({'success': False, 'error': 'Missing required parameters'}), 400

    # In a real application, this would emit a socket.io event
    # For testing purposes, we'll just return success
    return jsonify({'success': True})


@game.route('/api/make-answer', methods=['POST'])
@login_required
def api_make_answer():
    """API endpoint for WebRTC make answer"""
    data = request.get_json()
    to = data.get('to')
    answer = data.get('answer')

    if not to or not answer:
        return jsonify({'success': False, 'error': 'Missing required parameters'}), 400

    # In a real application, this would emit a socket.io event
    # For testing purposes, we'll just return success
    return jsonify({'success': True})


@game.route('/api/ice-candidate', methods=['POST'])
@login_required
def api_ice_candidate():
    """API endpoint for WebRTC ICE candidate"""
    data = request.get_json()
    to = data.get('to')
    candidate = data.get('candidate')

    if not to or not candidate:
        return jsonify({'success': False, 'error': 'Missing required parameters'}), 400

    # In a real application, this would emit a socket.io event
    # For testing purposes, we'll just return success
    return jsonify({'success': True})


@game.route('/play/<int:session_id>')
@login_required
def play_game(session_id):
    """Render the game page for a specific session"""
    session = GameSession.query.get_or_404(session_id)
    return render_template('game/play.html', session=session)


@game.route('/results/<int:session_id>')
@login_required
def game_results(session_id):
    """Render the game results page for a specific session"""
    session = GameSession.query.get_or_404(session_id)
    return render_template('game/results.html', session=session)