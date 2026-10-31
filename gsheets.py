# -*- coding: utf-8 -*-
"""Kimi Sheets Bridge — клиент для работы с Google Sheets через Apps Script Web App.

Бесплатно, без Google Cloud Console. Секреты: JSON {"url": ..., "token": ...}
(путь в SECRETS_PATH ниже).

Примеры:
  python gsheets.py list <spreadsheetId>
  python gsheets.py read <spreadsheetId> [range] [--sheet "Лист1"]
  python gsheets.py write <spreadsheetId> <range> '[["a","b"],["c","d"]]' [--sheet "Лист1"]
  python gsheets.py append <spreadsheetId> '[["a","b"]]' [--sheet "Лист1"]
  python gsheets.py create-sheet <spreadsheetId> "Новый лист"
  python gsheets.py create-spreadsheet "Название таблицы"
"""
import argparse
import json
import sys
import urllib.parse
import urllib.request

SECRETS_PATH = r"F:\Work\_secrets\gsheets-bridge.json"


def _config():
    with open(SECRETS_PATH, encoding="utf-8") as f:
        cfg = json.load(f)
    return cfg["url"], cfg["token"]


def _fetch(url, payload=None):
    """POST возвращает 302 на script.googleusercontent.com — следуем вручную,
    чтобы не потерять тело и кодировку."""
    for _ in range(5):
        data = None
        headers = {}
        if payload is not None:
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=data, headers=headers)

        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *args, **kwargs):
                return None

        opener = urllib.request.build_opener(NoRedirect)
        try:
            resp = opener.open(req, timeout=60)
            return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code in (301, 302, 303, 307, 308) and "Location" in e.headers:
                url = e.headers["Location"]
                payload = None  # дальше только GET по echo-ссылке
                continue
            raise
    raise RuntimeError("Слишком много редиректов")


def _get(params):
    url, token = _config()
    params = dict(params, token=token)
    sep = "&" if "?" in url else "?"
    return _fetch(url + sep + urllib.parse.urlencode(params))


def _post(payload):
    url, token = _config()
    return _fetch(url, dict(payload, token=token))


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("cmd", choices=["list", "read", "write", "append",
                                   "create-sheet", "create-spreadsheet"])
    p.add_argument("id", help="spreadsheetId или название для create-spreadsheet")
    p.add_argument("extra", nargs="?", help="range (read/write) или JSON values")
    p.add_argument("values", nargs="?", help="JSON values для write")
    p.add_argument("--sheet", help="Имя листа (по умолчанию первый)")
    a = p.parse_args()

    if a.cmd == "list":
        out = _get({"id": a.id, "action": "list"})
    elif a.cmd == "read":
        out = _get({"id": a.id, "range": a.extra or "A1:Z100",
                    **({"sheet": a.sheet} if a.sheet else {})})
    elif a.cmd == "write":
        out = _post({"id": a.id, "range": a.extra,
                     "values": json.loads(a.values),
                     **({"sheet": a.sheet} if a.sheet else {})})
    elif a.cmd == "append":
        out = _post({"id": a.id, "action": "append",
                     "values": json.loads(a.extra),
                     **({"sheet": a.sheet} if a.sheet else {})})
    elif a.cmd == "create-sheet":
        out = _post({"id": a.id, "action": "createSheet", "name": a.extra})
    elif a.cmd == "create-spreadsheet":
        out = _post({"action": "createSpreadsheet", "title": a.id})
    json.dump(out, sys.stdout, ensure_ascii=False, indent=2)
    print()


if __name__ == "__main__":
    main()
