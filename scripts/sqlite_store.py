#!/usr/bin/env python3
import argparse
import json
import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
  run_id TEXT PRIMARY KEY,
  generated_at TEXT NOT NULL,
  mode TEXT NOT NULL,
  report_path TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS items (
  item_id TEXT PRIMARY KEY,
  source_id TEXT,
  source_name TEXT,
  title TEXT,
  url TEXT,
  published_at TEXT,
  category TEXT,
  stage TEXT,
  item_json TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS selections (
  run_id TEXT,
  item_id TEXT,
  selected_for TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(run_id, item_id, selected_for)
);
"""

def init_db(conn):
    conn.executescript(SCHEMA)
    conn.commit()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", required=True)
    parser.add_argument("--action", required=True)
    parser.add_argument("--payload", default="{}")
    args = parser.parse_args()

    db_path = Path(args.db)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    init_db(conn)

    payload = json.loads(args.payload)

    if args.action == "health":
      print(json.dumps({"ok": True}))
      return

    if args.action == "save_run":
      conn.execute(
        "INSERT OR REPLACE INTO runs(run_id, generated_at, mode, report_path, payload_json) VALUES(?,?,?,?,?)",
        (payload["runId"], payload["generatedAt"], payload["mode"], payload["reportPath"], json.dumps(payload["payload"], ensure_ascii=False)),
      )
      conn.commit()
      print(json.dumps({"ok": True}))
      return

    if args.action == "upsert_items":
      stage = payload["stage"]
      for item in payload["items"]:
        conn.execute(
          """INSERT OR REPLACE INTO items(item_id, source_id, source_name, title, url, published_at, category, stage, item_json)
             VALUES(?,?,?,?,?,?,?,?,?)""",
          (item["id"], item.get("sourceId"), item.get("sourceName"), item.get("title"), item.get("url"), item.get("publishedAt"), item.get("category"), stage, json.dumps(item, ensure_ascii=False)),
        )
      conn.commit()
      print(json.dumps({"ok": True}))
      return

    if args.action == "mark_selections":
      run_id = payload["runId"]
      for item in payload["selected"]:
        conn.execute(
          "INSERT OR REPLACE INTO selections(run_id, item_id, selected_for) VALUES(?,?,?)",
          (run_id, item["itemId"], item["selectedFor"]),
        )
      conn.commit()
      print(json.dumps({"ok": True}))
      return

    if args.action == "recent_runs":
      mode = payload["mode"]
      days = int(payload["days"])
      rows = conn.execute(
        "SELECT payload_json FROM runs WHERE mode = ? AND datetime(generated_at) >= datetime('now', ?) ORDER BY datetime(generated_at) DESC",
        (mode, f"-{days} days"),
      ).fetchall()
      result = [json.loads(row[0]) for row in rows]
      print(json.dumps({"ok": True, "runs": result}, ensure_ascii=False))
      return

    print(json.dumps({"ok": False, "error": f"unknown action {args.action}"}))

if __name__ == "__main__":
    main()
