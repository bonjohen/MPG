# Motion Powered Games (MPG)

A video chat-based boxing game with motion tracking, avatar skins, and interactive gameplay.

## Project Overview

Motion Powered Games (MPG) is an interactive web application that combines video chat functionality with motion-controlled gaming. Players connect via video chat and engage in virtual boxing matches while being represented by customizable avatar skins. The application uses computer vision to track players' hand motions and facial gestures, translating them into in-game actions.

![Project Banner Placeholder]

## Key Features

- **Video Chat Integration**: Real-time video and audio communication between players
- **Avatar System**: Customizable character skins that overlay players' video feeds
- **Motion Tracking**: Hand gesture and facial expression recognition for game control
- **Boxing Mechanics**: Virtual matches with punch detection, blocking, and health systems
- **Gesture Controls**: Navigate menus and trigger game features using hand signals

## Getting Started

### Prerequisites

- Python 3.8+
- Webcam
- Modern web browser (Chrome, Firefox, Edge recommended)
- Stable internet connection

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/mpg.git
   cd mpg
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv MPG_venv
   
   # On Windows
   .\MPG_venv\Scripts\activate
   
   # On macOS/Linux
   source MPG_venv/bin/activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```
   # Create a .env file with necessary configuration
   cp .env.example .env
   
   # Edit the .env file with your settings
   ```

5. Initialize the database:
   ```
   flask db upgrade
   ```

6. Start the development server:
   ```
   flask run
   ```

7. Open your browser and navigate to `http://localhost:5000`

## Project Structure

```
MPG/
├── app/                  # Main application package
│   ├── static/           # Static files (CSS, JS, images)
│   ├── templates/        # HTML templates
│   ├── models/           # Database models
│   ├── routes/           # Application routes
│   └── utils/            # Utility functions
├── migrations/           # Database migrations
├── tests/                # Test suite
├── .env                  # Environment variables (create from .env.example)
├── .env.example          # Example environment variables
├── .gitignore            # Git ignore file
├── config.py             # Application configuration
├── requirements.md       # Project requirements
├── plan.md               # Development plan
├── steps.md              # Implementation steps
├── requirements.txt      # Python dependencies
└── README.md             # This file
```

## Development Workflow

This project follows a structured development approach:

1. Requirements are documented in `requirements.md`
2. The development plan is outlined in `plan.md`
3. Detailed implementation steps are in `steps.md`

When changes are needed:
1. Update `requirements.md` first
2. Then update `plan.md`
3. Finally update `steps.md`

Mark completed items with checkmarks as they are finished.

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (with potential frameworks like React)
- **Backend**: Python with Flask
- **Computer Vision**: TensorFlow.js, MediaPipe
- **Real-time Communication**: WebRTC, Socket.io
- **Rendering**: Three.js or Pixi.js for avatar visualization
- **Database**: SQLAlchemy with potential for PostgreSQL/MongoDB

## Contributing

1. Check the `steps.md` file for current development status
2. Follow the development behavior expectations in `requirements.md`
3. Ensure all servers are killed before starting new ones
4. Write tests for new functionality
5. Keep files under 300 lines of code
6. Avoid code duplication

## License

[Add appropriate license information here]

## Acknowledgments

- [List any libraries, resources, or inspirations]

---

*Motion Powered Games (MPG) - Bringing physical movement to virtual gaming*
