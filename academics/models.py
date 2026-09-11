from django.db import models

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
        TERM_2 = "TERM_2", "Term 2"
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

