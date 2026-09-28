from rest_framework import viewsets
from .models import AcademicYear, Term,  SchoolClass, Subject, Enrollment, Attendance
from .serializers import (AcademicYearSerializer,
                          TermSerializer, 
                          EnrollmentSerializer, 
                          SubjectSerializer, 
                          SchoolClassSerializer,
                          AttendanceSerializer)
from .permissions import IsAdminOrReadOnly, IsClassTeacherOrAdmin



class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()  # Usig all AcademicYear rows
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAdminOrReadOnly]



class TermViewSet(viewsets.ModelViewSet):
    queryset  = Term.objects.all()   # Using all Term rows(objects created)
    serializer_class = TermSerializer
    permission_classes = [IsAdminOrReadOnly]



class SchoolClassViewSet(viewsets.ModelViewSet):
    queryset = SchoolClass.objects.all() 
    serializer_class = SchoolClassSerializer
    permission_classes = [IsAdminOrReadOnly]



class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAdminOrReadOnly]



class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Enrollment.objects.select_related("student", "school_class")
        school_class = self.request.query_params.get("school_class")
        academic_year = self.request.query_params.get("academic_year")

        if school_class:
            queryset = queryset.filter(school_class_id=school_class)
        if academic_year:
            queryset = queryset.filter(academic_year_id=academic_year)

        return queryset


    

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes= [IsClassTeacherOrAdmin] 

