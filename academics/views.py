from rest_framework import viewsets
from .models import AcademicYear, Term,  SchoolClass, Subject, Enrollment
from .serializers import (AcademicYearSerializer,
                          TermSerializer, 
                          EnrollmentSerializer, 
                          SubjectSerializer, 
                          SchoolClassSerializer)



class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()  # Usig all AcademicYear rows
    serializer_class = AcademicYearSerializer



class TermViewSet(viewsets.ModelViewSet):
    queryset  = Term.objects.all()   # Using all Term rows(objects created)
    serializer_class = TermSerializer



class SchoolClassViewSet(viewsets.ModelViewSet):
    queryset = SchoolClass.objects.all() 
    serializer_class = SchoolClassSerializer



class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer



class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
