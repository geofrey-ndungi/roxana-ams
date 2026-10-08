from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings




# Create your models here.
class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        TEACHER = "TEACHER", "Teacher"
        STUDENT = "STUDENT", "Student"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT, #  Default is STUDENT since most users created via public-facing
    )
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    photo = models.ImageField(upload_to="photos/", blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


class Guardian(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete= models.CASCADE,
        related_name= "guardians",
        limit_choices_to= {"role": "STUDENT"},

    )

    name = models.CharField(max_length=100)
    relationship = models.CharField(max_length=50)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(blank=True)

    def __str__(self):
        return f"{self.name} ({self.relationship}) - {self.student.username}"