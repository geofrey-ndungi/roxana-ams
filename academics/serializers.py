from rest_framework import serializers
from .models import AcademicYear, Term, SchoolClass, Subject, Enrollment, Attendance

class AcademicYearSerializer(serializers.ModelSerializer):  # Translates django objects into JSON
    class Meta:
        model =  AcademicYear
        fields = ["id", "year", "start_date", "end_date", "is_active", ]  #ids of the JSON btw


class TermSerializer(serializers.ModelSerializer):
   class Meta:                     #this is required to tell the Django Rest Framework where to fing the fields/ models
    model = Term
    fields = ["name", "start_date", "end_date", "is_active"]

class SchoolClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolClass
        fields = ["id", "name", "class_teacher"]

        
class SubjectSerializer(serializers.ModelSerializer):
   class Meta:

    model = Subject
    fields = ["name", "code"]


class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = [
            "id", "student", "student_name",
            "school_class", "academic_year", "date_enrolled",
        ]

    def get_student_name(self, obj):
        # to use the full name if it exists, otherwise fall back to the username
        return obj.student.get_full_name() or obj.student.username

class AttendanceSerializer(serializers.ModelSerializer):
  class Meta:
    model = Attendance
    fields = ["id", "enrollment", "date", "status", "reason", "recorded_by"]