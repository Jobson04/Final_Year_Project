import uuid

from django.conf import settings
from django.db import models


class Student(models.Model):
    class Gender(models.TextChoices):
        FEMALE = "female", "Female"
        MALE = "male", "Male"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    class ApprovalStatus(models.TextChoices):
        PENDING = "pending", "Pending approval"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="student_profile")
    student_number = models.CharField(max_length=40, unique=True, blank=True)
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    gender = models.CharField(max_length=20, choices=Gender.choices)
    date_of_birth = models.DateField(null=True, blank=True)
    programme = models.CharField(max_length=120)
    school = models.CharField(max_length=160, blank=True)
    department = models.CharField(max_length=160, blank=True)
    year_of_study = models.PositiveSmallIntegerField(default=1)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    national_id = models.CharField(max_length=80, blank=True)
    accommodation = models.CharField(max_length=160, blank=True)
    additional_id = models.CharField(max_length=160, blank=True)
    photo = models.ImageField(upload_to="students/photos/", null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    approval_status = models.CharField(max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.APPROVED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.student_number} - {self.first_name} {self.last_name}"

    def save(self, *args, **kwargs):
        if not self.student_number:
            from datetime import date
            prefix = str(date.today().year)
            last = Student.objects.filter(student_number__startswith=prefix).order_by("-student_number").first()
            sequence = int(last.student_number[-5:]) + 1 if last and last.student_number[-5:].isdigit() else 1
            self.student_number = f"{prefix}{sequence:05d}"
        super().save(*args, **kwargs)


class QRCode(models.Model):
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name="qr_code")
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"QR for {self.student.student_number}"


class ScanLog(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="scan_logs")
    scanned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="student_scans",
    )
    scanned_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-scanned_at"]

    def __str__(self):
        return f"{self.student.student_number} scanned at {self.scanned_at:%Y-%m-%d %H:%M}"


class InstitutionSetting(models.Model):
    name = models.CharField(max_length=160, default="Your Institution")
    logo = models.ImageField(upload_to="institution/", null=True, blank=True)
    logo_url = models.URLField(blank=True)
    header_color = models.CharField(max_length=20, default="#123b63")
    accent_color = models.CharField(max_length=20, default="#d49a27")
    background_color = models.CharField(max_length=20, default="#ffffff")
    font_family = models.CharField(max_length=40, default="Arial, sans-serif")
    additional_id_label = models.CharField(max_length=80, default="Additional ID")
    accommodation_label = models.CharField(max_length=80, default="Accommodation")
    signatory_name = models.CharField(max_length=120, default="Registrar")
    office = models.CharField(max_length=160, default="the Administration Office")
    primary_color = models.CharField(max_length=20, default="#123b63")
    secondary_color = models.CharField(max_length=20, default="#d49a27")
    student_label = models.CharField(max_length=80, default="Student")
    signatory_title = models.CharField(max_length=120, blank=True)
    updated_at = models.DateTimeField(auto_now=True)


class Notification(models.Model):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=160)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

