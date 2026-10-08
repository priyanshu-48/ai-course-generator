import json
import re
import hashlib
import google.generativeai as genai
from django.conf import settings
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)
GEMINI_CACHE_TTL = 60 * 60 * 24 * 7  # 7 days

class GeminiService:
    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set in environment variables")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')

    @staticmethod
    def normalize_text(text: str) -> str:
        """
        Normalize input text to reduce cache key fragmentation.
        Lowercase, trim spaces, collapse multiple spaces, and remove punctuation.
        """
        text = text.lower().strip()
        text = re.sub(r'\s+', ' ', text)          
        text = re.sub(r'[^\w\s]', '', text)       
        return text

    def generate_course(self, title, description, category):
        """
        Generates or retrieves a cached course structure.
        Cache key is a normalized hash of title + description + category.
        """
        normalized_title = self.normalize_text(title)
        normalized_description = self.normalize_text(description)
        normalized_category = self.normalize_text(category)

        cache_key_raw = f"{normalized_title}:{normalized_description}:{normalized_category}"
        cache_key = "gemini:" + hashlib.sha256(cache_key_raw.encode()).hexdigest()

        try:
            cached_data = cache.get(cache_key)
        except Exception as e:  # Redis down must not break generation
            logger.warning(f"Gemini cache get failed: {e}")
            cached_data = None
        if cached_data:
            logger.info(f"Gemini cache hit: {cache_key}")
            return cached_data

        course_data = self._generate_gemini_course(title, description, category)

        try:
            cache.set(cache_key, course_data, timeout=GEMINI_CACHE_TTL)
        except Exception as e:
            logger.warning(f"Gemini cache set failed: {e}")

        return course_data

    def _generate_gemini_course(self, title, description, category):
        prompt = self._build_course_prompt(title, description, category)
        try:
            response = self.model.generate_content(prompt)
            return self._parse_response(response.text)
        except Exception as e:
            raise Exception(f"Failed to generate course: {str(e)}")

    def _build_course_prompt(self, title, description, category):
        prompt = f"""
You are an expert curriculum designer. Generate a comprehensive, structured course roadmap for the following course:

**Title:** {title}
**Category:** {category}
**Description:** {description}

Please create a detailed course with:
- 6-8 modules (main topics)
- Each module should have 3-5 subtopics (lessons)
- Each subtopic must include:
  1. A video_url: Instead of providing YouTube URLs, provide a descriptive search term like "python basics tutorial" or "introduction to machine learning". Format: "search:descriptive search term"
  2. A 2-3 paragraph explanation of the topic (informative and beginner-friendly)

**IMPORTANT:** Return ONLY valid JSON in this exact format, with no additional text before or after:

{{
  "modules": [
    {{
      "title": "Module Title",
      "subtopics": [
        {{
          "title": "Subtopic Title",
          "video_url": "search:python tutorial for beginners",
          "content": "Detailed explanation in 2-3 paragraphs..."
        }}
      ]
    }}
  ]
}}

**CRITICAL INSTRUCTIONS**:
1. For video_url, use the format "search:your search term here" - DO NOT use actual YouTube URLs or placeholders like EXAMPLE
2. Ensure all text content uses proper escaping for JSON (use \\n for newlines, escape quotes with \\")
3. Keep content text clean and readable - avoid special characters that break JSON
4. Generate educational, high-quality content suitable for learners
"""
        return prompt

    def _parse_response(self, response_text):
        try:
            cleaned_text = response_text.strip()
            if cleaned_text.startswith('```'):
                json_match = re.search(r'```(?:json)?\s*(\{.*\})\s*```', cleaned_text, re.DOTALL)
                if json_match:
                    cleaned_text = json_match.group(1)
                else:
                    lines = cleaned_text.split('\n')
                    if lines[0].startswith('```'):
                        lines = lines[1:]
                    if lines[-1].startswith('```'):
                        lines = lines[:-1]
                    cleaned_text = '\n'.join(lines)

            cleaned_text = cleaned_text.replace('\r', '')
            cleaned_text = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]', '', cleaned_text)
            course_data = json.loads(cleaned_text, strict=False)

            if 'modules' not in course_data:
                raise ValueError("Response missing 'modules' key")

            for module in course_data['modules']:
                if 'title' not in module or 'subtopics' not in module:
                    raise ValueError("Module missing required fields")
                for subtopic in module['subtopics']:
                    if not all(key in subtopic for key in ['title', 'video_url', 'content']):
                        raise ValueError("Subtopic missing required fields")

            return course_data
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse JSON from Gemini response: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error processing Gemini response: {str(e)}")


gemini_service = GeminiService()
