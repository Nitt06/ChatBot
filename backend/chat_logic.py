import os
from dotenv import load_dotenv
import requests

load_dotenv()

API_KEY = os.environ.get("OPENROUTER_API_KEY")

def get_bot_reply(msg, history=None):
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    # Build context from history if available
    messages = []
    if history:
        for user_msg, bot_reply in history:
            messages.append({"role": "user", "content": user_msg})
            messages.append({"role": "assistant", "content": bot_reply})
    messages.append({"role": "user", "content": msg})
    data = {
        "model": "mistralai/mistral-7b-instruct",
        "messages": messages
    }
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        reply = response.json()['choices'][0]['message']['content']
        return reply.strip()
    except Exception as e:
        print("Error with OpenRouter API call:", e)
        print("Status code:", getattr(response, 'status_code', None))
        print("Response text:", getattr(response, 'text', None))
        return "Sorry, I had trouble thinking. Try again!"
