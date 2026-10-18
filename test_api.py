import requests

print("Starting script...")
def fetch_json(url):
    print(f"Attempting to fetch URL: {url}")
    try:
        response = requests.get(url, timeout=10)
        print(f"Response status code: {response.status_code}")
        response.raise_for_status()
        data = response.json()
        print("JSON data retrieved successfully")
        return data
    except requests.Timeout:
        print("Error: Request timed out")
        return None
    except requests.HTTPError as e:
        print(f"HTTP Error: {e}")
        return None
    except requests.ConnectionError:
        print("Error: Failed to connect to the server")
        return None
    except requests.RequestException as e:
        print(f"Error fetching JSON: {e}")
        return None

if __name__ == "__main__":
    print("Calling fetch_json...")
    result = fetch_json("https://api.github.com")
    if result:
        print(f"Result: {result}")
    else:
        print("No data retrieved")