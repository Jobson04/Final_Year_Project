from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ScanLogViewSet, StudentViewSet, scan_student


router = DefaultRouter()
router.register("students", StudentViewSet, basename="student")
router.register("scans", ScanLogViewSet, basename="scan-log")

urlpatterns = [
    path("", include(router.urls)),
    path("scanner/scan/", scan_student, name="scanner-scan"),
]

