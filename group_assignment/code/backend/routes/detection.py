from flask import Blueprint
from controllers import create_detection_controller

def create_detection_routes(socketio):
    detection_routes = create_detection_controller(socketio)
    return detection_routes
