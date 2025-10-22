from mongoengine import Document, EmbeddedDocument, fields
from datetime import datetime


class Subtopic(EmbeddedDocument):
    title = fields.StringField(required=True, max_length=255)
    video_url = fields.StringField(required=True)
    content = fields.StringField(required=True)
    order = fields.IntField(default=0)
    completed = fields.BooleanField(default=False)


class Module(EmbeddedDocument):
    title = fields.StringField(required=True, max_length=255)
    order = fields.IntField(default=0)
    subtopics = fields.ListField(fields.EmbeddedDocumentField(Subtopic))


class Course(Document):
    CATEGORY_CHOICES = [
        'AI', 'Web Development', 'Mobile Development', 'Data Science',
        'Cloud Computing', 'Cybersecurity', 'DevOps', 'Blockchain',
        'Game Development', 'Other'
    ]
    
    user_id = fields.StringField(required=True)
    title = fields.StringField(required=True, max_length=255)
    description = fields.StringField(required=True)
    thumbnail = fields.StringField(default='')
    category = fields.StringField(required=True, choices=CATEGORY_CHOICES)
    current_module_index = fields.IntField(default=0)
    current_subtopic_index = fields.IntField(default=0)
    modules = fields.ListField(fields.EmbeddedDocumentField(Module))
    created_at = fields.DateTimeField(default=datetime.utcnow)
    updated_at = fields.DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'courses',
        'ordering': ['-created_at'],
        'indexes': ['user_id', '-created_at']
    }
    
    def get_progress_percentage(self):
        total_subtopics = sum(len(module.subtopics) for module in self.modules)
        if total_subtopics == 0:
            return 0
        completed_subtopics = sum(
            sum(1 for subtopic in module.subtopics if subtopic.completed)
            for module in self.modules
        )
        return int((completed_subtopics / total_subtopics) * 100)
