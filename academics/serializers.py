from rest_framework import serializers
from .models import AcademicYear, Term, SchoolClass, Subject, Enrollment

class AcademicYearSerializer(serializers.ModelSerializer):  # Translates django objects into JSON
    class Meta:
        model =  AcademicYear
        fields = ["id", "year", "start_date", "end_date", "is_active", ]  #ids of the JSON btw


class TermSerializer(serializers.ModelSerializer):
    model = Term
    fields = ["name", "start_date", "end_date", "is_active"]

class SchoolClassSerializer(serializers.ModelSerializer):
    model = SchoolClass
    fields = ["name"]

class SubjectSerializer(serializers.ModelSerializer):
    model = Subject
    fields = ["name", "code"]


class EnrollmentSerializer(serializers.ModelSerializer):
    model = Enrollment
    fields = ["student", "school_class", "academic_year", "date_enrolled"]