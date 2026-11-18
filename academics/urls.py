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
                    PeriodViewSet, LessonViewSet,
                    TeacherListView, 
                    MyTimetableView,
)
from .examination_views import (
    ExaminationAnalyticsView,
    ExaminationListCreateView,
    ExaminationReleaseView,
    ExaminationResultsView,
    ExaminationSubjectListView,
    ExaminationSubjectMarksView,
    ExaminationSubjectSubmitView,
)




router = DefaultRouter()
router.register(r"academic-years", AcademicYearViewSet)
router.register(r"subjects", SubjectViewSet)
router.register(r"terms", TermViewSet)
router.register(r"school-classes", SchoolClassViewSet)
router.register(r"enrollments", EnrollmentViewSet)
router.register(r"attendance", AttendanceViewSet)
router.register(r"periods", PeriodViewSet)
router.register(r"lessons", LessonViewSet)
urlpatterns = router.urls + [
    path("examinations/", ExaminationListCreateView.as_view(), name="examinations"),
    path(
        "examinations/<int:pk>/release/",
        ExaminationReleaseView.as_view(),
        name="examination-release",
    ),
    path(
        "examination-subjects/",
        ExaminationSubjectListView.as_view(),
        name="examination-subjects",
    ),
    path(
        "examination-subjects/<int:pk>/marks/",
        ExaminationSubjectMarksView.as_view(),
        name="examination-subject-marks",
    ),
    path(
        "examination-subjects/<int:pk>/submit/",
        ExaminationSubjectSubmitView.as_view(),
        name="examination-subject-submit",
    ),
    path(
        "examination-results/",
        ExaminationResultsView.as_view(),
        name="examination-results",
    ),
    path(
        "examination-analytics/",
        ExaminationAnalyticsView.as_view(),
        name="examination-analytics",
    ),
    path("profile/me/", MyProfileView.as_view(), name="my-profile"),
    path("teacher/dashboard/", TeacherDashboardView.as_view(), name="teacher-dashboard"),
    path("admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("teachers/", TeacherListView.as_view(), name="teacher-list"),
    path("timetable/me/", MyTimetableView.as_view(), name="my-timetable"),
]