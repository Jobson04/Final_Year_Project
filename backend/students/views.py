import csv
import os
from datetime import date
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from .models import InstitutionSetting, Notification, QRCode, ScanLog, Student
from .serializers import (InstitutionSettingSerializer, NotificationSerializer,
                           ScanLogSerializer, ScanRequestSerializer,
                           StudentRegistrationSerializer, StudentSerializer)
from .services import generate_qr_png, get_client_ip


class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    queryset = Student.objects.select_related("qr_code").all()

    def get_queryset(self):
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            queryset = queryset.filter(user=self.request.user)
        query = self.request.query_params.get("search")
        if query:
            queryset = queryset.filter(
                Q(student_number__icontains=query)
                | Q(first_name__icontains=query)
                | Q(last_name__icontains=query)
                | Q(programme__icontains=query)
            )
        return queryset

    def perform_create(self, serializer):
        student = serializer.save()
        QRCode.objects.get_or_create(student=student)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        student = self.get_object()
        student.approval_status = Student.ApprovalStatus.APPROVED
        student.status = Student.Status.ACTIVE
        student.save(update_fields=["approval_status", "status", "updated_at"])
        if student.user:
            Notification.objects.create(recipient=student.user, title="Registration approved", message="Your student registration has been approved.")
        return Response(self.get_serializer(student).data)

    @action(detail=False, methods=["get"])
    def analytics(self, request):
        return Response({
            "total_students": Student.objects.count(),
            "active_students": Student.objects.filter(status=Student.Status.ACTIVE).count(),
            "pending_approvals": Student.objects.filter(approval_status=Student.ApprovalStatus.PENDING).count(),
            "total_scans": ScanLog.objects.count(),
            "scans_today": ScanLog.objects.filter(scanned_at__date=date.today()).count(),
            "by_programme": list(Student.objects.values("programme").annotate(total=Count("id")).order_by("-total")),
        })

    @action(detail=False, methods=["get"])
    def export(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="students.csv"'
        writer = csv.writer(response)
        writer.writerow(["Student Number", "First Name", "Last Name", "Programme", "School", "Year", "Email", "Status"])
        for student in self.get_queryset():
            writer.writerow([student.student_number, student.first_name, student.last_name, student.programme, student.school, student.year_of_study, student.email, student.status])
        return response

    def perform_destroy(self, instance):
        instance.status = Student.Status.INACTIVE
        instance.save(update_fields=["status", "updated_at"])

    @action(detail=True, methods=["get"], url_path="qr")
    def qr(self, request, pk=None):
        student = self.get_object()
        qr_code, _ = QRCode.objects.get_or_create(student=student)
        buffer = generate_qr_png(qr_code.token)
        return HttpResponse(buffer.getvalue(), content_type="image/png")

    @action(detail=True, methods=["post"], url_path="regenerate-qr")
    def regenerate_qr(self, request, pk=None):
        student = self.get_object()
        qr_code, _ = QRCode.objects.get_or_create(student=student)
        qr_code.delete()
        QRCode.objects.create(student=student)
        serializer = self.get_serializer(student)
        return Response(serializer.data)


class ScanLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ScanLogSerializer
    queryset = ScanLog.objects.select_related("student", "student__qr_code", "scanned_by").all()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def scan_student(request):
    serializer = ScanRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    token = serializer.validated_data["token"]

    try:
        qr_code = QRCode.objects.select_related("student").get(token=token, is_active=True)
    except QRCode.DoesNotExist:
        return Response(
            {"success": False, "detail": "Invalid or inactive QR code."},
            status=status.HTTP_404_NOT_FOUND,
        )

    student = qr_code.student
    ScanLog.objects.create(
        student=student,
        scanned_by=request.user,
        ip_address=get_client_ip(request),
    )
    return Response(
        {
            "success": True,
            "student": StudentSerializer(student, context={"request": request}).data,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def register_student(request):
    serializer = StudentRegistrationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    User = get_user_model()
    registered_numbers = {
        number.strip() for number in os.getenv("REGISTERED_STUDENT_NUMBERS", "").split(",") if number.strip()
    }
    student_number = data["student_number"]
    if student_number not in registered_numbers:
        return Response({"detail": "This student computer number is not approved for registration."}, status=status.HTTP_400_BAD_REQUEST)
    if Student.objects.filter(student_number=student_number).exists() or User.objects.filter(username=student_number).exists():
        return Response({"detail": "This student computer number is already registered."}, status=status.HTTP_400_BAD_REQUEST)
    user = User.objects.create_user(username=student_number, email=data.get("email", ""), password=data["password"])
    student = Student.objects.create(
        user=user, student_number=student_number, first_name=data["first_name"], last_name=data["last_name"],
        email=data.get("email", ""), programme=data["programme"], school=data.get("school", ""),
        department=data.get("department", ""), year_of_study=data["year_of_study"], phone=data.get("phone", ""),
        national_id=data.get("national_id", ""), accommodation=data.get("accommodation", ""),
        additional_id=data.get("additional_id", ""), photo=data.get("photo"), gender=Student.Gender.OTHER,
        approval_status=Student.ApprovalStatus.PENDING, status=Student.Status.INACTIVE,
    )
    QRCode.objects.create(student=student)
    from rest_framework.authtoken.models import Token
    token, _ = Token.objects.get_or_create(user=user)
    return Response({
        "detail": "Registration submitted for approval.",
        "token": token.key,
        "user": {"id": user.id, "username": user.username, "email": user.email, "is_staff": False, "role": "student", "student_id": student.id},
    }, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
def verify_qr(request, token):
    try:
        qr_code = QRCode.objects.select_related("student").get(token=token, is_active=True)
    except QRCode.DoesNotExist:
        return Response({"valid": False, "detail": "Invalid QR code."}, status=status.HTTP_404_NOT_FOUND)
    return Response({"valid": True, "student": StudentSerializer(qr_code.student, context={"request": request}).data})


class InstitutionSettingViewSet(viewsets.ModelViewSet):
    serializer_class = InstitutionSettingSerializer
    queryset = InstitutionSetting.objects.all()
    permission_classes = [IsAdminUser]

    def get_object(self):
        return InstitutionSetting.objects.first() or InstitutionSetting.objects.create()


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

