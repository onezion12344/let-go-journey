#!/usr/bin/env python3
"""
Exaholic Game — Backend Server (Bilingual)
Flask + JSON + ?lang=zh|en parameter support.
"""

import json, os, datetime, sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
CONTENT_DIR = os.path.join(BASE_DIR, "..", "content")
PROGRESS_FILE = os.path.join(DATA_DIR, "progress.json")
WIDGET_FILE = os.path.join(DATA_DIR, "widget.json")

LANG_FILE_MAP = {"zh": "content_zh.json", "en": "content_en.json"}

os.makedirs(DATA_DIR, exist_ok=True)

def load_content(lang="zh"):
    fname = LANG_FILE_MAP.get(lang, "content_zh.json")
    path = os.path.join(CONTENT_DIR, fname)
    if not os.path.exists(path):
        path = os.path.join(CONTENT_DIR, "content_zh.json")
    with open(path, "r") as f:
        return json.load(f)

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r") as f:
            return json.load(f)
    return {
        "current_day": 1, "completed_days": [], "mood_history": [],
        "journal_entries": {}, "start_date": str(datetime.date.today()), "lang": "zh"
    }

def save_progress(data):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# ── Content API ──

@app.route("/api/content")
def get_content():
    lang = request.args.get("lang", "zh")
    return jsonify(load_content(lang))

@app.route("/api/content/day/<int:day>")
def get_day(day):
    lang = request.args.get("lang", "zh")
    content = load_content(lang)
    for d in content["days"]:
        if d["day"] == day:
            return jsonify(d)
    return jsonify({"error": "Day not found"}), 404

# ── Progress API ──

@app.route("/api/progress")
def get_progress():
    return jsonify(load_progress())

@app.route("/api/progress/lang", methods=["POST"])
def set_lang():
    data = request.json
    prog = load_progress()
    prog["lang"] = data.get("lang", "zh")
    save_progress(prog)
    return jsonify(prog)

@app.route("/api/progress/start", methods=["POST"])
def start_game():
    prog = load_progress()
    if not prog.get("started_today"):
        prog["start_date"] = str(datetime.date.today())
        prog["started_today"] = True
        save_progress(prog)
    return jsonify(prog)

@app.route("/api/progress/complete-day", methods=["POST"])
def complete_day():
    data = request.json
    prog = load_progress()
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

    save_progress(prog)
    return jsonify(prog)

@app.route("/api/progress/reset", methods=["POST"])
def reset_progress():
    default = {
        "current_day": 1, "completed_days": [], "mood_history": [],
        "journal_entries": {}, "start_date": str(datetime.date.today()), "lang": "zh"
    }
    save_progress(default)
    return jsonify(default)

# ── Widget API ──

@app.route("/api/widget")
def get_widget():
    prog = load_progress()
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
        "day": day_num,
        "phase_name": phase_name,
        "phase_icon": phase_icon,
        "progress": f"{total}/30",
        "progress_pct": round(total / 30 * 100),
        "title": day_data["title"] if day_data else "",
        "affirmation": day_data["affirmation"] if day_data else "",
        "badge": day_data["badge"] if day_data else "",
    }
    with open(WIDGET_FILE, "w") as f:
        json.dump(widget, f, ensure_ascii=False)
    return jsonify(widget)

# ── Mood Chart Data ──

@app.route("/api/mood-chart")
def get_mood_chart():
    prog = load_progress()
    return jsonify(prog["mood_history"])

# ── Serve Frontend ──

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/widget")
def serve_widget():
    return send_from_directory("../widget", "widget.html")

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5099
    print(f"🚀 Exaholic Game Server (bilingual) — http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
