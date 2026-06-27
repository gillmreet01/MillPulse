# -*- coding: utf-8 -*-
"""
Renders PNG versions of the system architecture and ER diagrams using Pillow,
so they can be embedded in the report without any external tooling/internet.
Outputs: architecture-diagram.png, er-diagram.png
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------- Colours ----------------
NAVY   = (15, 42, 71)
BLUE   = (37, 99, 235)
LIGHT  = (239, 246, 255)
PANEL  = (248, 250, 252)
WHITE  = (255, 255, 255)
BORDER = (203, 213, 225)
TEXT   = (15, 23, 42)
MUTED  = (100, 116, 139)
LINE   = (148, 163, 184)
GREEN  = (22, 163, 74)


def font(size, bold=False):
    paths = [r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
             r"C:\Windows\Fonts\segoeui.ttf"]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def text_w(draw, s, f):
    b = draw.textbbox((0, 0), s, font=f)
    return b[2] - b[0]


def centered_lines(draw, cx, cy, lines, f, fill, line_h):
    total = len(lines) * line_h
    y = cy - total / 2
    for ln in lines:
        w = text_w(draw, ln, f)
        draw.text((cx - w / 2, y), ln, font=f, fill=fill)
        y += line_h


# =====================================================================
# 1. ARCHITECTURE DIAGRAM
# =====================================================================
def build_architecture():
    W, H = 1400, 880
    img = Image.new("RGB", (W, H), WHITE)
    d = ImageDraw.Draw(img)

    f_title = font(30, True)
    f_tier = font(18, True)
    f_box = font(15, True)
    f_small = font(13)

    t = "System Architecture — Smart Paper Mill Production Monitoring Dashboard"
    d.text(((W - text_w(d, t, f_title)) / 2, 28), t, font=f_title, fill=NAVY)

    def tier(x, y, w, h, label):
        d.rounded_rectangle([x, y, x + w, y + h], radius=14, fill=PANEL, outline=BLUE, width=2)
        d.text((x + 18, y + 12), label, font=f_tier, fill=BLUE)

    def comp(x, y, w, h, lines):
        d.rounded_rectangle([x, y, x + w, y + h], radius=10, fill=WHITE, outline=BORDER, width=2)
        first = font(15, True)
        cx = x + w / 2
        # first line bold (title), rest muted
        ys = y + h / 2 - (len(lines) * 20) / 2
        for i, ln in enumerate(lines):
            ff = first if i == 0 else f_small
            col = TEXT if i == 0 else MUTED
            ww = text_w(d, ln, ff)
            d.text((cx - ww / 2, ys), ln, font=ff, fill=col)
            ys += 20

    def arrow(x1, y1, x2, y2, label):
        d.line([x1, y1, x2, y2], fill=NAVY, width=3)
        # arrowhead (pointing down)
        d.polygon([(x2 - 8, y2 - 12), (x2 + 8, y2 - 12), (x2, y2)], fill=NAVY)
        if label:
            lw = text_w(d, label, f_small)
            d.rectangle([(x1 + x2) / 2 - lw / 2 - 6, (y1 + y2) / 2 - 11,
                         (x1 + x2) / 2 + lw / 2 + 6, (y1 + y2) / 2 + 11], fill=WHITE, outline=BORDER)
            d.text(((x1 + x2) / 2 - lw / 2, (y1 + y2) / 2 - 8), label, font=f_small, fill=NAVY)

    # Tier 1 — Client
    tier(70, 110, 1260, 210, "CLIENT — Web Browser  (Presentation Layer)")
    comp(90, 175, 285, 120, ["Pages (HTML/CSS/JS)", "Login · Dashboard · Machines",
                             "Production · Maintenance", "Reports · Settings"])
    comp(401, 175, 285, 120, ["Shared Sidebar", "+ Auth Guard", "(JWT in localStorage)"])
    comp(712, 175, 285, 120, ["Chart.js", "charts & KPIs"])
    comp(1023, 175, 285, 120, ["MILL_DATA", "canonical demo", "dataset"])

    # Tier 2 — Server
    tier(70, 400, 1260, 180, "APPLICATION SERVER — Flask / Python  (Logic Layer)")
    comp(90, 460, 380, 110, ["Static file serving", "(serves HTML/CSS/JS)"])
    comp(510, 460, 380, 110, ["REST API", "/api/login · /api/me", "/api/users"])
    comp(930, 460, 380, 110, ["Auth middleware", "token_required · role_required", "JWT verify · bcrypt"])

    # Tier 3 — Storage
    tier(70, 660, 1260, 150, "DATA STORE  (Data Layer)")
    comp(480, 720, 440, 80, ["SQLite — users table", "(MySQL in production)"])

    # Arrows between tiers
    arrow(700, 320, 700, 398, "fetch() + Bearer JWT  (HTTPS)")
    arrow(700, 580, 700, 658, "SQL  (read / write)")

    img.save(os.path.join(HERE, "architecture-diagram.png"))
    print("Saved architecture-diagram.png", img.size)


# =====================================================================
# 2. ER DIAGRAM
# =====================================================================
ENTITIES = {
    "ROLES":              (50, 70,   [("role_id", "PK"), ("role_name", "")]),
    "USERS":              (50, 230,  [("user_id", "PK"), ("name", ""), ("email", ""),
                                      ("password_hash", ""), ("role_id", "FK"), ("is_active", "")]),
    "ACTIVITY_LOGS":      (50, 620,  [("log_id", "PK"), ("user_id", "FK"), ("action", ""), ("timestamp", "")]),
    "SHIFTS":             (440, 40,  [("shift_id", "PK"), ("shift_name", ""), ("start_time", ""), ("end_time", "")]),
    "PRODUCTION_RECORDS": (440, 300, [("record_id", "PK"), ("machine_id", "FK"), ("shift_id", "FK"),
                                      ("operator_id", "FK"), ("production_qty", ""), ("paper_grade", ""),
                                      ("efficiency", ""), ("downtime_min", "")]),
    "QUALITY_CHECKS":     (440, 760, [("check_id", "PK"), ("record_id", "FK"), ("inspector_id", "FK"),
                                      ("parameter", ""), ("value", ""), ("is_within_spec", "")]),
    "MACHINES":           (840, 110, [("machine_id", "PK"), ("machine_name", ""), ("department", ""),
                                      ("status", ""), ("capacity_tpd", ""), ("efficiency", "")]),
    "DOWNTIME_EVENTS":    (1240, 50, [("downtime_id", "PK"), ("machine_id", "FK"), ("shift_id", "FK"),
                                      ("logged_by", "FK"), ("reason_category", ""), ("duration_min", "")]),
    "MAINTENANCE_LOGS":   (1240, 400,[("maintenance_id", "PK"), ("machine_id", "FK"), ("engineer_id", "FK"),
                                      ("issue", ""), ("priority", ""), ("status", ""), ("estimated_cost", "")]),
    "THRESHOLDS":         (1240, 740,[("threshold_id", "PK"), ("machine_id", "FK"), ("parameter", ""),
                                      ("min_value", ""), ("max_value", "")]),
    "ALERTS":             (840, 760, [("alert_id", "PK"), ("machine_id", "FK"), ("type", ""),
                                      ("severity", ""), ("is_acknowledged", "")]),
}

RELATIONS = [
    ("ROLES", "USERS"), ("USERS", "PRODUCTION_RECORDS"), ("MACHINES", "PRODUCTION_RECORDS"),
    ("SHIFTS", "PRODUCTION_RECORDS"), ("PRODUCTION_RECORDS", "QUALITY_CHECKS"), ("USERS", "QUALITY_CHECKS"),
    ("MACHINES", "DOWNTIME_EVENTS"), ("SHIFTS", "DOWNTIME_EVENTS"), ("USERS", "DOWNTIME_EVENTS"),
    ("MACHINES", "MAINTENANCE_LOGS"), ("USERS", "MAINTENANCE_LOGS"), ("MACHINES", "ALERTS"),
    ("MACHINES", "THRESHOLDS"), ("USERS", "ACTIVITY_LOGS"),
]

BOX_W = 250
TITLE_H = 34
ROW_H = 24


def build_er():
    W, H = 1700, 1250
    img = Image.new("RGB", (W, H), WHITE)
    d = ImageDraw.Draw(img)
    f_title = font(26, True)
    f_ent = font(15, True)
    f_field = font(13)
    f_tag = font(11, True)
    f_card = font(13, True)

    t = "Entity-Relationship Diagram — Smart Paper Mill Production Monitoring Dashboard"
    d.text(((W - text_w(d, t, f_title)) / 2, 22), t, font=f_title, fill=NAVY)

    # Pre-compute rectangles (shift all entities down to clear the title)
    TOP = 56
    rects = {}
    for name, (x, y, fields) in ENTITIES.items():
        h = TITLE_H + len(fields) * ROW_H + 8
        rects[name] = (x, y + TOP, BOX_W, h)

    def center(r):
        return (r[0] + r[2] / 2, r[1] + r[3] / 2)

    def border_point(r, tx, ty):
        cx, cy = center(r)
        dx, dy = tx - cx, ty - cy
        if dx == 0 and dy == 0:
            return cx, cy
        sx = (r[2] / 2) / abs(dx) if dx != 0 else 1e9
        sy = (r[3] / 2) / abs(dy) if dy != 0 else 1e9
        s = min(sx, sy)
        return cx + dx * s, cy + dy * s

    # Draw relationship lines first (so entity boxes sit on top of the ends)
    for a, b in RELATIONS:
        ra, rb = rects[a], rects[b]
        ca, cb = center(ra), center(rb)
        pa = border_point(ra, *cb)
        pb = border_point(rb, *ca)
        d.line([pa[0], pa[1], pb[0], pb[1]], fill=LINE, width=2)
        # arrowhead at child (b)
        ang = math.atan2(pb[1] - pa[1], pb[0] - pa[0])
        size = 10
        d.polygon([
            (pb[0], pb[1]),
            (pb[0] - size * math.cos(ang - 0.4), pb[1] - size * math.sin(ang - 0.4)),
            (pb[0] - size * math.cos(ang + 0.4), pb[1] - size * math.sin(ang + 0.4)),
        ], fill=LINE)
        # cardinality labels: "1" near parent, "N" near child
        ox, oy = math.cos(ang), math.sin(ang)
        d.text((pa[0] + ox * 14 - 3, pa[1] + oy * 14 - 8), "1", font=f_card, fill=BLUE)
        d.text((pb[0] - ox * 22 - 3, pb[1] - oy * 22 - 8), "N", font=f_card, fill=BLUE)

    # Draw entities
    for name, (x, y, fields) in ENTITIES.items():
        x, y, w, h = rects[name]
        d.rounded_rectangle([x, y, x + w, y + h], radius=8, fill=WHITE, outline=BLUE, width=2)
        # title bar
        d.rounded_rectangle([x, y, x + w, y + TITLE_H], radius=8, fill=NAVY)
        d.rectangle([x, y + TITLE_H - 10, x + w, y + TITLE_H], fill=NAVY)  # square the bottom of title bar
        tw = text_w(d, name, f_ent)
        d.text((x + (w - tw) / 2, y + 8), name, font=f_ent, fill=WHITE)
        # fields
        fy = y + TITLE_H + 4
        for fname, tag in fields:
            d.text((x + 12, fy), fname, font=f_field, fill=TEXT)
            if tag:
                col = (180, 83, 9) if tag == "PK" else (3, 105, 161)
                d.text((x + w - 12 - text_w(d, tag, f_tag), fy + 1), tag, font=f_tag, fill=col)
            fy += ROW_H

    # legend
    d.text((50, H - 40), "PK = Primary Key      FK = Foreign Key      1 — N = one-to-many relationship",
           font=f_field, fill=MUTED)

    img.save(os.path.join(HERE, "er-diagram.png"))
    print("Saved er-diagram.png", img.size)


if __name__ == "__main__":
    build_architecture()
    build_er()
    print("Done.")
