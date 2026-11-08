# Roxana AMS

**Academic Management System**

A centralized platform for managing academic activities, student information, attendance, timetables, and user accounts.

Roxana AMS is a full-stack web application built with **Django** and **React**, designed to simplify academic administration through an organized, accessible, and user-friendly interface.

<div align="center">

[![Django](https://img.shields.io/badge/Django-Backend-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-Frontend-20232A?logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-Build_Tool-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)

</div>

> **Project Status:** Active Development  
> Roxana AMS is a personal project under active development, with the intention of supporting real-world academic management. Review the [Production Readiness](#production-readiness) section before deploying the application with real user data.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Repository Setup](#1-clone-the-repository)
  - [Backend Setup](#2-configure-the-backend)
  - [Frontend Setup](#3-configure-the-frontend)
- [Environment Configuration](#environment-configuration)
- [Production Readiness](#production-readiness)
- [Development Commands](#development-commands)
- [License](#license)

---

## Overview

Roxana AMS is a web-based Academic Management System developed to centralize and streamline academic administration.

The application follows a full-stack architecture, combining a **Django REST Framework backend** with a **React single-page frontend**. The backend handles application logic, authentication, data management, and API communication, while the frontend provides an interactive interface for accessing the system's functionality.

The project is organized into dedicated Django applications, including `accounts` and `academics`, allowing different areas of the system to be maintained independently.

The current frontend provides authentication and protected application routes for the dashboard, subjects, attendance, student profiles, personal attendance, and timetables.

## Features

Roxana AMS currently includes the following application modules:

| Module | Description |
|---|---|
| Authentication | JWT-based authentication and protected application routes. |
| Dashboard | Role-aware dashboard and application overview. |
| Subject Management | Access to academic subjects and related information. |
| Attendance Management | Attendance tracking and attendance-related views. |
| Student Profiles | Dedicated student profile interface. |
| Personal Attendance | Individual attendance records and views. |
| Timetable Management | Access to academic timetables and schedules. |

**Note:** Feature availability and access permissions depend on the backend implementation and the roles assigned to individual users.

## Technology Stack

The application is built using the following technologies:

| Category | Technology | Purpose |
|---|---|---|
| Backend | Django | Server-side application framework. |
| API | Django REST Framework | RESTful API development. |
| Authentication | Simple JWT | Token-based authentication. |
| Frontend | React | User interface development. |
| Build Tool | Vite | Frontend development and production builds. |
| Routing | React Router | Client-side navigation. |
| Database | MySQL | Relational data storage. |
| CORS | django-cors-headers | Cross-origin resource sharing configuration. |

## Project Structure

The repository follows a modular structure that separates backend functionality from frontend development.

```text
roxana-ams/
│
├── accounts/                 # User and account management
│
├── academics/                # Academic models, APIs, and permissions
│
├── config/                   # Django project configuration
│
├── frontend/                 # React and Vite application
│   └── src/
│       ├── api/              # API integration
│       ├── components/       # Reusable UI components
│       ├── pages/            # Application pages
│       └── utils/            # Utility functions
│
├── manage.py                 # Django management utility
│
└── README.md                 # Project documentation
```

## Getting Started

Follow the instructions below to set up Roxana AMS in your local development environment.

### Prerequisites

Ensure the following tools and technologies are installed:

- **Python** – Backend development.
- **Node.js and npm** – Frontend development and dependency management.
- **MySQL** – Database management.
- **Git** – Version control.

### 1. Clone the Repository

Clone the project from GitHub:

```bash
git clone https://github.com/geofrey-ndungi/roxana-ams.git

cd roxana-ams
```

### 2. Configure the Backend

**Create a virtual environment**

From the project root directory, execute:

```bash
python -m venv .venv
```

Activate the virtual environment.

**Linux / macOS**

```bash
source .venv/bin/activate
```

**Windows PowerShell**

```powershell
.venv\Scripts\Activate.ps1
```

**Install backend dependencies**

Install the required Python packages:

```bash
pip install django djangorestframework djangorestframework-simplejwt python-decouple django-cors-headers mysqlclient
```

**Configure the database**

Create a MySQL database for the application. For the default local configuration, you can use:

```sql
CREATE DATABASE roxana_ams;
```

Create a `.env` file in the project root and configure your database credentials and Django settings as described in the [Environment Configuration](#environment-configuration) section.

**Apply database migrations**

Run the following commands to prepare the database:

```bash
python manage.py migrate
```

**Start the backend server**

```bash
python manage.py runserver
```

The Django development server will be available at:

```text
http://127.0.0.1:8000
```

### 3. Configure the Frontend

Open a separate terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install the frontend dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Vite will display the frontend development URL in the terminal after the server starts.

**CORS Configuration**

The current Django CORS configuration allows local frontend development origins on ports `5173` and `5174`.

Ensure the frontend origin matches the configured backend CORS settings.

---

## Environment Configuration

Roxana AMS uses environment variables to manage sensitive application settings and database configuration.

Create a `.env` file in the project root with the following variables:

| Variable | Description | Example |
|---|---|---|
| `SECRET_KEY` | Django application secret key | `your-secret-key` |
| `DEBUG` | Enables or disables debug mode | `True` |
| `DB_NAME` | MySQL database name | `roxana_ams` |
| `DB_USER` | MySQL database username | `your_mysql_user` |
| `DB_PASSWORD` | MySQL database password | `your_mysql_password` |
| `DB_HOST` | MySQL database host | `localhost` |
| `DB_PORT` | MySQL database port | `3306` |

**Example `.env` configuration:**

```env
SECRET_KEY=replace-with-a-local-development-secret
DEBUG=True

DB_NAME=roxana_ams
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
DB_PORT=3306
```

**Security Considerations**

- Never commit `.env` files or sensitive credentials to version control.
- Ensure `.env` is included in `.gitignore`.
- Use strong, randomly generated secret keys.
- Maintain separate environment configurations for development and production.
- Never enable Django debug mode in a production environment.

---

## Production Readiness

Roxana AMS is under active development and requires additional security, testing, and deployment configuration before being used with real academic and student data.

The following checklist outlines important areas that should be addressed before production deployment.

### Security and Configuration

- [ ] Ensure `DEBUG` is controlled by environment variables. The current settings include a later hard-coded `DEBUG = True`, which overrides the environment value. Correct this and verify that production runs with debugging disabled.
- [ ] Configure `ALLOWED_HOSTS` with the appropriate production domain.
- [ ] Securely manage Django secret keys and database credentials.
- [ ] Configure HTTPS and appropriate secure token, cookie, and transport settings.
- [ ] Restrict CORS to trusted production frontend origins.
- [ ] Review authentication and authorization across all API endpoints.
- [ ] Ensure users can only access information permitted by their assigned roles.

### Infrastructure and Data Management

- [ ] Configure secure storage and serving of uploaded media and static assets.
- [ ] Implement automated database backups.
- [ ] Test database restoration procedures.
- [ ] Configure application monitoring and error logging.
- [ ] Establish an incident response and recovery process.

### Testing and Reliability

- [ ] Test database migrations in a production-like environment.
- [ ] Implement automated tests for authentication and authorization.
- [ ] Test critical academic management workflows.
- [ ] Verify frontend and backend integration.
- [ ] Conduct security and permission testing before deployment.

**Important:** Frontend route protection is intended to improve navigation and user experience. It does not replace backend authorization. All sensitive operations and data access must be validated on the server.

The application should not be considered production-ready until its security, privacy, backup, and operational requirements have been properly implemented and verified.

---

## Development Commands

### Frontend

The following npm scripts are available from the `frontend/` directory:

| Command | Description |
|---|---|
| `npm run dev` | Starts the Vite development server. |
| `npm run build` | Generates the production frontend build. |
| `npm run preview` | Previews the production build locally. |
| `npm run lint` | Runs ESLint to identify code quality issues. |

### Backend

Django management commands should be executed from the project root with the Python virtual environment activated.

**Apply migrations:**

```bash
python manage.py migrate
```

**Create new migrations:**

```bash
python manage.py makemigrations
```

**Start the development server:**

```bash
python manage.py runserver
```

---

## License

No license has currently been specified for this project.

Until a license is added, all rights are reserved by the copyright holder. Permission to use, modify, or distribute this software should not be assumed.

---

**Roxana AMS**  
*Centralizing academic management through technology.*