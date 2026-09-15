from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    '''
    Any who is authenticated can view GET. 
    only users whose role="ADMIN"  can create/update/delete
    '''

    def has_permission(self, request, view):

        if request.method in permissions.SAFE_METHODS:  # if the request method is in the SAFE_METHODS - are read only methods: (GET, HEAD , OPTIONS)

            return True
        
        return request.user.is_authenticated and request.user.role == "ADMIN"  # if the request is anything else, we check if the user is authenticated AND the user = "ADMIN"