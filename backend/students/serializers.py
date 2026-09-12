from rest_framework import serializers

from .models import (AttendanceRecord, AttendanceSession, Course, CourseAssignment,
                     CourseEnrollment, InstitutionSetting, Lecturer, Notification,
                     QRCode, ScanLog, Student)


class QRCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = QRCode
        fields = ["token", "created_at", "is_active"]
        read_only_fields = fields


class StudentSerializer(serializers.ModelSerializer):
    qr_code = QRCodeSerializer(read_only=True)
    qr_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            "id",
            "user",
            "student_number",
            "first_name",
            "last_name",
            "gender",
            "date_of_birth",
            "programme",
            "school",
            "department",
            "year_of_study",
            "email",
            "phone",
            "national_id",
            "accommodation",
            "additional_id",
            "photo",
            "status",
            "approval_status",
            "qr_code",
            "qr_image_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "qr_code", "qr_image_url", "created_at", "updated_at"]

    def get_qr_image_url(self, obj):
        request = self.context.get("request")
        if not hasattr(obj, "qr_code"):
            return None
        path = f"/api/students/{obj.id}/qr/"
        return request.build_absolute_uri(path) if request else path


class ScanLogSerializer(serializers.ModelSerializer):
    student = StudentSerializer(read_only=True)
    scanned_by_username = serializers.CharField(source="scanned_by.username", read_only=True)

    class Meta:
        model = ScanLog
        fields = ["id", "student", "scanned_by_username", "scanned_at", "ip_address"]
        read_only_fields = fields


class ScanRequestSerializer(serializers.Serializer):
    token = serializers.UUIDField()


class StudentRegistrationSerializer(serializers.Serializer):
    student_number = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField(required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=80)
    last_name = serializers.CharField(max_length=80)
    programme = serializers.CharField(max_length=120)
    year_of_study = serializers.IntegerField(min_value=1, max_value=10)
    school = serializers.CharField(max_length=160, required=False, allow_blank=True)
    department = serializers.CharField(max_length=160, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    national_id = serializers.CharField(max_length=80, required=False, allow_blank=True)
    accommodation = serializers.CharField(max_length=160, required=False, allow_blank=True)
    additional_id = serializers.CharField(max_length=160, required=False, allow_blank=True)
    photo = serializers.ImageField(required=False, allow_null=True)


class InstitutionSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutionSetting
        fields = "__all__"
        read_only_fields = ["id", "updated_at"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = fields


class LecturerSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    course_count = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Lecturer
        fields = [
            "id",
            "user",
            "username",
            "password",
            "lecturer_id",
            "full_name",
            "title",
            "department",
            "email",
            "phone",
            "office_hours",
            "profile_photo",
            "course_count",
            "student_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "username", "lecturer_id", "course_count", "student_count", "created_at", "updated_at"]

    def get_course_count(self, obj):
        return obj.course_assignments.count()

    def get_student_count(self, obj):
        total = 0
        for assignment in obj.course_assignments.all():
            total += assignment.enrollments.count()
        return total


class CourseAssignmentSummarySerializer(serializers.ModelSerializer):
    lecturer_name = serializers.CharField(source="lecturer.full_name", read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    enrollment_count = serializers.SerializerMethodField()

    class Meta:
        model = CourseAssignment
        fields = [
            "id",
            "lecturer_name",
            "course_code",
            "course_title",
            "academic_year",
            "semester",
            "class_size",
            "status",
            "enrollment_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_enrollment_count(self, obj):
        return obj.enrollments.count()


class CourseSerializer(serializers.ModelSerializer):
    assignments = serializers.SerializerMethodField()
    enrollment_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "code",
            "title",
            "department",
            "level",
            "semester",
            "academic_year",
            "capacity",
            "description",
            "created_by",
            "assignments",
            "enrollment_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "assignments", "enrollment_count", "created_at", "updated_at"]

    def get_assignments(self, obj):
        assignments = obj.course_assignments.select_related("lecturer").all()
        return CourseAssignmentSummarySerializer(assignments, many=True).data

    def get_enrollment_count(self, obj):
        return obj.student_enrollments.count()


class CourseAssignmentSerializer(serializers.ModelSerializer):
    lecturer = serializers.PrimaryKeyRelatedField(queryset=Lecturer.objects.all())
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all())
    enrollment_count = serializers.SerializerMethodField()

    class Meta:
        model = CourseAssignment
        fields = [
            "id",
            "lecturer",
            "course",
            "academic_year",
            "semester",
            "class_size",
            "status",
            "enrollment_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "enrollment_count", "created_at", "updated_at"]

    def get_enrollment_count(self, obj):
        return obj.enrollments.count()


class CourseEnrollmentSerializer(serializers.ModelSerializer):
    student = serializers.PrimaryKeyRelatedField(queryset=Student.objects.all())
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all())
    assignment = serializers.PrimaryKeyRelatedField(queryset=CourseAssignment.objects.all(), required=False, allow_null=True)

    class Meta:
        model = CourseEnrollment
        fields = ["id", "student", "course", "assignment", "academic_year", "semester", "enrolled_at", "status"]
        read_only_fields = ["id", "enrolled_at"]


class AttendanceSessionSerializer(serializers.ModelSerializer):
    records = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = ["id", "course", "lecturer", "title", "session_date", "notes", "created_by", "records", "created_at"]
        read_only_fields = ["id", "course", "lecturer", "created_by", "records", "created_at"]

    def get_records(self, obj):
        return AttendanceRecordSerializer(obj.records.select_related("student").all(), many=True).data


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student = StudentSerializer(read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = ["id", "attendance_session", "student", "attended", "recorded_by", "recorded_at", "notes"]
        read_only_fields = ["id", "attendance_session", "student", "recorded_by", "recorded_at"]


class LecturerCourseAssignmentInputSerializer(serializers.Serializer):
    course_id = serializers.IntegerField(required=False, allow_null=True)
    code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    title = serializers.CharField(max_length=180, required=False, allow_blank=True)
    department = serializers.CharField(max_length=160, required=False, allow_blank=True)
    level = serializers.CharField(max_length=80, required=False, allow_blank=True)
    semester = serializers.CharField(max_length=40, required=False, allow_blank=True)
    academic_year = serializers.CharField(max_length=60, required=False, allow_blank=True)
    capacity = serializers.IntegerField(min_value=0, required=False, default=0)
    description = serializers.CharField(required=False, allow_blank=True)
    class_size = serializers.IntegerField(min_value=0, required=False, default=0)


class LecturerAttendanceInputSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=160, required=False, allow_blank=True)
    session_date = serializers.DateField(required=False)
    student_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    student_numbers = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    notes = serializers.CharField(required=False, allow_blank=True)


class CourseEnrollmentInputSerializer(serializers.Serializer):
    student_id = serializers.IntegerField(required=False, allow_null=True)
    student_number = serializers.CharField(required=False, allow_blank=True)
    academic_year = serializers.CharField(max_length=60, required=False, allow_blank=True)
    semester = serializers.CharField(max_length=40, required=False, allow_blank=True)

