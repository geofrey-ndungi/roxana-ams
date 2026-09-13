from rest_framework import viewsets
from .models import AcademicYear
from .serializers import AcademicYearSerializer


class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()  # Usig all AcademicYear rows
    serializer_class = AcademicYearSerializer
