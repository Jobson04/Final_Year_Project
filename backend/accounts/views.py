from rest_framework.authtoken.models import Token
from django.contrib.auth import login
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import LoginSerializer


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        request.session.flush()
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        login(request, user)
        token, _ = Token.objects.get_or_create(user=user)
        role = "admin" if user.is_staff else "lecturer" if getattr(user, "lecturer_profile", None) else "student"
        return Response(
            {
                "token": token.key,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "is_staff": user.is_staff,
                    "role": role,
                    "student_id": getattr(getattr(user, "student_profile", None), "id", None),
                    "lecturer_id": getattr(getattr(user, "lecturer_profile", None), "id", None),
                },
            }
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.user.auth_token.delete()
        request.session.flush()
        return Response({"detail": "Logged out successfully."})

