from rest_framework.routers import DefaultRouter
from .views import AcademicYearViewSet

router = DefaultRouter()
router.register(r"academic-years", AcademicYearViewSet)

urlpatterns = router.urls