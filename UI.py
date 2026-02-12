import os
import shutil
import base64
import json
import random
import webbrowser
import pathlib
import tempfile

# --- CONFIGURATION ---
ASSETS_DIR = "game_assets"

# --- 1. CLEANUP & LOAD ---
def clean_and_load_all():
    """Return a list of available game data dicts and the index of last_generated (or -1)."""
    if not os.path.exists(ASSETS_DIR): return [], -1

    folders = [f for f in os.listdir(ASSETS_DIR) if os.path.isdir(os.path.join(ASSETS_DIR, f))]
    valid_folders = []

    for f in folders:
        path = os.path.join(ASSETS_DIR, f)
        if os.path.exists(os.path.join(path, "clue_1.png")) and os.path.exists(os.path.join(path, "ANSWER.png")):
            valid_folders.append(f)

    valid_folders.sort()
    if not valid_folders:
        return [], -1

    # find last generated name if present
    last_generated = None
    try:
        with open(os.path.join(ASSETS_DIR, ".last_generated"), "r", encoding="utf-8") as lg:
            last_generated = lg.read().strip()
    except Exception:
        last_generated = None

    all_data = []
    initial_index = -1

    def load_images_for(path):
        def get_b64(fname):
            try:
                with open(os.path.join(path, fname), "rb") as f:
                    return f"data:image/png;base64,{base64.b64encode(f.read()).decode('utf-8').replace(chr(10), '')}"
            except Exception:
                return None

        images = {}
        img1 = get_b64("clue_1.png")
        ans = get_b64("ANSWER.png")
        if not img1 or not ans:
            return None
        images["1"] = img1
        images["answer"] = ans
        for i in range(2, 6):
            v = get_b64(f"clue_{i}.png")
            images[str(i)] = v if v else img1
        return images

    for idx, folder in enumerate(valid_folders):
        path = os.path.join(ASSETS_DIR, folder)
        imgs = load_images_for(path)
        if not imgs:
            continue
        entry = {
            "name": folder.replace("_", " "),
            "clean_name": folder.replace("_", " ").lower(),
            "images": imgs
        }
        all_data.append(entry)
        if last_generated and folder == last_generated:
            initial_index = len(all_data) - 1

    return all_data, initial_index

# --- 2. EXECUTE LOAD ---
all_data, initial_index = clean_and_load_all()

if not all_data:
    print("❌ Error: No valid game assets found. Run the generator script first.")
else:
    json_payload = json.dumps(all_data)
    # inject both the list and the initial index
    html_code = None
    try:
        tpl_path = os.path.join(os.path.dirname(__file__), "pixel_game_template.html")
        with open(tpl_path, "r", encoding="utf-8") as tf:
            tpl = tf.read()
        html_code = tpl.replace("__DATA_PAYLOAD__", json_payload).replace("__INITIAL_INDEX__", str(initial_index))
    except Exception:
        html_code = None

    if not html_code:
        print("Template not found or failed to load. Make sure pixel_game_template.html is next to UI.py")
    else:
        try:
            out_path = os.path.join(os.path.dirname(__file__), "pixel_game.html")
        except Exception:
            out_path = os.path.join(tempfile.gettempdir(), "pixel_game.html")

        with open(out_path, "w", encoding="utf-8") as f:
            f.write(html_code)

        try:
            uri = pathlib.Path(out_path).as_uri()
            webbrowser.open_new_tab(uri)
            print(f"Opened UI in browser: {out_path}")
        except Exception:
            print(f"HTML written to: {out_path} - open it in a browser to play.")