from django.contrib import admin
from .models import AcademicYear, Term ,SchoolClass, Subject, Enrollment, Attendance


class TermInline(admin.TabularInline):
    model = Term
    extra = 1


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ["year", "start_date", "end_date", "is_active"]
    inlines = [TermInline]


@admin.register(Term)
class TermAdmin(admin.ModelAdmin):
    list_display = ["name", "academic_year", "start_date", "end_date", "is_active"]
    list_filter = ["academic_year"]

@admin.register(SchoolClass)
class SchoolClassAdmin(admin.ModelAdmin):
    list_display = ["name", "class_teacher"]


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ["name", "code"]

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ["student", "school_class", "academic_year", "date_enrolled"]
    list_filter = ["academic_year", "school_class"]


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ["enrollment", "date", "status", "recorded_by"]
    list_filter = ["status", "date"]
