from django.contrib import admin

from .models import QRCode, ScanLog, Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("student_number", "first_name", "last_name", "programme", "year_of_study", "status")
    list_filter = ("status", "gender", "year_of_study")
    search_fields = ("student_number", "first_name", "last_name", "programme", "email")


@admin.register(QRCode)
class QRCodeAdmin(admin.ModelAdmin):
    list_display = ("student", "token", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("student__student_number", "token")


@admin.register(ScanLog)
class ScanLogAdmin(admin.ModelAdmin):
    list_display = ("student", "scanned_by", "scanned_at", "ip_address")
    search_fields = ("student__student_number", "student__first_name", "student__last_name")

