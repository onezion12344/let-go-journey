#!/usr/bin/env python3
"""
Exaholic Game — Backend Server (Bilingual + Auth)
Flask + JSON + ?lang=zh|en parameter support + user registration/login.
"""
import json, os, datetime, sys, uuid, secrets
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app, supports_credentials=True)

# ── Secret Key ──
CONFIG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config")
os.makedirs(CONFIG_DIR, exist_ok=True)
SECRET_FILE = os.path.join(CONFIG_DIR, "secret_key.txt")
if os.path.exists(SECRET_FILE):
    with open(SECRET_FILE, "r") as f:
        app.secret_key = f.read().strip()
else:
    app.secret_key = secrets.token_hex(32)
    with open(SECRET_FILE, "w") as f:
        f.write(app.secret_key)

# ── Paths ──
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
CONTENT_DIR = os.path.join(BASE_DIR, "..", "content")
PROGRESS_DIR = os.path.join(DATA_DIR, "users")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
PROGRESS_FILE_BASE = PROGRESS_DIR  # per-user: users/<user_id>/progress.json
WIDGET_FILE = os.path.join(DATA_DIR, "widget.json")
LANG_FILE_MAP = {"zh": "content_zh.json", "en": "content_en.json"}

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(PROGRESS_DIR, exist_ok=True)

# ── User Functions ──

def load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, "r") as f:
            return json.load(f)
    return {}

def save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2, ensure_ascii=False)

def get_user_progress_path(user_id):
    return os.path.join(PROGRESS_DIR, f"{user_id}.json")

def load_progress(user_id=None):
    path = get_user_progress_path(user_id) if user_id else PROGRESS_FILE_BASE + "/default.json"
    if user_id and os.path.exists(get_user_progress_path(user_id)):
        with open(get_user_progress_path(user_id), "r") as f:
            return json.load(f)
    return {
        "current_day": 1, "completed_days": [], "mood_history": [],
        "journal_entries": {}, "start_date": str(datetime.date.today()), "lang": "zh",
        "started_today": False
    }

def save_progress(data, user_id=None):
    path = get_user_progress_path(user_id) if user_id else PROGRESS_FILE_BASE + "/default.json"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# ── Auth Decorator ──

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Not logged in"}), 401
        return f(*args, **kwargs)
    return decorated

# ── Content ──

def load_content(lang="zh"):
    fname = LANG_FILE_MAP.get(lang, "content_zh.json")
    path = os.path.join(CONTENT_DIR, fname)
    if not os.path.exists(path):
        path = os.path.join(CONTENT_DIR, "content_zh.json")
    with open(path, "r") as f:
        return json.load(f)

# ══════════════════════════════
#  AUTH ENDPOINTS
# ══════════════════════════════

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400
    if len(password) < 4:
        return jsonify({"error": "Password must be at least 4 characters"}), 400

    users = load_users()
    if username in users:
        return jsonify({"error": "Username already exists"}), 409

    user_id = str(uuid.uuid4())[:8]
    users[username] = {
        "id": user_id,
        "password_hash": generate_password_hash(password),
        "created_at": str(datetime.datetime.now())
    }
    save_users(users)

    # Initialize progress for new user
    save_progress(load_progress(), user_id)

    session["user_id"] = user_id
    session["username"] = username

    return jsonify({"ok": True, "user": {"id": user_id, "username": username}})

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    users = load_users()
    if username not in users:
        return jsonify({"error": "Invalid username or password"}), 401

    if not check_password_hash(users[username]["password_hash"], password):
        return jsonify({"error": "Invalid username or password"}), 401

    session["user_id"] = users[username]["id"]
    session["username"] = username

    return jsonify({"ok": True, "user": {"id": users[username]["id"], "username": username}})

@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})

@app.route("/api/auth/me")
def auth_me():
    if "user_id" in session:
        return jsonify({"logged_in": True, "user": {"id": session["user_id"], "username": session.get("username", "")}})
    return jsonify({"logged_in": False})

# ══════════════════════════════
#  GAME API (protected)
# ══════════════════════════════

@app.route("/api/content")
@login_required
def get_content():
    lang = request.args.get("lang", "zh")
    return jsonify(load_content(lang))

@app.route("/api/content/day/<int:day>")
@login_required
def get_day(day):
    lang = request.args.get("lang", "zh")
    content = load_content(lang)
    for d in content["days"]:
        if d["day"] == day:
            return jsonify(d)
    return jsonify({"error": "Day not found"}), 404

@app.route("/api/progress")
@login_required
def get_progress():
    uid = session["user_id"]
    return jsonify(load_progress(uid))

@app.route("/api/progress/lang", methods=["POST"])
@login_required
def set_lang():
    data = request.json
    uid = session["user_id"]
    prog = load_progress(uid)
    prog["lang"] = data.get("lang", "zh")
    save_progress(prog, uid)
    return jsonify(prog)

@app.route("/api/progress/start", methods=["POST"])
@login_required
def start_game():
    uid = session["user_id"]
    prog = load_progress(uid)
    if not prog.get("started_today"):
        prog["start_date"] = str(datetime.date.today())
        prog["started_today"] = True
        save_progress(prog, uid)
    return jsonify(prog)

@app.route("/api/progress/complete-day", methods=["POST"])
@login_required
def complete_day():
    data = request.json
    uid = session["user_id"]
    prog = load_progress(uid)
    day = data.get("day", prog["current_day"])

    if day not in prog["completed_days"]:
        prog["completed_days"].append(day)

    if "journal" in data:
        prog["journal_entries"][str(day)] = data["journal"]

    if "mood" in data:
        prog["mood_history"].append({
            "day": day, "score": data["mood"],
            "timestamp": str(datetime.datetime.now())
        })

    next_day = max(prog["completed_days"]) + 1
    prog["current_day"] = min(next_day, 30)

    save_progress(prog, uid)
    return jsonify(prog)

@app.route("/api/progress/reset", methods=["POST"])
@login_required
def reset_progress():
    uid = session["user_id"]
    default = {
        "current_day": 1, "completed_days": [], "mood_history": [],
        "journal_entries": {}, "start_date": str(datetime.date.today()), "lang": "zh", "started_today": False
    }
    save_progress(default, uid)
    return jsonify(default)

@app.route("/api/widget")
@login_required
def get_widget():
    uid = session["user_id"]
    prog = load_progress(uid)
    lang = request.args.get("lang", prog.get("lang", "zh"))
    content = load_content(lang)
    day_num = prog["current_day"]

    day_data = None
    for d in content["days"]:
        if d["day"] == day_num:
            day_data = d
            break

    phase_name, phase_icon = "", ""
    for p in content["phases"]:
        if day_num in p["days"]:
            phase_name = p["name"]
            phase_icon = p["icon"]
            break

    total = len(prog["completed_days"])
    widget = {
        "day": day_num, "phase_name": phase_name, "phase_icon": phase_icon,
        "progress": f"{total}/30", "progress_pct": round(total / 30 * 100),
        "title": day_data["title"] if day_data else "",
        "affirmation": day_data["affirmation"] if day_data else "",
        "badge": day_data["badge"] if day_data else "",
        "error": None
    }
    # Cache for public widget
    with open(WIDGET_FILE, "w") as f:
        json.dump(widget, f, ensure_ascii=False)
    return jsonify(widget)

@app.route("/api/widget/public")
def get_widget_public():
    """Public widget endpoint — returns cached data or empty state."""
    if os.path.exists(WIDGET_FILE):
        with open(WIDGET_FILE, "r") as f:
            data = json.load(f)
        return jsonify(data)
    return jsonify({
        "day": 1, "phase_name": "", "phase_icon": "",
        "progress": "0/30", "progress_pct": 0,
        "title": "Log in to start your journey",
        "affirmation": "Start your 30-day healing journey today",
        "badge": "", "error": None
    })

@app.route("/api/mood-chart")
@login_required
def get_mood_chart():
    uid = session["user_id"]
    prog = load_progress(uid)
    return jsonify(prog["mood_history"])

# ── Serve Frontend (no auth — landing/login pages are public) ──

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/widget")
def serve_widget():
    return send_from_directory("../widget", "widget.html")

# ── Favicon ──

@app.route("/favicon.ico")
def favicon():
    return "", 204

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5099
    print(f"🚀 Exaholic Game Server (bilingual + auth) — http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
