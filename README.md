# EduMetrics Backend

EduMetrics is a Flask-based student performance and grading backend application. It features user authentication (with distinct roles for students and teachers), student performance metrics tracking, automatic grade and status calculations, and subject management tied to specific student classes.

## 🚀 Features

* **Role-Based Authentication:** Secure user registration and login utilizing Flask sessions and hashed passwords (`werkzeug.security`). Supports separate access scopes for `student` and `teacher` accounts.
* **Student Profile Management:** Allows teachers to add, view, and update student profiles, attendance metrics, and class assignments.
* **Dynamic Grade Tracking:** Automatically calculates GPA averages, letter grades (A, B, C, D, F), and student passing statuses (Pass, At Risk, Fail).
* **Class & Subject Mapping:** Supports complex relational structures connecting specific classes (e.g., 6A, 12B) to predefined or dynamic subjects.
* **Relational Database Backend:** Powered by **PostgreSQL** (configured for Neon Tech) using **Flask-SQLAlchemy** with `joinedload` performance optimizations.

---

## 🛠️ Tech Stack

* **Framework:** Flask
* **Database ORM:** Flask-SQLAlchemy
* **Database Engine:** PostgreSQL
* **Security:** Werkzeug (Password Hashing)

---

## 📋 Prerequisites

Before running the application, ensure you have the following installed:
* Python 3.8+
* pip (Python package manager)

---

## 🔧 Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone [https://github.com/your-username/your-repository-name.git](https://github.com/your-username/your-repository-name.git)
   cd your-repository-name
   # On macOS/Linux
python3 -m venv venv
source venv/bin/activate

# On Windows
python -m venv venv
venv\Scripts\activate
pip install Flask Flask-SQLAlchemy psycopg2-binary werkzeug
python app.py
