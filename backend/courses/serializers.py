from rest_framework import serializers
from .models import Course, Module, Subtopic
class SubtopicSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    video_url = serializers.URLField()
    content = serializers.CharField()
    order = serializers.IntegerField()
    completed = serializers.BooleanField()
class ModuleSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    order = serializers.IntegerField()
    subtopics = SubtopicSerializer(many=True)
class CourseListSerializer(serializers.Serializer):
    id = serializers.CharField(source='pk')
    title = serializers.CharField()
    description = serializers.CharField()
    thumbnail = serializers.URLField()
    category = serializers.CharField()
    progress_percentage = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField()
    def get_progress_percentage(self, obj):
        return obj.get_progress_percentage()
class CourseDetailSerializer(serializers.Serializer):
    id = serializers.CharField(source='pk')
    title = serializers.CharField()
    description = serializers.CharField()
    thumbnail = serializers.URLField()
    category = serializers.CharField()
    current_module_index = serializers.IntegerField()
    current_subtopic_index = serializers.IntegerField()
    modules = ModuleSerializer(many=True)
    progress_percentage = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    def get_progress_percentage(self, obj):
        return obj.get_progress_percentage()
class CourseCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField()
    category = serializers.ChoiceField(choices=Course.CATEGORY_CHOICES)
    thumbnail = serializers.URLField(required=False, allow_blank=True)