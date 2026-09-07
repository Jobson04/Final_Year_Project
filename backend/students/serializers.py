from rest_framework import serializers

from .models import QRCode, ScanLog, Student


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
            "student_number",
            "first_name",
            "last_name",
            "gender",
            "date_of_birth",
            "programme",
            "school",
            "year_of_study",
            "email",
            "phone",
            "photo",
            "status",
            "qr_code",
            "qr_image_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "qr_code", "qr_image_url", "created_at", "updated_at"]

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

