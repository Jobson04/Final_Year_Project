from rest_framework import serializers

from .models import InstitutionSetting, Notification, QRCode, ScanLog, Student


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

