import csv
import os
from datetime import date

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from .models import (
    AttendanceRecord,
    AttendanceSession,
    Course,
    CourseAssignment,
    CourseEnrollment,
    InstitutionSetting,
    Lecturer,
    Notification,
    QRCode,
    ScanLog,
    Student,
)
from .serializers import (
    AttendanceRecordSerializer,
    AttendanceSessionSerializer,
    CourseAssignmentSerializer,
    CourseEnrollmentSerializer,
    CourseSerializer,
    InstitutionSettingSerializer,
    LecturerSerializer,
    NotificationSerializer,
    ScanLogSerializer,
    ScanRequestSerializer,
    StudentRegistrationSerializer,
    StudentSerializer,
)
from .services import generate_qr_png, get_client_ip


def is_school_email(email):
    if not email:
        return False

    email = email.strip()
    if "@" not in email:
        return False

    local_part, domain = email.split("@", 1)
    domain = domain.lower()

    if domain.endswith(".unza.zm") or domain == "unza.zm":
        return "." in local_part and local_part.replace(".", "").replace("-", "").replace("_", "").isalnum()

    return "edu" in domain.split(".") or "ac" in domain.split(".")


class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    queryset = Student.objects.select_related("qr_code").all()

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_staff:
            return queryset

        lecturer = getattr(self.request.user, "lecturer_profile", None)
        if lecturer:
            queryset = queryset.filter(course_enrollments__assignment__lecturer=lecturer).distinct()
        else:
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
            Notification.objects.create(
                recipient=student.user,
                title="Registration approved",
                message="Your student registration has been approved.",
            )
        return Response(self.get_serializer(student).data)

    @action(detail=False, methods=["get"])
    def analytics(self, request):
        return Response(
            {
                "total_students": Student.objects.count(),
                "active_students": Student.objects.filter(status=Student.Status.ACTIVE).count(),
                "pending_approvals": Student.objects.filter(approval_status=Student.ApprovalStatus.PENDING).count(),
                "total_scans": ScanLog.objects.count(),
                "scans_today": ScanLog.objects.filter(scanned_at__date=date.today()).count(),
                "by_programme": list(
                    Student.objects.values("programme").annotate(total=Count("id")).order_by("-total")
                ),
            }
        )

    @action(detail=False, methods=["get"])
    def export(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="students.csv"'
        writer = csv.writer(response)
        writer.writerow(
            ["Student Number", "First Name", "Last Name", "Programme", "School", "Year", "Email", "Status"]
        )
        for student in self.get_queryset():
            writer.writerow(
                [
                    student.student_number,
                    student.first_name,
                    student.last_name,
                    student.programme,
                    student.school,
                    student.year_of_study,
                    student.email,
                    student.status,
                ]
            )
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


class LecturerViewSet(viewsets.ModelViewSet):
    serializer_class = LecturerSerializer
    queryset = Lecturer.objects.select_related("user").all()
    permission_classes = [AllowAny]

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_staff:
            return queryset.none()
        lecturer = getattr(self.request.user, "lecturer_profile", None)
        if lecturer:
            return queryset.filter(id=lecturer.id)
        return queryset.none()

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        username = data.get("username")
        password = data.get("password")
        email = (data.get("email") or "").strip()

        if not username or not password:
            return Response({"detail": "username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        if not is_school_email(email):
            return Response(
                {"detail": "Please use your school email address (for example: name@school.edu or name@school.ac.za)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User = get_user_model()
        if User.objects.filter(username=username).exists():
            return Response({"detail": "A lecturer with that username already exists."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_staff=False,
        )

        lecturer = Lecturer.objects.create(
            user=user,
            full_name=data.get("full_name", ""),
            title=data.get("title", ""),
            department=data.get("department", ""),
            email=email,
            phone=data.get("phone", ""),
            office_hours=data.get("office_hours", ""),
        )

        return Response(LecturerSerializer(lecturer, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        lecturer = getattr(request.user, "lecturer_profile", None)
        if not lecturer:
            return Response({"detail": "This account is not linked to a lecturer profile."}, status=status.HTTP_404_NOT_FOUND)
        return Response(LecturerSerializer(lecturer, context={"request": request}).data)

    @action(detail=False, methods=["get"], url_path="courses")
    def courses(self, request):
        lecturer = getattr(request.user, "lecturer_profile", None)
        if not lecturer:
            return Response({"detail": "You are not assigned as a lecturer."}, status=status.HTTP_404_NOT_FOUND)
        assignments = CourseAssignment.objects.filter(lecturer=lecturer).select_related("course", "lecturer")
        return Response(CourseAssignmentSerializer(assignments, many=True, context={"request": request}).data)

    @action(detail=False, methods=["get"], url_path="analytics")
    def analytics(self, request):
        lecturer = getattr(request.user, "lecturer_profile", None)
        if not lecturer:
            return Response({"detail": "You are not assigned as a lecturer."}, status=status.HTTP_404_NOT_FOUND)

        assignments = CourseAssignment.objects.filter(lecturer=lecturer)
        enrolled_students = CourseEnrollment.objects.filter(assignment__lecturer=lecturer).count()
        sessions = AttendanceSession.objects.filter(lecturer=lecturer).count()

        return Response(
            {
                "total_courses": assignments.count(),
                "total_students": enrolled_students,
                "total_sessions": sessions,
                "by_course": list(
                    CourseEnrollment.objects.filter(assignment__lecturer=lecturer)
                    .values("course__code", "course__title")
                    .annotate(total=Count("id"))
                    .order_by("-total")
                ),
            }
        )


class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    queryset = Course.objects.prefetch_related("course_assignments__lecturer").all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_staff:
            return queryset
        lecturer = getattr(self.request.user, "lecturer_profile", None)
        if lecturer:
            return queryset.filter(course_assignments__lecturer=lecturer).distinct()
        return queryset.none()

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        course = serializer.save(created_by=request.user)
        return Response(self.get_serializer(course, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="my")
    def my_courses(self, request):
        lecturer = getattr(request.user, "lecturer_profile", None)
        if not lecturer:
            return Response({"detail": "You are not assigned as a lecturer."}, status=status.HTTP_404_NOT_FOUND)

        assignments = CourseAssignment.objects.filter(lecturer=lecturer).select_related("course", "lecturer")
        return Response(CourseAssignmentSerializer(assignments, many=True, context={"request": request}).data)


class CourseAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = CourseAssignmentSerializer
    queryset = CourseAssignment.objects.select_related("lecturer", "course").all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_staff:
            return queryset
        lecturer = getattr(self.request.user, "lecturer_profile", None)
        if lecturer:
            return queryset.filter(lecturer=lecturer)
        return queryset.none()

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if not request.user.is_staff:
            lecturer = getattr(request.user, "lecturer_profile", None)
            if not lecturer:
                return Response({"detail": "Only lecturers can assign courses."}, status=status.HTTP_403_FORBIDDEN)
            data["lecturer"] = lecturer.id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        assignment = serializer.save()
        return Response(CourseAssignmentSerializer(assignment, context={"request": request}).data, status=status.HTTP_201_CREATED)


class CourseEnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = CourseEnrollmentSerializer
    queryset = CourseEnrollment.objects.select_related("student", "course", "assignment").all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_staff:
            return queryset
        lecturer = getattr(self.request.user, "lecturer_profile", None)
        if lecturer:
            return queryset.filter(assignment__lecturer=lecturer)
        return queryset.none()

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        student_id = data.get("student_id")
        student_number = data.get("student_number")
        course_id = data.get("course_id") or data.get("course")

        if not course_id:
            return Response({"detail": "course_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        if not student_id and not student_number:
            return Response({"detail": "student_id or student_number is required."}, status=status.HTTP_400_BAD_REQUEST)

        course = Course.objects.filter(id=course_id).first()
        if not course:
            return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        student = None
        if student_id:
            student = Student.objects.filter(id=student_id).first()
        elif student_number:
            student = Student.objects.filter(student_number=student_number).first()

        if not student:
            return Response({"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND)

        if not request.user.is_staff:
            lecturer = getattr(request.user, "lecturer_profile", None)
            if not lecturer:
                return Response({"detail": "Only lecturers can enroll students."}, status=status.HTTP_403_FORBIDDEN)
            assignment = CourseAssignment.objects.filter(course=course, lecturer=lecturer).first()
            if not assignment:
                return Response({"detail": "This course is not assigned to you."}, status=status.HTTP_403_FORBIDDEN)
            data["assignment"] = assignment.id

        data["student"] = student.id
        data["course"] = course.id

        existing = CourseEnrollment.objects.filter(
            student=student,
            course=course,
            academic_year=data.get("academic_year", ""),
            semester=data.get("semester", ""),
        ).first()

        if existing:
            return Response(CourseEnrollmentSerializer(existing, context={"request": request}).data)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        enrollment = serializer.save()
        return Response(CourseEnrollmentSerializer(enrollment, context={"request": request}).data, status=status.HTTP_201_CREATED)


class AttendanceSessionViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSessionSerializer
    queryset = AttendanceSession.objects.select_related("course", "lecturer", "created_by").prefetch_related("records__student").all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_staff:
            return queryset.none()
        lecturer = getattr(self.request.user, "lecturer_profile", None)
        if lecturer:
            return queryset.filter(lecturer=lecturer)
        return queryset.none()

    def create(self, request, *args, **kwargs):
        if request.user.is_staff:
            return Response({"detail": "Only lecturers can create attendance sessions."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        course_id = data.get("course_id") or data.get("course")
        if not course_id:
            return Response({"detail": "course_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        course = Course.objects.filter(id=course_id).first()
        if not course:
            return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        lecturer = getattr(request.user, "lecturer_profile", None)
        if not lecturer:
            return Response({"detail": "Only lecturers can create attendance sessions."}, status=status.HTTP_403_FORBIDDEN)

        assignment = CourseAssignment.objects.filter(course=course, lecturer=lecturer).first()
        if lecturer and not assignment:
            return Response({"detail": "This course is not assigned to you."}, status=status.HTTP_403_FORBIDDEN)

        session_date = data.get("session_date") or date.today().isoformat()
        session = AttendanceSession.objects.create(
            course=course,
            lecturer=lecturer,
            title=data.get("title", f"{course.code} Class"),
            session_date=session_date,
            notes=data.get("notes", ""),
            created_by=request.user,
        )

        student_ids = data.get("student_ids") or []
        student_numbers = data.get("student_numbers") or []

        enrolled_students = CourseEnrollment.objects.filter(course=course, status="active")
        if student_ids:
            enrolled_students = enrolled_students.filter(student_id__in=student_ids)
        if student_numbers:
            enrolled_students = enrolled_students.filter(student__student_number__in=student_numbers)

        for enrollment in enrolled_students.select_related("student"):
            AttendanceRecord.objects.get_or_create(
                attendance_session=session,
                student=enrollment.student,
                defaults={"recorded_by": request.user},
            )

        session = AttendanceSession.objects.get(id=session.id)
        return Response(AttendanceSessionSerializer(session, context={"request": request}).data, status=status.HTTP_201_CREATED)


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceRecordSerializer
    queryset = AttendanceRecord.objects.select_related("student", "attendance_session", "attendance_session__course").all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_staff:
            return queryset.none()
        lecturer = getattr(self.request.user, "lecturer_profile", None)
        if lecturer:
            return queryset.filter(attendance_session__lecturer=lecturer)
        return queryset.none()


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
        user=user,
        student_number=student_number,
        first_name=data["first_name"],
        last_name=data["last_name"],
        email=data.get("email", ""),
        programme=data["programme"],
        school=data.get("school", ""),
        department=data.get("department", ""),
        year_of_study=data["year_of_study"],
        phone=data.get("phone", ""),
        national_id=data.get("national_id", ""),
        accommodation=data.get("accommodation", ""),
        additional_id=data.get("additional_id", ""),
        photo=data.get("photo"),
        gender=Student.Gender.OTHER,
        approval_status=Student.ApprovalStatus.PENDING,
        status=Student.Status.INACTIVE,
    )
    QRCode.objects.create(student=student)
    from rest_framework.authtoken.models import Token

    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {
            "detail": "Registration submitted for approval.",
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_staff": False,
                "role": "student",
                "student_id": student.id,
            },
        },
        status=status.HTTP_201_CREATED,
    )


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

