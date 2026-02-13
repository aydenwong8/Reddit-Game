import os
import random
import requests
from io import BytesIO
from PIL import Image

# --- CONFIGURATION ---
OUTPUT_DIR = "game_assets"

def get_memes_from_api():
    """
    Fetches the top 100 memes from Imgflip API.
    Returns a list of dictionaries: [{'id': '...', 'name': '...', 'url': '...'}, ...]
    """
    print("Connecting to Meme API...")
    try:
        url = "https://api.imgflip.com/get_memes"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        return data['data']['memes']
    except Exception as e:
        print(f"API Error: {e}")
        return []

def download_image(url):
    """
    Downloads an image using a 'fake' browser header to avoid 403 errors.
    """
    print(f"Downloading: {url}")
    
    # This dictionary makes the website think we are a Chrome browser, not a python script.
    fake_browser_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=fake_browser_headers, timeout=10)
        response.raise_for_status()
        return Image.open(BytesIO(response.content))
    except Exception as e:
        print(f"Download failed: {e}")
        return None

def generate_pixel_stages(original_img, meme_name):
    """Generates the pixel art clues."""
    
    # Clean the filename (remove slashes/weird characters)
    safe_name = "".join([c for c in meme_name if c.isalnum() or c in (' ', '_')]).strip()
    safe_name = safe_name.replace(" ", "_")
    
    meme_folder = os.path.join(OUTPUT_DIR, safe_name)
    if not os.path.exists(meme_folder):
        os.makedirs(meme_folder)

    width, height = original_img.size
    aspect_ratio = width / height
    
    # Stages: Very Pixelated (8px) -> Clearer (64px)
    resolutions = [8, 16, 32, 48, 64] 

    for i, target_width in enumerate(resolutions):
        target_height = int(target_width / aspect_ratio)
        
        # 1. Downsample (Crush quality)
        tiny_img = original_img.resize(
            (target_width, target_height), 
            resample=Image.BILINEAR
        )

        # 2. Upsample (Pixel Art Look)
        pixel_art_img = tiny_img.resize(
            (width, height), 
            resample=Image.NEAREST
        )
        
        save_path = os.path.join(meme_folder, f"clue_{i+1}.png")
        pixel_art_img.save(save_path)

    # Save the full resolution Answer
    original_img.save(os.path.join(meme_folder, "ANSWER.png"))
    print(f"Success! Generated assets for: {safe_name}")
    # Record this as the last generated asset so the UI can prefer it
    try:
        with open(os.path.join(OUTPUT_DIR, ".last_generated"), "w", encoding="utf-8") as f:
            f.write(safe_name)
    except Exception:
        pass

# --- MAIN EXECUTION ---
if __name__ == "__main__":
    # 1. Get the list of top 100 memes
    meme_list = get_memes_from_api()
    
    if meme_list:
        # 2. Pick up to 20 unique memes (or fewer if API returned less)
        max_count = min(20, len(meme_list))
        selected_memes = random.sample(meme_list, max_count)

        for meme in selected_memes:
            print(f"\n--- Processing: {meme['name']} ---")

            # 3. Download
            img = download_image(meme['url'])

            # 4. Generate Art
            if img:
                generate_pixel_stages(img, meme['name'])
    else:
        print("Could not fetch meme list.")