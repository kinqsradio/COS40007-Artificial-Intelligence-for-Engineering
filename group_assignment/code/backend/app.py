from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate, init, migrate, upgrade
from database import db
from routes import create_detection_routes
from flask_socketio import SocketIO
import eventlet
import os

eventlet.monkey_patch()

def create_app():
    app = Flask(__name__)
    CORS(app)
    app.config.from_pyfile('config.py')

    # Initialize the database
    db.init_app(app)

    # Initialize Flask-Migrate
    migrate = Migrate(app, db)

    # Initialize SocketIO
    socketio = SocketIO(app, cors_allowed_origins="*", logger=False, engineio_logger=False)

    # Set the secret key to a random value or use an environment variable
    app.secret_key = app.config['SECRET_KEY']

    detection_routes = create_detection_routes(socketio)
    app.register_blueprint(detection_routes)

    return app, socketio

app, socketio = create_app()

def setup_database(app):
    with app.app_context():
        # Initialize the migration repository
        if not os.path.exists('migrations'):
            init()
        # Create a new migration
        migrate(message="Initial migration.")
        # Apply the migration
        upgrade()

if __name__ == '__main__':
    with app.app_context():
        setup_database(app)
        db.create_all()
        socketio.run(app, debug=app.config['DEBUG'])