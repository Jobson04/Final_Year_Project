<<<<<<< HEAD
# Final_Year_Project
=======
# Smart Student Identification System

A Django REST API and React single-page app for registering students, generating secure QR codes, scanning student ID cards, and displaying student information.

## Stack

- Backend: Django, Django REST Framework, SQLite, QRCode
- Frontend: React, Vite, React Router, Axios, html5-qrcode

## Backend Setup

```bash
cd backend`
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The API runs at `http://127.0.0.1:8000`.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://127.0.0.1:5173`.

### Student registration

Set the approved student computer numbers before starting the backend. Registration accepts only numbers in this list:

```powershell
$env:REGISTERED_STUDENT_NUMBERS="STU-001,STU-002,STU-003"
```

Administrators log in with `admin` / `admin123` after migrations. Students log in with their approved computer number and password. New students are logged in automatically after registration and remain pending until an administrator approves them.

## Main Workflow

1. Admin logs in.
2. Admin registers a student.
3. Backend generates a UUID QR token.
4. QR code image is available from the student details page.
5. Scanner reads the QR token.
6. Backend verifies the token and returns student information.
7. Successful scans are recorded in the scan log.

>>>>>>> 01a42e0 (Initial commit)
