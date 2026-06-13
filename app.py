import os
import functools
from flask import Flask, jsonify, request, send_from_directory, session
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import joinedload
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder='.')

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://neondb_owner:npg_n3W1VNgsUtzu@ep-snowy-moon-aog0lcwb-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'edumetrics-secret-2025-change-in-production'

db = SQLAlchemy(app)

DEFAULT_SUBJECTS = ['Mathematics', 'Science', 'English', 'History', 'Geography', 'Art']
DEFAULT_CLASSES = ['6A','6B','7A','7B','8A','8B','9A','9B','10A','10B','11A','11B','12A','12B']
SUBJECT_ALIAS = {
    'Mathematics':'math', 'Math':'math',
    'Science':'sci', 'English':'eng', 'History':'his', 'Geography':'geo', 'Art':'art'
}
LEGACY_SCORE_KEYS = {
    'math':'Mathematics', 'sci':'Science', 'eng':'English',
    'his':'History', 'geo':'Geography', 'art':'Art'
}

# ══════════════════════════════════════════════
#  MODELS
# ══════════════════════════════════════════════
class User(db.Model):
    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(100), nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role          = db.Column(db.String(20), nullable=False)
    student_class = db.Column(db.String(10))

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'email': self.email,
                'role': self.role, 'class': self.student_class}


class Subject(db.Model):
    id   = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)


class ClassSubject(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    class_name = db.Column(db.String(10), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    subject    = db.relationship('Subject', lazy='joined')
    __table_args__ = (db.UniqueConstraint('class_name', 'subject_id', name='uq_class_subject'),)


class Student(db.Model):
    id            = db.Column(db.Integer, primary_key=True)
    student_id    = db.Column(db.String(20), unique=True, nullable=False)
    name          = db.Column(db.String(100), nullable=False)
    student_class = db.Column(db.String(10), nullable=False)
    attendance    = db.Column(db.Integer, default=100)
    scores        = db.relationship('StudentScore', back_populates='student', cascade='all, delete-orphan', lazy='joined')

    def to_dict(self):
        score_rows = []
        mapped = {}
        for sc in self.scores:
            subject_name = sc.class_subject.subject.name
            score_rows.append({
                'subject': subject_name,
                'score': sc.score
            })
            alias = SUBJECT_ALIAS.get(subject_name)
            if alias:
                mapped[alias] = sc.score

        avg = compute_average(self.scores)
        return {
            'id': self.student_id,
            'name': self.name,
            'class': self.student_class,
            'scores': score_rows,
            'avg': avg,
            'grade': calc_grade(avg),
            'status': calc_status(avg),
            'attendance': self.attendance,
            **mapped
        }


class StudentScore(db.Model):
    id               = db.Column(db.Integer, primary_key=True)
    student_id       = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    class_subject_id = db.Column(db.Integer, db.ForeignKey('class_subject.id'), nullable=False)
    score            = db.Column(db.Integer, default=0)
    student          = db.relationship('Student', back_populates='scores')
    class_subject    = db.relationship('ClassSubject', lazy='joined')
    __table_args__ = (db.UniqueConstraint('student_id', 'class_subject_id', name='uq_student_class_subject'),)


# ══════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════

def normalize_subject_name(name):
    return (name or '').strip().title()


def compute_average(scores):
    if not scores:
        return 0
    return round(sum(sc.score for sc in scores) / len(scores))


def parse_scores(data):
    if not isinstance(data, dict):
        return []

    score_map = {}
    if isinstance(data.get('scores'), list):
        for item in data['scores']:
            if not isinstance(item, dict):
                continue
            subject = normalize_subject_name(item.get('subject'))
            try:
                score = int(item.get('score', 0))
            except (TypeError, ValueError):
                continue
            if subject:
                score_map[subject] = max(0, min(100, score))

    for key, subject_name in LEGACY_SCORE_KEYS.items():
        if key in data:
            try:
                score = int(data.get(key, 0))
            except (TypeError, ValueError):
                score = 0
            score_map[subject_name] = max(0, min(100, score))

    return [(name, score) for name, score in score_map.items()]


def get_or_create_subject(name):
    name = normalize_subject_name(name)
    if not name:
        return None
    subject = Subject.query.filter_by(name=name).first()
    if subject:
        return subject
    subject = Subject(name=name)
    db.session.add(subject)
    db.session.flush()
    return subject


def get_or_create_class_subject(class_name, subject_name):
    class_name = (class_name or '').strip()
    subject = get_or_create_subject(subject_name)
    if not class_name or not subject:
        return None
    class_subject = ClassSubject.query.filter_by(class_name=class_name, subject_id=subject.id).first()
    if class_subject:
        return class_subject
    class_subject = ClassSubject(class_name=class_name, subject=subject)
    db.session.add(class_subject)
    db.session.flush()
    return class_subject


def ensure_class_subjects(class_name):
    class_name = (class_name or '').strip()
    if not class_name:
        return []

    existing = ClassSubject.query.filter_by(class_name=class_name).all()
    if not existing:
        for subject_name in DEFAULT_SUBJECTS:
            get_or_create_class_subject(class_name, subject_name)
        db.session.commit()
        existing = ClassSubject.query.filter_by(class_name=class_name).all()
    return existing


def ensure_all_default_class_subjects():
    if ClassSubject.query.count() > 0:
        return
    for class_name in DEFAULT_CLASSES:
        for subject_name in DEFAULT_SUBJECTS:
            get_or_create_class_subject(class_name, subject_name)
    db.session.commit()


def calc_grade(avg):
    if avg >= 90: return 'A'
    if avg >= 75: return 'B'
    if avg >= 60: return 'C'
    if avg >= 45: return 'D'
    return 'F'

def calc_status(avg):
    if avg >= 60: return 'Pass'
    if avg >= 45: return 'At Risk'
    return 'Fail'

def login_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required. Please log in.'}), 401
        return f(*args, **kwargs)
    return decorated

with app.app_context():
    db.drop_all()
    db.create_all()
    ensure_all_default_class_subjects()

# ══════════════════════════════════════════════
#  STATIC ROUTES
# ══════════════════════════════════════════════
@app.route('/')
def serve_home():
    return send_from_directory('.', 'home.html')

@app.route('/dashboard')
def serve_dashboard():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# ══════════════════════════════════════════════
#  AUTH ROUTES
# ══════════════════════════════════════════════
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    name          = data.get('name', '').strip()
    email         = data.get('email', '').strip().lower()
    password      = data.get('password', '')
    role          = data.get('role', 'student')
    student_class = data.get('class', '')

    if not name or not email or not password:
        return jsonify({'error': 'Name, email and password are required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    if role not in ('student', 'teacher'):
        return jsonify({'error': 'Role must be student or teacher'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email already exists'}), 409

    user = User(
        name=name, email=email,
        password_hash=generate_password_hash(password),
        role=role,
        student_class=student_class if role == 'student' else None
    )
    db.session.add(user)
    db.session.commit()
    session['user_id'] = user.id
    return jsonify({'user': user.to_dict(), 'message': 'Account created successfully'}), 201


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role     = data.get('role', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid email or password'}), 401
    if role and user.role != role:
        return jsonify({'error': f'This account is registered as a {user.role}, not {role}'}), 403

    session['user_id'] = user.id
    return jsonify({'user': user.to_dict(), 'message': 'Login successful'})


@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out'})


@app.route('/api/me', methods=['GET'])
def me():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    user = db.session.get(User, session['user_id'])
    if not user:
        session.pop('user_id', None)
        return jsonify({'error': 'User not found'}), 401
    return jsonify({'user': user.to_dict()})

# ══════════════════════════════════════════════
#  STUDENT ROUTES  (login required)
# ══════════════════════════════════════════════
@app.route('/api/students', methods=['GET'])
@login_required
def get_students():
    return jsonify([s.to_dict() for s in Student.query.all()])


@app.route('/api/stats', methods=['GET'])
def get_stats():
    students = Student.query.all()
    total_students = len(students)
    pass_count = sum(1 for s in students if s.to_dict().get('status') == 'Pass')
    pass_rate = round((pass_count / total_students) * 100) if total_students else 0
    subject_count = Subject.query.count()
    return jsonify({
        'students_tracked': total_students,
        'pass_rate': pass_rate,
        'subjects': subject_count
    })


@app.route('/api/students', methods=['POST'])
@login_required
def add_student():
    user = db.session.get(User, session['user_id'])
    if user.role != 'teacher':
        return jsonify({'error': 'Only teachers can add students'}), 403

    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    student_class = (data.get('class') or '').strip()
    if not name or not student_class:
        return jsonify({'error': 'Student name and class are required'}), 400

    count = Student.query.count()
    new_id = f"STU-{str(count + 1).zfill(3)}"

    student = Student(
        student_id=new_id,
        name=name,
        student_class=student_class,
        attendance=int(data.get('attendance', 90))
    )
    db.session.add(student)
    db.session.flush()

    ensure_class_subjects(student_class)
    score_rows = parse_scores(data)
    score_map = {subject: score for subject, score in score_rows}

    class_subjects = ClassSubject.query.filter_by(class_name=student_class).all()
    for class_subject in class_subjects:
        score = score_map.get(class_subject.subject.name, 0)
        student.scores.append(StudentScore(student=student, class_subject=class_subject, score=score))

    db.session.commit()
    return jsonify(student.to_dict()), 201


@app.route('/api/students/<sid>', methods=['GET'])
@login_required
def get_student(sid):
    student = Student.query.filter_by(student_id=sid).first()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    return jsonify(student.to_dict())


@app.route('/api/students/<sid>', methods=['PUT'])
@login_required
def update_student(sid):
    user = db.session.get(User, session['user_id'])
    if user.role != 'teacher':
        return jsonify({'error': 'Only teachers can update grades'}), 403

    student = Student.query.filter_by(student_id=sid).first()
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    data = request.get_json(silent=True) or {}
    if 'attendance' in data:
        try:
            student.attendance = int(data['attendance'])
        except (TypeError, ValueError):
            student.attendance = student.attendance

    score_rows = parse_scores(data)
    if score_rows:
        ensure_class_subjects(student.student_class)
        existing_scores = {sc.class_subject.subject.name: sc for sc in student.scores}

        for subject_name, score in score_rows:
            class_subject = get_or_create_class_subject(student.student_class, subject_name)
            if not class_subject:
                continue
            if subject_name in existing_scores:
                existing_scores[subject_name].score = score
            else:
                student.scores.append(StudentScore(student=student, class_subject=class_subject, score=score))

    db.session.commit()
    return jsonify(student.to_dict())


if __name__ == '__main__':
    app.run(debug=True, port=5000)
