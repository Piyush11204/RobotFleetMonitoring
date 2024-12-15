from flask import Flask, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import random
import uuid
import time
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
socketio = SocketIO(app, cors_allowed_origins="*")

# Sample mock robot data
def generate_initial_robots(num_robots=10):
    robots = []
    for _ in range(num_robots):
        robot = {
            "Robot ID": str(uuid.uuid4()),
            "Online/Offline": random.choice([True, False]),
            "Battery Percentage": random.randint(10, 100),
            "CPU Usage": random.randint(10, 100),
            "RAM Consumption": random.randint(2000, 8000),
            "Last Updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "Location Coordinates": [random.uniform(-90, 90), random.uniform(-180, 180)]
        }
        robots.append(robot)
    return robots

robots = generate_initial_robots()

# API Endpoint for initial robot data
@app.route('/robots', methods=['GET'])
def get_robots():
    return jsonify(robots)

# Function to emit real-time updates
def generate_data():
    while True:
        for robot in robots:
            # Simulate more realistic updates
            robot["Online/Offline"] = random.choices(
                [True, False], 
                weights=[0.8, 0.2]  # 80% chance of being online
            )[0]
            
            # Battery logic
            if robot["Online/Offline"]:
                robot["Battery Percentage"] = max(0, min(100, robot["Battery Percentage"] + random.randint(-10, 5)))
            else:
                robot["Battery Percentage"] = max(0, robot["Battery Percentage"] - random.randint(5, 15))
            
            robot["CPU Usage"] = random.randint(10, 100)
            robot["RAM Consumption"] = random.randint(2000, 8000)
            robot["Last Updated"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            robot["Location Coordinates"] = [
                max(-90, min(90, robot["Location Coordinates"][0] + random.uniform(-1, 1))),
                max(-180, min(180, robot["Location Coordinates"][1] + random.uniform(-1, 1)))
            ]
        
        socketio.emit('update', robots)
        socketio.sleep(10)  

# WebSocket Event for real-time data
@socketio.on('connect')
def handle_connect():
    print("Client connected")
    emit('update', robots)

if __name__ == '__main__':
    socketio.start_background_task(generate_data)
    socketio.run(app, host="0.0.0.0", port=5000, debug=False)