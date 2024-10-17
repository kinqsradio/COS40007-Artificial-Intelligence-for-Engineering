import os
from dotenv import load_dotenv

load_dotenv(dotenv_path='group_assignment/.env', override=True)

DEBUG = os.getenv('DEBUG', 'False').lower() in ['true', '1', 't']
SECRET_KEY = os.getenv('SECRET_KEY')

# Database configuration
SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///user.db')
SQLALCHEMY_TRACK_MODIFICATIONS = False
