from django.db import models
from django.conf import settings




# Create your models here.
class AcademicYear(models.Model):
    year = models.PositiveIntegerField(unique=True)  # e.g. 2026
    start_date = models.DateField()  # e.g. 2026-01-01
    end_date = models.DateField()    # e.g. 2026-12-31
    is_active = models.BooleanField(default=False)

    class Meta:  # this is to show the newest year
        ordering = ["-year"] # the - is to show the newest year first

    def __str__(self):
        return str(self.year)


class Term(models.Model):
    class TermName(models.TextChoices):
        TERM_1 = "TERM_1", "Term 1"
        TERM_2 = "TERM_2", "Term 2"              # to avoid errors(spelling)
        TERM_3 = "TERM_3", "Term 3"

    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name="terms",
    )
    name = models.CharField(max_length=20, choices=TermName.choices)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)

    class Meta:
        ordering = ["academic_year", "start_date"]
        unique_together = ["academic_year", "name"]  # no duplicate "Term 1" in same year

    def __str__(self):
        return f"{self.get_name_display()} - {self.academic_year.year}"

class SchoolClass(models.Model):
    name = models.CharField(max_length=50, unique=True)  # e.g. "Grade 8"
    class_teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="classes_taught",
        limit_choices_to={"role": "TEACHER"},
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Subject(models.Model):
    name = models.CharField(max_length=100, unique=True)  # e.g. "Mathematics"
    code = models.CharField(max_length=20, unique=True, blank=True, null=True)  # e.g. "MATH101"

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Enrollment(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,   # instead of importing User directly — this is the correct way to reference your custom user model from a different app.
        on_delete=models.CASCADE,
        related_name="enrollments",
        limit_choices_to={"role": "STUDENT"}, #dmin dropdown for picking a student, only show users where role = STUDENT
    )
    school_class = models.ForeignKey(
        SchoolClass,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    date_enrolled = models.DateField(auto_now_add=True)  # automatically records today's date the first time this row is created. You don't set it manually

    class Meta:
        unique_together = ["student", "academic_year"] #enforces "one enrollment per student per year." If you try to enroll the same student twice in the same year, the database itself will reject it
        ordering = ["academic_year", "school_class"]

    def __str__(self):
        return f"{self.student.username} - {self.school_class} ({self.academic_year})"



class Attendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        ABSENT = "ABSENT", "Absent"
        LATE = "LATE", "Late"
        EXCUSED = "EXCUSED", "Excused"

    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    date = models.DateField()
    status = models.CharField(max_length=10, choices=Status.choices)
    reason = models.CharField(max_length=255, blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_recorded",
        limit_choices_to={"role": "TEACHER"},
    )

    class Meta:
        ordering = ["-date"]
        unique_together = ["enrollment", "date"] #stops a student from accidentally getting two attendance records on the same day. One record per student per day

    def __str__(self):
        return f"{self.enrollment.student.username} - {self.date} - {self.get_status_display()}"
