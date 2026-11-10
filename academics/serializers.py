from rest_framework import serializers
from django.core.exceptions import ValidationError
from .models import AcademicYear, Term, SchoolClass, Subject, Enrollment, Attendance, Period, Lesson

class AcademicYearSerializer(serializers.ModelSerializer):  # Translates django objects into JSON
    class Meta:
        model =  AcademicYear
        fields = ["id", "year", "start_date", "end_date", "is_active", ]  #ids of the JSON btw


class TermSerializer(serializers.ModelSerializer):
   class Meta:                     #this is required to tell the Django Rest Framework where to fing the fields/ models
    model = Term
    fields = ["id","name", "start_date", "end_date", "is_active"]

class SchoolClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolClass
        fields = ["id", "name", "class_teacher"]

        
class SubjectSerializer(serializers.ModelSerializer):
   class Meta:

    model = Subject
    fields = ["id","name", "code"]


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




class PeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Period
        fields = ["id", "name", "start_time", "end_time", "is_lesson"]


class LessonSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    class_name = serializers.CharField(source="school_class.name", read_only=True)
    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            "id", "term", "school_class", "class_name", "day", "period",
            "subject", "subject_name", "teacher", "teacher_name", "room",
            "is_double",
        ]

    def get_teacher_name(self, obj):
        return obj.teacher.get_full_name() or obj.teacher.username

    def validate(self, attrs):
        lesson = self.instance or Lesson()
        for field, value in attrs.items():
            setattr(lesson, field, value)

        try:
            lesson.clean()
        except ValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc

        return attrs