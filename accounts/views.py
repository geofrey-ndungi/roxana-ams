from rest_framework.views import APIView
from rest_framework.response import Response


class MeView(APIView):
    """Returns basic info about the currently logged-in user."""

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
        })