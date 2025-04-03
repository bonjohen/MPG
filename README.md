# Motion Powered Games (MPG)

A video chat-based platform featuring multiple motion-controlled games with avatar skins, gesture recognition, and interactive gameplay.

## Project Overview

Motion Powered Games (MPG) is an interactive web application that combines video chat functionality with motion-controlled gaming. Players connect via video chat and engage in various motion-based games while being represented by customizable avatar skins. The application uses computer vision to track players' movements, hand gestures, and facial expressions, translating them into in-game actions. Players can choose from multiple game modes, each offering unique gameplay experiences based on different motion mechanics.

![Project Banner Placeholder]

## Key Features

- **Video Chat Integration**: Real-time video and audio communication between players
- **Avatar System**: Customizable character skins that overlay players' video feeds
- **Motion Tracking**: Hand gesture, body movement, and facial expression recognition
- **Multiple Game Modes**: Five distinct games with unique motion-based mechanics
- **Gesture Controls**: Navigate menus and trigger game features using hand signals
- **Voice Commands**: Control game features with voice recognition

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

1. Requirements are documented in `requirements.md`
2. The development plan is outlined in `plan.md`
3. Detailed implementation steps are in `steps.md`

Follow the steps.

When changes are needed:
1. Update `requirements.md` first
2. Then update `plan.md`
3. Finally update `steps.md`

## Game Modes

### Boxing
A classic boxing match where players use punch gestures (jab, cross, uppercut) to attack and blocking motions to defend. Features health systems, damage visualization, and realistic boxing mechanics.

### Spell Casting Duel
Players cast spells using specific hand gestures - pushing motions for force spells, circular motions for shields, and finger positions for elemental attacks. Master complex gesture combinations to unlock powerful magical effects.

### Ninja Reflex
A reaction-based game where players respond to visual prompts with the correct gesture. Catch shurikens, block swords, and strike targets with precise timing. Speed and accuracy determine your score.

### Rhythm Conductor
Conduct a virtual orchestra using hand movements. Control tempo, intensity, and different orchestral sections through precise gestures. Challenge others to conduct the same piece and compare your musical expression.

### Shadow Dance
Mirror your opponent's movements in a dance-like challenge. The system tracks synchronization accuracy and awards points for perfectly matched movements. Unlock special visual effects by performing specific gesture sequences.

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
