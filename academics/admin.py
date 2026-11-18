from django.contrib import admin
from .models import (
    AcademicYear,
    Term,
    SchoolClass,
    Subject,
    Enrollment,
    Attendance,
    Period,
    Lesson,
    Examination,
    ExaminationSubject,
    ExaminationMark,
)


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

@admin.register(Period)
class PeriodAdmin(admin.ModelAdmin):
    list_display = ["name", "start_time", "end_time", "is_lesson"]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = [
        "term", "school_class", "day", "period", "subject", "teacher", "room",
        "is_double",
    ]
    list_filter = ["term", "school_class", "teacher", "day"]
    list_select_related = ["term", "school_class", "period", "subject", "teacher"]


class ExaminationSubjectInline(admin.TabularInline):
    model = ExaminationSubject
    extra = 0
    readonly_fields = ["submitted_at"]


@admin.register(Examination)
class ExaminationAdmin(admin.ModelAdmin):
    list_display = ["title", "school_class", "term", "released_at", "include_rankings"]
    list_filter = ["term", "school_class", "released_at"]
    inlines = [ExaminationSubjectInline]


@admin.register(ExaminationMark)
class ExaminationMarkAdmin(admin.ModelAdmin):
    list_display = ["enrollment", "examination_subject", "score", "updated_at"]
    list_filter = ["examination_subject__examination", "examination_subject__subject"]