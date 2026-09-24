from rest_framework import permissions
from academics.models import Enrollment


class IsAdminOrReadOnly(permissions.BasePermission):
    '''
    Any who is authenticated can view GET. 
    only users whose role="ADMIN"  can create/update/delete
    '''

    def has_permission(self, request, view):

        if request.method in permissions.SAFE_METHODS:  # if the request method is in the SAFE_METHODS - are read only methods: (GET, HEAD , OPTIONS)

            return True
        
        return request.user.is_authenticated and request.user.role == "ADMIN"  # if the request is anything else, we check if the user is authenticated AND the user = "ADMIN"




class IsClassTeacherOrAdmin(permissions.BasePermission):
    """
    Anyone authenticated can view (GET).
    ADMIN can always write.
    A TEACHER can only write attendance for students in a class
    where they are the assigned class_teacher.
    """

def has_permission(self, request, view):
    if request.method in permissions.SAFE_METHODS:
        return True

    if not request.user.is_authenticated:
        return False

    if request.user.role == "ADMIN":
        return True

    if request.method == "POST" and request.user.role == "TEACHER":
        enrollment_id = request.data.get("enrollment")
        if not enrollment_id:
            return False
        try:
            enrollment = Enrollment.objects.get(id=enrollment_id)
        except Enrollment.DoesNotExist:
            return False
        return enrollment.school_class.class_teacher == request.user

    # For PUT/PATCH/DELETE on an existing object, defer to has_object_permission
    return True

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        if request.user.role == "ADMIN":
            return True

        if request.user.role == "TEACHER":
            return obj.enrollment.school_class.class_teacher == request.user

        return False