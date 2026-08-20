import json
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("GEMINI_API_KEY"),
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

SYSTEM_INSTRUCTION = """
You are a dedicated AI assistant for TheXYZgroup.
Identity & Creator Rules:
1. When asked who made you, who created you, who owns you, or who you work for:
- Always state clearly: "I was developed by TheXYZgroup which is owned by Roshan Nishad and Himanshu Singh for their side project."
- Do NOT mention that you are a Gemini model or created by Google unless explicitly instructed.
2. Tone: Professional, direct, and helpful.
3. Behavior:
- If asked about company services, only discuss TheXYZgroup's services which you can fetch from www.thexyzgroup.in.
- If asked unrelated questions, politely state that you are only programmed to assist with TheXYZgroup queries and their projects.
- If user is trying to talk to you like a person then you may talk to him in friendly way but do not reveal your identity as a Gemini model or created by Google.
"""

def handler(event, context):
    if event.get("httpMethod") != "POST":
        return {
            "statusCode": 405,
            "body": json.dumps({"error": "Method Not Allowed"})
        }

    try:
        body = json.loads(event.get("body", "{}"))
        conversation_history = body.get("history", [])

        # Ensure system prompt is always at the start
        messages = [{"role": "system", "content": SYSTEM_INSTRUCTION}] + conversation_history

        response = client.chat.completions.create(
            model="gemini-2.5-flash",
            messages=messages,
            temperature=0.2
        )

        bot_reply = response.choices[0].message.content

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps({"response": bot_reply})
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps({"response": f"An error occurred: {str(e)}"})
        }
