import os
from dotenv import load_dotenv
import mysql.connector

load_dotenv()

def save_to_db(user_id, user_msg, bot_reply):
    try:
        conn = mysql.connector.connect(
            host=os.environ.get("DB_HOST", "localhost"),
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASSWORD"),
            database=os.environ.get("DB_NAME", "chatbot_db")
        )
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO chat_history (user_id, user_msg, bot_reply) VALUES (%s, %s, %s)
        """, (user_id, user_msg, bot_reply))
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print("DB Error:", e)

def get_history_from_db(user_id, limit=10):
    try:
        conn = mysql.connector.connect(
            host=os.environ.get("DB_HOST", "localhost"),
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASSWORD"),
            database=os.environ.get("DB_NAME", "chatbot_db")
        )
        cursor = conn.cursor()
        cursor.execute("""
            SELECT user_msg, bot_reply FROM chat_history WHERE user_id=%s ORDER BY id DESC LIMIT %s
        """, (user_id, limit))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        # Return in chronological order
        return rows[::-1]
    except Exception as e:
        print("DB Error:", e)
        return []
