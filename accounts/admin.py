
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User , Guardian


# below : It puts a small guardians table right on the 
# user's page. It will appear for every user, but 
# you only need to fill it in for students.

class GuardianInline(admin.TabularInline): 
    model = Guardian
    extra = 1


class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ["username", "email", "role", "is_staff", "is_active"]
    fieldsets = UserAdmin.fieldsets + (
        ("Role Info", {"fields": ("role", "phone_number", "photo")}),
        ("Student Info", {"fields": ("admission_number", "gender", "residence", "date_of_birth")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Role Info", {"fields": ("role", "phone_number", "photo")}),
        ("Student Info", {"fields": ("admission_number", "gender", "residence", "date_of_birth")}),
    )
    inlines = [GuardianInline]


admin.site.register(User, CustomUserAdmin)