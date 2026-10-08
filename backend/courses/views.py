import copy
import logging
from concurrent.futures import ThreadPoolExecutor

from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from mongoengine.errors import DoesNotExist

from .models import Course, Module, Subtopic
from .serializers import (
    CourseListSerializer,
    CourseDetailSerializer,
    CourseCreateSerializer,
    SubtopicSerializer
)
from utils.gemini_service import AIQuotaExceeded, gemini_service
from utils.throttling import GenerateGlobalThrottle, GenerateIPThrottle
from utils.youtube_service import youtube_service

logger = logging.getLogger(__name__)

VIDEO_LOOKUP_WORKERS = 8


def resolve_videos(course_data):
    """Resolve every 'search:<term>' video_url in place, one lookup per distinct term, concurrently."""
    terms = {
        sub['video_url'][len('search:'):].strip()
        for module in course_data['modules'] for sub in module['subtopics']
        if sub['video_url'].startswith('search:')
    }
    if not terms:
        return
    with ThreadPoolExecutor(max_workers=VIDEO_LOOKUP_WORKERS) as pool:
        resolved = dict(zip(terms, pool.map(youtube_service.search_video, terms)))
    for module in course_data['modules']:
        for sub in module['subtopics']:
            if sub['video_url'].startswith('search:'):
                sub['video_url'] = resolved[sub['video_url'][len('search:'):].strip()]


def get_demo_user_id(request):
    """
    Returns a unique demo ID from request headers.
    Each visitor (frontend browser) has its own random ID stored locally.
    """
    demo_id = request.headers.get("X-Demo-User")
    return demo_id or "anonymous"


class CourseListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        demo_id = get_demo_user_id(request)
        courses = Course.objects(user_id=demo_id)
        serializer = CourseListSerializer(courses, many=True)
        return Response(serializer.data)


class CourseDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        demo_id = get_demo_user_id(request)
        try:
            course = Course.objects.get(pk=pk, user_id=demo_id)
            serializer = CourseDetailSerializer(course)
            return Response(serializer.data)
        except DoesNotExist:
            return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        demo_id = get_demo_user_id(request)
        try:
            course = Course.objects.get(pk=pk, user_id=demo_id)
            course.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except DoesNotExist:
            return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)


class CourseCreateView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [GenerateIPThrottle, GenerateGlobalThrottle]  # protects Gemini/YouTube free-tier quotas

    def post(self, request):
        demo_id = get_demo_user_id(request)
        serializer = CourseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        title = serializer.validated_data['title']
        description = serializer.validated_data['description']
        category = serializer.validated_data['category']
        thumbnail = serializer.validated_data.get('thumbnail', '')

        try:
            course_data = copy.deepcopy(gemini_service.generate_course(title, description, category))
            resolve_videos(course_data)
            modules = []

            for module_index, module_data in enumerate(course_data['modules']):
                subtopics = []
                for subtopic_index, subtopic_data in enumerate(module_data['subtopics']):
                    subtopic = Subtopic(
                        title=subtopic_data['title'],
                        video_url=subtopic_data['video_url'],
                        content=subtopic_data['content'],
                        order=subtopic_index,
                        completed=False
                    )
                    subtopics.append(subtopic)

                module = Module(
                    title=module_data['title'],
                    order=module_index,
                    subtopics=subtopics
                )
                modules.append(module)

            course = Course(
                user_id=demo_id,  # each browser/session is isolated
                title=title,
                description=description,
                category=category,
                thumbnail=thumbnail,
                modules=modules
            )
            course.save()

            return Response(
                CourseDetailSerializer(course).data,
                status=status.HTTP_201_CREATED
            )

        except AIQuotaExceeded:
            logger.warning("Course generation refused: all Gemini models are over their daily quota")
            return Response(
                {'error': 'The daily AI generation limit has been reached. Please try again later.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception:
            logger.exception("Course generation failed")
            return Response(
                {'error': 'Failed to generate course. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SubtopicToggleView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, course_id, module_index, subtopic_index):
        demo_id = get_demo_user_id(request)
        try:
            course = Course.objects.get(pk=course_id, user_id=demo_id)
            module_idx = int(module_index)
            subtopic_idx = int(subtopic_index)

            if module_idx < len(course.modules) and subtopic_idx < len(course.modules[module_idx].subtopics):
                subtopic = course.modules[module_idx].subtopics[subtopic_idx]
                subtopic.completed = not subtopic.completed
                course.save()
                return Response(SubtopicSerializer(subtopic).data, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Invalid indices'}, status=status.HTTP_400_BAD_REQUEST)

        except DoesNotExist:
            return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)


class CourseProgressView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk):
        demo_id = get_demo_user_id(request)
        try:
            course = Course.objects.get(pk=pk, user_id=demo_id)
            module_index = request.data.get('module_index')
            subtopic_index = request.data.get('subtopic_index')

            if module_index is not None:
                course.current_module_index = module_index
            if subtopic_index is not None:
                course.current_subtopic_index = subtopic_index

            course.save()
            return Response(CourseDetailSerializer(course).data, status=status.HTTP_200_OK)

        except DoesNotExist:
            return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)
