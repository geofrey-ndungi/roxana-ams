from rest_framework import serializers
from .models import AcademicYear

class AcademicYearSerializer(serializers.ModelSerializer):  # Translates django objects into JSON
    class Meta:
        model =  AcademicYear
        fields = ["id", "year", "start_date", "end_date", "is_active", ]  #ids of the JSON btw