from django.urls import path

from .views import (
    CourseListView,
    CourseDetailView,
    CourseCreateView,
    SubtopicToggleView,
    CourseProgressView
)

urlpatterns = [
    path('', CourseListView.as_view(), name='course-list'),
    path('create/', CourseCreateView.as_view(), name='course-create'),
    path('<str:pk>/', CourseDetailView.as_view(), name='course-detail'),
    path('<str:pk>/progress/', CourseProgressView.as_view(), name='course-progress'),
    path('<str:course_id>/module/<int:module_index>/subtopic/<int:subtopic_index>/toggle/', 
         SubtopicToggleView.as_view(), name='subtopic-toggle'),
]

