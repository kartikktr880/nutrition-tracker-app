import os
import google.generativeai as genai

# Configure Google API key from environment variable
api_key = os.environ.get("GOOGLE_API_KEY", "your_google_api_key_here")
genai.configure(api_key=api_key)

try:
    for model in genai.list_models():
        print(model.name)
except Exception as e:
    print(f"Error listing models: {e}")