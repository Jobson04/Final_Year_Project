import sqlite3
from pathlib import Path

base = Path(r"c:\Users\Jobson Ngulube\Desktop\Final_Year_Project\smart_student_sdentification_system")
db = base / "backend" / "db.sqlite3"
print(f"DB: {db}")
print("exists", db.exists())
conn = sqlite3.connect(db)
cur = conn.cursor()
cur.execute("select username, is_staff, is_superuser, password from auth_user where username='admin'")
rows = cur.fetchall()
print(rows)
conn.close()
