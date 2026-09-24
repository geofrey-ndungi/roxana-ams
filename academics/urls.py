from rest_framework.routers import DefaultRouter
from .views import (AcademicYearViewSet, 
                    SubjectViewSet,
                    TermViewSet,
                    SchoolClassViewSet,
                    EnrollmentViewSet,
                    AttendanceViewSet
)




router = DefaultRouter()
router.register(r"academic-years", AcademicYearViewSet)
router.register(r"subjects", SubjectViewSet)
router.register(r"terms", TermViewSet)
router.register(r"school-classes", SchoolClassViewSet)
router.register(r"enrollments", EnrollmentViewSet)
router.register(r"attendance", AttendanceViewSet)

urlpatterns = router.urls