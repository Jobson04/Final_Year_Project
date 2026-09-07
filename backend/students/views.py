from django.db.models import Q
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import QRCode, ScanLog, Student
from .serializers import ScanLogSerializer, ScanRequestSerializer, StudentSerializer
from .services import generate_qr_png, get_client_ip


class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    queryset = Student.objects.select_related("qr_code").all()

    def get_queryset(self):
        queryset = super().get_queryset()
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

