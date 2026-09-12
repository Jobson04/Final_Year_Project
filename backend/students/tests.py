from io import BytesIO

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase
from PIL import Image

from .models import Course, CourseAssignment, CourseEnrollment, Lecturer, QRCode, ScanLog, Student


class StudentApiTests(APITestCase):
    def setUp(self):
        self.user, created = User.objects.get_or_create(username="admin")
        if created:
            self.user.set_password("pass12345")
            self.user.save()
        self.token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    def test_lecturer_registration_requires_school_email(self):
        response = self.client.post(
            "/api/lecturers/",
            {
                "username": "lecturer1",
                "password": "pass12345",
                "full_name": "Dr. Jane Doe",
                "email": "jane@gmail.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("school email", response.data["detail"].lower())

    def test_lecturer_registration_allows_public_signup_with_school_email(self):
        self.client.credentials()

        response = self.client.post(
            "/api/lecturers/",
            {
                "username": "lecturer_public",
                "password": "pass12345",
                "full_name": "Dr. Jane Doe",
                "email": "jane@university.edu",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(username="lecturer_public").exists())

    def test_lecturer_registration_allows_unza_school_email_format(self):
        self.client.credentials()

        response = self.client.post(
            "/api/lecturers/",
            {
                "username": "lecturer_unza",
                "password": "pass12345",
                "full_name": "Jane Doe",
                "email": "jane.doe@cs.unza.zm",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(username="lecturer_unza").exists())

    def test_admin_cannot_list_lecturers_or_attendance_sessions(self):
        response = self.client.get("/api/lecturers/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

        attendance_response = self.client.get("/api/attendance-sessions/")
        self.assertEqual(attendance_response.status_code, 200)
        self.assertEqual(attendance_response.data, [])

    def test_lecturer_can_list_students_from_assigned_courses(self):
        lecturer_user = User.objects.create_user(username="lecturer_for_students", email="lecturer@example.edu", password="pass12345")
        lecturer = Lecturer.objects.create(
            user=lecturer_user,
            full_name="Dr. Lecturer",
            department="Computer Science",
            email="lecturer@example.edu",
            office_hours="Mon 09:00-11:00",
        )

        student = Student.objects.create(
            student_number="2021378535",
            first_name="John",
            last_name="Banda",
            gender="male",
            programme="Computer Science",
            year_of_study=3,
        )

        course = Course.objects.create(
            code="CS101",
            title="Intro to Programming",
            department="Computer Science",
            level="100",
            semester="Semester 1",
            academic_year="2026",
            capacity=50,
            description="Intro course",
            created_by=lecturer_user,
        )

        assignment = CourseAssignment.objects.create(
            lecturer=lecturer,
            course=course,
            academic_year="2026",
            semester="Semester 1",
            class_size=50,
        )

        CourseEnrollment.objects.create(
            student=student,
            course=course,
            assignment=assignment,
            academic_year="2026",
            semester="Semester 1",
        )

        self.client.force_authenticate(user=lecturer_user)
        response = self.client.get("/api/students/", format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["student_number"], student.student_number)

    def test_student_registration_creates_qr_code(self):
        response = self.client.post(
            "/api/students/",
            {
                "student_number": "2021378535",
                "first_name": "John",
                "last_name": "Banda",
                "gender": "male",
                "programme": "Computer Science",
                "school": "School of Natural Sciences",
                "year_of_study": 3,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Student.objects.count(), 1)
        self.assertEqual(QRCode.objects.count(), 1)

    def test_student_registration_accepts_photo_upload(self):
        image = BytesIO()
        Image.new("RGB", (8, 8), color="white").save(image, format="PNG")
        image.seek(0)
        photo = SimpleUploadedFile("student-id.png", image.read(), content_type="image/png")

        response = self.client.post(
            "/api/students/",
            {
                "student_number": "2021378536",
                "first_name": "Mary",
                "last_name": "Phiri",
                "gender": "female",
                "programme": "Information Systems",
                "school": "School of Natural Sciences",
                "year_of_study": 2,
                "photo": photo,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Student.objects.get(student_number="2021378536").photo.name)

    def test_scan_valid_token_returns_student_and_logs_scan(self):
        student = Student.objects.create(
            student_number="2021378535",
            first_name="John",
            last_name="Banda",
            gender="male",
            programme="Computer Science",
            year_of_study=3,
        )
        qr_code = QRCode.objects.create(student=student)

        response = self.client.post("/api/scanner/scan/", {"token": str(qr_code.token)}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["student"]["student_number"], "2021378535")
        self.assertEqual(ScanLog.objects.count(), 1)
