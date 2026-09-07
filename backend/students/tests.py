from io import BytesIO

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase
from PIL import Image

from .models import QRCode, ScanLog, Student


class StudentApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="admin", password="pass12345")
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

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
