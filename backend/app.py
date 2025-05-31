from flask import Flask, request, jsonify
from flask_cors import CORS
from chat_logic import get_bot_reply
from db import save_to_db, get_history_from_db

app = Flask(__name__)
CORS(app)

@app.route("/chat", methods=["POST"])
def chat():
    user_msg = request.json.get("message")
    user_id = request.json.get("user_id", "anonymous")
    # Fetch previous history for context (optional, limit 10)
    history = get_history_from_db(user_id, limit=10)
    # Optionally, pass history to get_bot_reply for context-aware response
    bot_reply = get_bot_reply(user_msg, history)
    save_to_db(user_id, user_msg, bot_reply)
    return jsonify({"reply": bot_reply, "history": history})

if __name__ == "__main__":
    app.run(debug=True)
