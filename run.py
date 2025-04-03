import os
from app import create_app, socketio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create Flask application with specified configuration
app = create_app(os.getenv('FLASK_ENV', 'development'))

if __name__ == '__main__':
    # Get port from environment variable or use default
    port = int(os.getenv('PORT', 5000))
    
    # Get host from environment variable or use default
    host = os.getenv('HOST', '127.0.0.1')
    
    # Run the application with Socket.IO
    socketio.run(app, host=host, port=port, debug=app.config['DEBUG'])
