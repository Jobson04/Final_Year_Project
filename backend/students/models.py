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


class Lecturer(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lecturer_profile")
    lecturer_id = models.CharField(max_length=40, unique=True, blank=True)
    full_name = models.CharField(max_length=160)
    title = models.CharField(max_length=120, blank=True)
    department = models.CharField(max_length=160, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    office_hours = models.CharField(max_length=200, blank=True)
    profile_photo = models.ImageField(upload_to="lecturers/photos/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return f"{self.lecturer_id or self.user.username} - {self.full_name}"

    def save(self, *args, **kwargs):
        if not self.lecturer_id:
            prefix = "LECT"
            last = Lecturer.objects.filter(lecturer_id__startswith=prefix).order_by("-lecturer_id").first()
            sequence = int(last.lecturer_id[-5:]) + 1 if last and last.lecturer_id[-5:].isdigit() else 1
            self.lecturer_id = f"{prefix}{sequence:05d}"
        super().save(*args, **kwargs)


class Course(models.Model):
    code = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=180)
    department = models.CharField(max_length=160, blank=True)
    level = models.CharField(max_length=80, blank=True)
    semester = models.CharField(max_length=40, blank=True)
    academic_year = models.CharField(max_length=60, blank=True)
    capacity = models.PositiveIntegerField(default=0)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_courses")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} - {self.title}"


class CourseAssignment(models.Model):
    lecturer = models.ForeignKey(Lecturer, on_delete=models.CASCADE, related_name="course_assignments")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="course_assignments")
    academic_year = models.CharField(max_length=60, blank=True)
    semester = models.CharField(max_length=40, blank=True)
    class_size = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, default="active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("lecturer", "course", "academic_year", "semester")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.lecturer.full_name} teaches {self.course.code}"


class CourseEnrollment(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="course_enrollments")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="student_enrollments")
    assignment = models.ForeignKey(CourseAssignment, on_delete=models.SET_NULL, null=True, blank=True, related_name="enrollments")
    academic_year = models.CharField(max_length=60, blank=True)
    semester = models.CharField(max_length=40, blank=True)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default="active")

    class Meta:
        unique_together = ("student", "course", "academic_year", "semester")
        ordering = ["-enrolled_at"]

    def __str__(self):
        return f"{self.student.student_number} enrolled in {self.course.code}"


class AttendanceSession(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="attendance_sessions")
    lecturer = models.ForeignKey(Lecturer, on_delete=models.SET_NULL, null=True, blank=True, related_name="attendance_sessions")
    title = models.CharField(max_length=160, blank=True)
    session_date = models.DateField()
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="attendance_sessions_created")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-session_date", "-created_at"]

    def __str__(self):
        return f"{self.course.code} - {self.session_date}"


class AttendanceRecord(models.Model):
    attendance_session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name="records")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="attendance_records")
    attended = models.BooleanField(default=False)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="attendance_records_marked")
    recorded_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ("attendance_session", "student")
        ordering = ["student__last_name", "student__first_name"]

    def __str__(self):
        return f"{self.student.student_number} - {'Present' if self.attended else 'Absent'}"


class InstitutionSetting(models.Model):
    name = models.CharField(max_length=160, default="Your Institution")
    logo = models.ImageField(upload_to="institution/", null=True, blank=True)
    logo_url = models.URLField(blank=True)
    logo_image = models.ImageField(upload_to="institution/logos/", null=True, blank=True)
    signature_image = models.ImageField(upload_to="institution/signatures/", null=True, blank=True)
    header_color = models.CharField(max_length=20, default="#123b63")
    accent_color = models.CharField(max_length=20, default="#d49a27")
    background_color = models.CharField(max_length=20, default="#ffffff")
    font_family = models.CharField(max_length=40, default="Arial, sans-serif")
    additional_id_label = models.CharField(max_length=80, default="Additional ID")
    accommodation_label = models.CharField(max_length=80, default="Accommodation")
    signatory_name = models.CharField(max_length=120, default="Registrar")
    signatory_title = models.CharField(max_length=120, blank=True)
    office = models.CharField(max_length=160, default="the Administration Office")
    primary_color = models.CharField(max_length=20, default="#123b63")
    secondary_color = models.CharField(max_length=20, default="#d49a27")
    student_label = models.CharField(max_length=80, default="Student")
    card_size = models.CharField(max_length=20, default="CR80")
    orientation = models.CharField(max_length=20, default="portrait")
    layout_template = models.CharField(max_length=40, default="student")
    field_order = models.JSONField(default=list, blank=True)
    visible_fields = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)


class Notification(models.Model):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=160)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

