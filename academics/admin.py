from django.contrib import admin
from .models import AcademicYear, Term


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