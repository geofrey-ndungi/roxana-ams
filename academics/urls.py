from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import (AcademicYearViewSet, 
                    SubjectViewSet,
                    TermViewSet,
                    SchoolClassViewSet,
                    EnrollmentViewSet,
                    AttendanceViewSet,
                    MyProfileView,
                    TeacherDashboardView,
                    AdminDashboardView,
)




router = DefaultRouter()
router.register(r"academic-years", AcademicYearViewSet)
router.register(r"subjects", SubjectViewSet)
router.register(r"terms", TermViewSet)
router.register(r"school-classes", SchoolClassViewSet)
router.register(r"enrollments", EnrollmentViewSet)
router.register(r"attendance", AttendanceViewSet)

urlpatterns = router.urls + [
    path("profile/me/", MyProfileView.as_view(), name="my-profile"),
    path("teacher/dashboard/", TeacherDashboardView.as_view(), name="teacher-dashboard"),
    path("admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
]