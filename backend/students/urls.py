from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AttendanceRecordViewSet,
    AttendanceSessionViewSet,
    CourseAssignmentViewSet,
    CourseEnrollmentViewSet,
    CourseViewSet,
    InstitutionSettingViewSet,
    LecturerViewSet,
    NotificationViewSet,
    ScanLogViewSet,
    StudentViewSet,
    register_student,
    scan_student,
    verify_qr,
)


router = DefaultRouter()
router.register("students", StudentViewSet, basename="student")
router.register("lecturers", LecturerViewSet, basename="lecturer")
router.register("courses", CourseViewSet, basename="course")
router.register("course-assignments", CourseAssignmentViewSet, basename="course-assignment")
router.register("course-enrollments", CourseEnrollmentViewSet, basename="course-enrollment")
router.register("attendance-sessions", AttendanceSessionViewSet, basename="attendance-session")
router.register("attendance-records", AttendanceRecordViewSet, basename="attendance-record")
router.register("scans", ScanLogViewSet, basename="scan-log")
router.register("settings", InstitutionSettingViewSet, basename="settings")
router.register("notifications", NotificationViewSet, basename="notifications")

urlpatterns = [
    path("", include(router.urls)),
    path("scanner/scan/", scan_student, name="scanner-scan"),
    path("register/", register_student, name="student-register"),
    path("verify/<uuid:token>/", verify_qr, name="public-verify"),
]

